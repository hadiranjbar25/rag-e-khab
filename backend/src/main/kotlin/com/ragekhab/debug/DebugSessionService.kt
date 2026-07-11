package com.ragekhab.debug

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.TextNode
import com.ragekhab.artifact.CompressionInput
import com.ragekhab.artifact.ContextCompressor
import com.ragekhab.memory.AgentMemory
import com.ragekhab.memory.MemoryService
import com.ragekhab.memory.MemoryType
import com.ragekhab.memory.RememberRequest
import com.ragekhab.document.ArtifactKind
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

@Service
class DebugSessionService(
    private val store: DebugSessionStore,
    private val mapper: ObjectMapper,
    private val memoryService: MemoryService,
    private val compressors: List<ContextCompressor>,
) {
    fun create(title: String): DebugSession {
        val now = Instant.now()
        val session = store.saveSession(
            DebugSession(
                id = UUID.randomUUID(),
                title = title.trim().ifBlank { "Debug session" },
                status = DebugSessionStatus.active,
                createdAt = now,
                updatedAt = now,
            ),
        )
        audit(session.id, "session_created", session.title)
        return session
    }

    fun list(includeArchived: Boolean = false): List<DebugSession> =
        store.listSessions().filter { includeArchived || it.status == DebugSessionStatus.active }

    fun builtInProfiles(): List<SanitizationProfile> = builtInSanitizationProfiles

    fun detail(sessionId: UUID): DebugSessionDetail {
        val session = requireSession(sessionId)
        return DebugSessionDetail(
            session = session,
            tokenMappings = store.mappingsFor(sessionId),
            artifacts = store.artifactsFor(sessionId),
            dataRequests = store.dataRequestsFor(sessionId),
            notes = store.notesFor(sessionId),
            auditEvents = store.auditEventsFor(sessionId),
            memorySuggestions = memorySuggestions(sessionId),
        )
    }

    fun archive(sessionId: UUID): DebugSession {
        val session = requireSession(sessionId)
        val updated = store.saveSession(session.copy(status = DebugSessionStatus.archived, updatedAt = Instant.now()))
        audit(sessionId, "session_archived", session.title)
        return updated
    }

    fun sanitize(sessionId: UUID, request: SanitizeDebugRequest): SanitizeDebugResponse {
        requireSession(sessionId)
        val warnings = WarningCollector()
        val profile = effectiveProfile(request)
        val context = SanitizeContext(sessionId, request.sourceName.trim().ifBlank { "custom" }, request.mode, warnings, profile)
        val sanitized = when (request.inputType) {
            DebugInputType.csv -> sanitizeCsv(request.rawText, context)
            DebugInputType.json -> sanitizeJson(request.rawText, context)
            DebugInputType.log -> sanitizeLog(request.rawText, context)
        }
        val now = Instant.now()
        val compressed = compressSanitizedArtifact(context.sourceName, request.inputType, sanitized)
        val artifact = store.saveArtifact(
            DebugArtifact(
                id = UUID.randomUUID(),
                sessionId = sessionId,
                inputType = request.inputType,
                sourceName = context.sourceName,
                sanitizedText = sanitized,
                compactText = compressed.text,
                rawTokenEstimate = compressed.metrics.rawTokenEstimate,
                compressedTokenEstimate = compressed.metrics.compressedTokenEstimate,
                reductionPercent = compressed.metrics.reductionPercent,
                profileName = profile.name,
                publishable = context.publishable,
                summary = context.summary(),
                audit = context.audit.take(MAX_SANITIZATION_AUDIT_ENTRIES),
                warningSummary = warnings.toList(),
                dataRequestId = request.dataRequestId,
                createdAt = now,
            ),
        )
        if (request.dataRequestId != null) completeDataRequest(sessionId, request.dataRequestId)
        val session = touch(sessionId)
        audit(sessionId, "data_sanitized", "${request.inputType} ${context.sourceName}")
        return SanitizeDebugResponse(
            session = session,
            sanitizedText = sanitized,
            artifact = artifact,
            warnings = warnings.toList(),
            tokenMappings = store.mappingsFor(sessionId),
        )
    }

    fun resolveToken(sessionId: UUID, token: String): DebugTokenMapping {
        val mapping = findMapping(sessionId, token)
        audit(sessionId, "token_resolved", mapping.token)
        return mapping
    }

    fun resolveTokenForMcp(sessionId: UUID, token: String): DebugTokenMapping {
        val mapping = findMapping(sessionId, token)
        val allowedEntity = mapping.entityType in setOf("USER", "ORDER", "PAYMENT") || mapping.column.equals("id", ignoreCase = true) || mapping.column.endsWith("_id", ignoreCase = true)
        require(allowedEntity) { "MCP token resolution is limited to database identifiers. Resolve PII tokens in the local UI only." }
        audit(sessionId, "token_resolved", mapping.token)
        return mapping
    }

    private fun findMapping(sessionId: UUID, token: String): DebugTokenMapping {
        requireSession(sessionId)
        return store.mappingsFor(sessionId).firstOrNull { it.token.equals(token.trim(), ignoreCase = true) }
            ?: error("Token not found in this debug session.")
    }

    private fun requireDataRequest(sessionId: UUID, requestId: UUID): DebugDataRequest {
        val request = store.getDataRequest(requestId) ?: error("Debug data request not found.")
        require(request.sessionId == sessionId) { "Debug data request does not belong to this session." }
        return request
    }

    private fun safeDataRequest(request: DebugDataRequest): DebugSafeDataRequest =
        DebugSafeDataRequest(
            id = request.id,
            sessionId = request.sessionId,
            status = request.status,
            entity = request.entity,
            relation = request.relation,
            parentToken = request.parentToken,
            reason = request.reason,
            requestedFields = request.requestedFields,
            createdAt = request.createdAt,
            completedAt = request.completedAt,
        )

    fun recordAgentRequest(sessionId: UUID, request: String): DebugNote {
        requireSession(sessionId)
        val note = store.saveNote(
            DebugNote(
                id = UUID.randomUUID(),
                sessionId = sessionId,
                request = request.trim(),
                createdAt = Instant.now(),
            ),
        )
        touch(sessionId)
        audit(sessionId, "agent_request_recorded", note.request.take(120))
        return note
    }

    fun createDataRequest(sessionId: UUID, request: CreateDebugDataRequest): DebugDataRequestCreated {
        requireSession(sessionId)
        val parentToken = request.parentToken?.trim()?.takeIf { it.isNotBlank() }
        if (parentToken != null) findMapping(sessionId, parentToken)
        val dataRequest = store.saveDataRequest(
            DebugDataRequest(
                id = UUID.randomUUID(),
                sessionId = sessionId,
                status = DebugDataRequestStatus.pending,
                entity = request.entity.trim().ifBlank { error("Missing requested entity.") },
                relation = request.relation?.trim()?.takeIf { it.isNotBlank() },
                parentToken = parentToken,
                reason = request.reason.trim().ifBlank { error("Missing request reason.") },
                requestedFields = request.requestedFields.mapNotNull { it.trim().takeIf(String::isNotBlank) },
                suggestedSql = null,
                createdAt = Instant.now(),
            ),
        )
        touch(sessionId)
        audit(sessionId, "debug_data_request_created", dataRequest.id.toString())
        return DebugDataRequestCreated(dataRequest.id, dataRequest.status)
    }

    fun listDataRequests(sessionId: UUID): List<DebugSafeDataRequest> {
        requireSession(sessionId)
        return store.dataRequestsFor(sessionId).map(::safeDataRequest)
    }

    fun completeDataRequest(sessionId: UUID, requestId: UUID): DebugDataRequest {
        requireSession(sessionId)
        val request = requireDataRequest(sessionId, requestId)
        val updated = store.saveDataRequest(request.copy(status = DebugDataRequestStatus.completed, completedAt = Instant.now()))
        touch(sessionId)
        audit(sessionId, "debug_data_request_completed", requestId.toString())
        return updated
    }

    fun rejectDataRequest(sessionId: UUID, requestId: UUID): DebugDataRequest {
        requireSession(sessionId)
        val request = requireDataRequest(sessionId, requestId)
        val updated = store.saveDataRequest(request.copy(status = DebugDataRequestStatus.rejected, completedAt = Instant.now()))
        touch(sessionId)
        audit(sessionId, "debug_data_request_rejected", requestId.toString())
        return updated
    }

    fun promoteMemory(sessionId: UUID, request: PromoteDebugMemoryRequest): AgentMemory {
        requireSession(sessionId)
        validateMemoryPromotionContent(request.content)
        val memory = memoryService.remember(
            RememberRequest(
                type = request.type,
                content = request.content,
                confidence = request.confidence,
                repository = request.repository?.trim()?.takeIf { it.isNotBlank() },
                module = request.module?.trim()?.takeIf { it.isNotBlank() },
                projectId = request.projectId,
                global = request.global,
            ),
        )
        touch(sessionId)
        audit(sessionId, "memory_promoted", memory.id.toString())
        return memory
    }

    private fun memorySuggestions(sessionId: UUID): List<DebugMemorySuggestion> {
        val suggestions = mutableListOf<DebugMemorySuggestion>()
        store.dataRequestsFor(sessionId)
            .filter { it.status == DebugDataRequestStatus.completed }
            .take(3)
            .forEach { request ->
                suggestions += DebugMemorySuggestion(
                    id = "request-${request.id}",
                    type = MemoryType.ProjectKnowledge,
                    content = "When debugging ${request.entity.lowercase()} issues, check ${request.relation ?: request.entity} data because ${sanitizeSuggestion(request.reason)}.",
                    confidence = 0.78,
                    reason = "Completed Safe Debug data request",
                )
            }
        store.notesFor(sessionId)
            .take(3)
            .forEach { note ->
                suggestions += DebugMemorySuggestion(
                    id = "note-${note.id}",
                    type = MemoryType.BugFix,
                    content = sanitizeSuggestion(note.request).let { "Debugging lesson: $it" },
                    confidence = 0.72,
                    reason = "Agent follow-up request",
                )
            }
        store.artifactsFor(sessionId)
            .asSequence()
            .mapNotNull { artifact ->
                val clue = artifact.compactText
                    ?.lines()
                    ?.firstOrNull { line -> debugLessonLineRegex.containsMatchIn(line) }
                    ?: artifact.sanitizedText.lines().firstOrNull { line -> debugLessonLineRegex.containsMatchIn(line) }
                clue?.let {
                    DebugMemorySuggestion(
                        id = "artifact-${artifact.id}",
                        type = MemoryType.BugFix,
                        content = "Debugging lesson from ${artifact.sourceName}: ${sanitizeSuggestion(it)}",
                        confidence = 0.7,
                        reason = "Sanitized artifact contains failure signal",
                    )
                }
            }
            .take(3)
            .forEach { suggestions += it }
        return suggestions
            .map { it.copy(content = it.content.trim().take(280).trimEnd('.', ';', ':') + ".") }
            .filter { it.content.length >= 24 && validateSuggestionSafe(it.content) }
            .distinctBy { it.content.lowercase() }
            .take(5)
    }

    fun contextForMcp(sessionId: UUID): DebugSessionContext {
        val detail = detail(sessionId)
        return DebugSessionContext(
            session = detail.session,
            artifacts = detail.artifacts.map(::agentFacingArtifact),
            tokens = detail.tokenMappings.map {
                DebugSafeToken(
                    token = it.token,
                    entityType = it.entityType,
                    table = it.table,
                    column = it.column,
                    createdAt = it.createdAt,
                )
            },
            dataRequests = detail.dataRequests.map(::safeDataRequest),
            notes = detail.notes,
        )
    }

    fun stateForMcp(sessionId: UUID): DebugSessionState {
        val detail = detail(sessionId)
        return DebugSessionState(
            session = detail.session,
            artifacts = detail.artifacts.map(::agentFacingArtifact),
            dataRequests = detail.dataRequests.map(::safeDataRequest),
            timeline = detail.auditEvents,
            notes = detail.notes,
        )
    }

    fun artifactSlice(sessionId: UUID, artifactId: UUID, beforeLine: Int, afterLine: Int): DebugArtifactSlice {
        requireSession(sessionId)
        val artifact = store.getArtifact(artifactId) ?: error("Debug artifact not found.")
        require(artifact.sessionId == sessionId) { "Debug artifact does not belong to this session." }
        val lines = artifact.sanitizedText.lines()
        val start = beforeLine.coerceAtLeast(1).coerceAtMost(lines.size.coerceAtLeast(1))
        val end = afterLine.coerceAtLeast(start).coerceAtMost(lines.size.coerceAtLeast(1))
        audit(sessionId, "debug_artifact_slice_expanded", "$artifactId:$start-$end")
        return DebugArtifactSlice(
            artifactId = artifactId,
            startLine = start,
            endLine = end,
            text = if (lines.isEmpty()) "" else lines.subList(start - 1, end).joinToString("\n"),
        )
    }

    fun compareArtifacts(sessionId: UUID, leftArtifactId: UUID, rightArtifactId: UUID): DebugArtifactComparison {
        requireSession(sessionId)
        require(leftArtifactId != rightArtifactId) { "Choose two different debug artifacts to compare." }
        val left = store.getArtifact(leftArtifactId) ?: error("Left debug artifact not found.")
        val right = store.getArtifact(rightArtifactId) ?: error("Right debug artifact not found.")
        require(left.sessionId == sessionId && right.sessionId == sessionId) {
            "Debug artifacts must belong to this session."
        }

        val leftLines = comparableLines(left.sanitizedText)
        val rightLines = comparableLines(right.sanitizedText)
        val leftCounts = leftLines.groupingBy { it.normalized }.eachCount()
        val rightCounts = rightLines.groupingBy { it.normalized }.eachCount()
        val unchanged = leftCounts.entries.sumOf { (line, count) -> minOf(count, rightCounts[line] ?: 0) }
        val added = diffLines(
            type = DebugArtifactDiffType.added,
            source = rightLines,
            sourceCounts = rightCounts,
            otherCounts = leftCounts,
        )
        val removed = diffLines(
            type = DebugArtifactDiffType.removed,
            source = leftLines,
            sourceCounts = leftCounts,
            otherCounts = rightCounts,
        )
        val totalChanged = added.size + removed.size
        audit(sessionId, "debug_artifacts_compared", "$leftArtifactId:$rightArtifactId")
        return DebugArtifactComparison(
            left = left.toReference(leftLines.size),
            right = right.toReference(rightLines.size),
            summary = when {
                totalChanged == 0 -> "No sanitized line changes detected."
                added.isNotEmpty() && removed.isNotEmpty() -> "${added.size} added and ${removed.size} removed sanitized line(s)."
                added.isNotEmpty() -> "${added.size} sanitized line(s) added."
                else -> "${removed.size} sanitized line(s) removed."
            },
            unchangedLineCount = unchanged,
            totalChangedLines = totalChanged,
            addedLines = added.take(MAX_COMPARISON_LINES),
            removedLines = removed.take(MAX_COMPARISON_LINES),
        )
    }

    fun auditExport(sessionId: UUID, artifactId: UUID? = null) {
        requireSession(sessionId)
        audit(sessionId, "artifact_copied_exported", artifactId?.toString() ?: "instruction_or_sanitized_output")
    }

    private fun comparableLines(text: String): List<ComparableLine> =
        text.lines()
            .mapIndexedNotNull { index, line ->
                val normalized = line.trim()
                normalized.takeIf { it.isNotBlank() }?.let {
                    ComparableLine(index + 1, line.take(MAX_COMPARISON_LINE_LENGTH), it)
                }
            }

    private fun diffLines(
        type: DebugArtifactDiffType,
        source: List<ComparableLine>,
        sourceCounts: Map<String, Int>,
        otherCounts: Map<String, Int>,
    ): List<DebugArtifactDiffLine> {
        val emitted = mutableMapOf<String, Int>()
        return source.mapNotNull { line ->
            val allowed = (sourceCounts[line.normalized] ?: 0) - (otherCounts[line.normalized] ?: 0)
            if (allowed <= 0) return@mapNotNull null
            val current = emitted[line.normalized] ?: 0
            if (current >= allowed) return@mapNotNull null
            emitted[line.normalized] = current + 1
            DebugArtifactDiffLine(type, line.lineNumber, line.text)
        }
    }

    private fun DebugArtifact.toReference(lineCount: Int): DebugArtifactReference =
        DebugArtifactReference(
            id = id,
            sourceName = sourceName,
            inputType = inputType,
            createdAt = createdAt,
            lineCount = lineCount,
        )

    private fun compressSanitizedArtifact(sourceName: String, inputType: DebugInputType, sanitized: String) =
        compressorFor(inputType.toArtifactKind()).compress(
            CompressionInput(
                title = sourceName,
                kind = inputType.toArtifactKind(),
                content = sanitized,
            ),
        )

    private fun compressorFor(kind: ArtifactKind): ContextCompressor =
        compressors.firstOrNull { it.supports(kind) } ?: compressors.first { it.supports(ArtifactKind.TEXT) }

    private fun DebugInputType.toArtifactKind(): ArtifactKind =
        when (this) {
            DebugInputType.csv -> ArtifactKind.QUERY_RESULT
            DebugInputType.json -> ArtifactKind.TEXT
            DebugInputType.log -> ArtifactKind.LOG
        }

    private fun agentFacingArtifact(artifact: DebugArtifact): DebugSafeArtifact {
        val content = artifact.compactText
            ?.takeIf { it.isNotBlank() }
            ?: artifact.sanitizedText
        return DebugSafeArtifact(
            id = artifact.id,
            sessionId = artifact.sessionId,
            inputType = artifact.inputType,
            sourceName = artifact.sourceName,
            sanitizedText = content,
            compactText = artifact.compactText,
            rawTokenEstimate = artifact.rawTokenEstimate,
            compressedTokenEstimate = artifact.compressedTokenEstimate,
            reductionPercent = artifact.reductionPercent,
            warningSummary = artifact.warningSummary,
            dataRequestId = artifact.dataRequestId,
            createdAt = artifact.createdAt,
            profileName = artifact.profileName,
            summary = artifact.summary,
            audit = artifact.audit.filterNot { it.blocking },
        )
    }

    private fun sanitizeCsv(raw: String, context: SanitizeContext): String {
        val rows = parseCsv(raw)
        if (rows.isEmpty()) return ""
        val headers = rows.first()
        val output = mutableListOf(headers)
        rows.drop(1).forEach { row ->
            output += headers.mapIndexed { index, header ->
                val value = row.getOrElse(index) { "" }
                sanitizeField(header, value, context)
            }
        }
        return output.joinToString("\n") { row -> row.joinToString(",") { csvEscape(it) } }
    }

    private fun sanitizeJson(raw: String, context: SanitizeContext): String {
        val root = mapper.readTree(raw)
        val sanitized = sanitizeJsonNode(root, context)
        return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(sanitized)
    }

    private fun sanitizeJsonNode(node: JsonNode, context: SanitizeContext, fieldName: String = ""): JsonNode =
        when {
            node.isObject -> {
                val output = mapper.createObjectNode()
                node.fields().forEachRemaining { (key, value) -> output.set<JsonNode>(key, sanitizeJsonNode(value, context, key)) }
                output
            }
            node.isArray -> {
                val output = mapper.createArrayNode()
                node.forEach { output.add(sanitizeJsonNode(it, context, fieldName)) }
                output
            }
            node.isTextual || node.isNumber || node.isBoolean -> {
                val sanitized = sanitizeField(fieldName, node.asText(), context)
                if (!node.isTextual && sanitized == node.asText()) node else TextNode.valueOf(sanitized)
            }
            else -> node
        }

    private fun sanitizeLog(raw: String, context: SanitizeContext): String = sanitizeFreeText(raw, context, "free_text")

    private fun looksLikeTimestamp(value: String): Boolean =
        timestampLikeRegex.containsMatchIn(value) || dateLikeRegex.matches(value.trim())

    private fun sanitizeFreeText(raw: String, context: SanitizeContext, field: String): String {
        var output = raw
        knownMappings(context.sessionId).forEach { mapping ->
            output = output.replace(Regex("""(?<![A-Za-z0-9_])${Regex.escape(mapping.realValue)}(?![A-Za-z0-9_])"""), mapping.token)
        }
        output = jwtRegex.replace(output) {
            context.warnings.add(DebugWarningType.unknown_pii, "Detected JWT-like secret and replaced it with a token.", field)
            tokenFor(context, "SECRET", "free_text", "jwt", it.value)
        }
        output = apiKeyRegex.replace(output) {
            context.warnings.add(DebugWarningType.unknown_pii, "Detected API key-like secret and replaced it with a token.", field)
            "${it.groupValues[1]}=${tokenFor(context, "SECRET", "free_text", "secret", it.groupValues[2])}"
        }
        output = ssnRegex.replace(output) {
            context.warnings.add(DebugWarningType.unknown_pii, "Detected SSN-like value and replaced it with a token.", field)
            tokenFor(context, "SSN", "free_text", "ssn", it.value)
        }
        output = emailRegex.replace(output) {
            context.warnings.add(DebugWarningType.email, "Detected email address in free text.", field)
            tokenFor(context, "EMAIL", "free_text", "email", it.value)
        }
        output = phoneRegex.replace(output) {
            if (looksLikeTimestamp(it.value)) return@replace it.value
            context.warnings.add(DebugWarningType.phone, "Detected phone number in free text.", field)
            tokenFor(context, "PHONE", "free_text", "phone", it.value)
        }
        output = cardRegex.replace(output) {
            context.warnings.add(DebugWarningType.unknown_pii, "Possible payment card value was removed.", field)
            tokenFor(context, "UNKNOWN", "free_text", "card", it.value)
        }
        output = ibanRegex.replace(output) {
            context.warnings.add(DebugWarningType.unknown_pii, "Possible IBAN value was removed.", field)
            tokenFor(context, "UNKNOWN", "free_text", "iban", it.value)
        }
        if (context.mode != DebugSanitizerMode.permissive) {
            output = addressRegex.replace(output) {
                context.warnings.add(DebugWarningType.address, "Detected address in free text and replaced it with a token.", field)
                tokenFor(context, "ADDRESS", "free_text", "address", it.value)
            }
            output = labelledNameRegex.replace(output) {
                context.warnings.add(DebugWarningType.person_name, "Detected labelled person name in free text and replaced it with a token.", field)
                "${it.groupValues[1]}=${tokenFor(context, "PERSON", "free_text", "name", it.groupValues[2])}"
            }
        }
        if (context.mode == DebugSanitizerMode.strict) {
            output = dobInTextRegex.replace(output) {
                context.warnings.add(DebugWarningType.unknown_pii, "Detected birth-date-like value and replaced it with a token.", field)
                "${it.groupValues[1]}=${tokenFor(context, "DATE", "free_text", "date", it.groupValues[2])}"
            }
            output = uuidRegex.replace(output) {
                context.warnings.add(DebugWarningType.unknown_pii, "Detected UUID-like value and replaced it with a token.", field)
                tokenFor(context, "UUID", "free_text", "uuid", it.value)
            }
            output = ipRegex.replace(output) {
                context.warnings.add(DebugWarningType.unknown_pii, "Detected IP address and replaced it with a token.", field)
                tokenFor(context, "IP", "free_text", "ip", it.value)
            }
            output = likelyFullNameRegex.replace(output) {
                context.warnings.add(DebugWarningType.person_name, "Detected possible person name and replaced it with a token.", field)
                tokenFor(context, "PERSON", "free_text", "name", it.value)
            }
        } else {
            if (likelyFullNameRegex.containsMatchIn(output)) {
                context.warnings.add(DebugWarningType.person_name, "Free text may contain names.", field)
            }
            if (addressRegex.containsMatchIn(output)) {
                context.warnings.add(DebugWarningType.address, "Free text may contain addresses.", field)
            }
        }
        return output
    }

    private fun sanitizeField(field: String, value: String, context: SanitizeContext): String {
        if (value.isBlank()) return value
        val normalized = normalizeFieldName(field)
        if (riskyColumns.any { normalized.contains(it) } && normalized !in hardBlockedFieldNames) {
            val sanitized = sanitizeFreeText(value, context, field)
            if (sanitized != value) {
                val decision = SanitizationDecision(unknownRule(normalized, SanitizationAction.keep), SanitizationAction.keep, SanitizationProfileScope.session, "free_text")
                context.record(field, decision, sanitized)
                return sanitized
            }
        }
        val decision = decisionFor(normalized, value, context)
        val result = applyDecision(field, normalized, value, decision, context)
        context.record(field, decision, result)
        return result
    }

    private fun inferredRule(field: String): FieldRule? {
        val compact = field.replace(Regex("""[^a-z0-9]+"""), "")
        return when {
            field == "id" -> FieldRule(token = tokenPrefixFor("custom"))
            field.endsWith("_id") -> FieldRule(token = tokenPrefixFor(field.removeSuffix("_id")))
            compact.contains("email") || compact.contains("mailaddress") -> FieldRule(mask = "EMAIL")
            compact.contains("phone") || compact.contains("mobile") || compact.contains("telephone") || compact == "tel" -> FieldRule(mask = "PHONE")
            compact.contains("address") || compact.contains("street") || compact.contains("postcode") || compact.contains("zipcode") -> FieldRule(mask = "ADDRESS")
            compact.contains("firstname") || compact.contains("lastname") || compact.contains("fullname") || compact.endsWith("name") -> FieldRule(mask = "PERSON")
            compact.contains("ssn") || compact.contains("dob") || compact.contains("birth") -> FieldRule(mask = "SSN")
            compact.contains("apikey") || compact.contains("token") || compact.contains("secret") || compact.contains("jwt") -> FieldRule(mask = "SECRET")
            else -> null
        }
    }

    private fun effectiveProfile(request: SanitizeDebugRequest): SanitizationProfile {
        val builtIn = when (request.mode) {
            DebugSanitizerMode.strict -> strictBuiltInProfile
            DebugSanitizerMode.balanced -> balancedBuiltInProfile
            DebugSanitizerMode.permissive -> developerBuiltInProfile
        }
        val enabledProfiles = listOfNotNull(
            builtIn,
            request.projectProfile?.takeIf { it.enabled },
            request.sessionProfile?.takeIf { it.enabled },
            request.artifactProfile?.takeIf { it.enabled },
        )
        val now = Instant.now()
        return SanitizationProfile(
            id = enabledProfiles.joinToString("+") { it.id },
            name = enabledProfiles.lastOrNull()?.name ?: builtIn.name,
            description = "Effective Safe Debug sanitization profile",
            scope = SanitizationProfileScope.session,
            defaultAction = enabledProfiles.lastOrNull()?.defaultAction ?: builtIn.defaultAction,
            unknownFieldBehavior = enabledProfiles.lastOrNull()?.unknownFieldBehavior ?: builtIn.unknownFieldBehavior,
            strictMode = request.mode == DebugSanitizerMode.strict || enabledProfiles.any { it.strictMode },
            rules = enabledProfiles.flatMap { it.rules },
            detectors = enabledProfiles.flatMap { it.detectors }.distinctBy { it.id },
            createdAt = now,
            updatedAt = now,
        )
    }

    private fun decisionFor(field: String, value: String, context: SanitizeContext): SanitizationDecision {
        val hardBlocked = context.profile.rules
            .filter { it.enabled && it.protection == BuiltInRuleProtection.hard_blocked && it.matches(context.sourceName, field) }
            .maxWithOrNull(ruleComparator)
        if (hardBlocked != null) return SanitizationDecision(hardBlocked, hardBlocked.action, SanitizationProfileScope.built_in, "hard_blocked")

        val matchedRule = context.profile.rules
            .filter { it.enabled && it.matches(context.sourceName, field) }
            .maxWithOrNull(ruleComparator)
        if (matchedRule != null) {
            val protected = matchedRule.protection == BuiltInRuleProtection.protected && matchedRule.action == SanitizationAction.keep
            return SanitizationDecision(matchedRule, if (protected) SanitizationAction.warn else matchedRule.action, SanitizationProfileScope.built_in, null)
        }

        detectorFor(value, context)?.let { detector ->
            return SanitizationDecision(
                rule = SanitizationRule(
                    id = "detector/${detector.id}",
                    fieldPattern = field.ifBlank { "free_text" },
                    action = detector.action,
                    tokenType = detector.replacementType,
                ),
                action = detector.action,
                source = SanitizationProfileScope.built_in,
                detectedType = detector.replacementType ?: detector.id,
            )
        }

        return when (context.profile.unknownFieldBehavior) {
            UnknownFieldBehavior.remove -> SanitizationDecision(unknownRule(field, SanitizationAction.remove), SanitizationAction.remove, SanitizationProfileScope.session, null)
            UnknownFieldBehavior.redact -> SanitizationDecision(unknownRule(field, SanitizationAction.redact), SanitizationAction.redact, SanitizationProfileScope.session, null)
            UnknownFieldBehavior.keep -> SanitizationDecision(unknownRule(field, SanitizationAction.keep), SanitizationAction.keep, SanitizationProfileScope.session, null)
            UnknownFieldBehavior.warn -> SanitizationDecision(unknownRule(field, SanitizationAction.warn), SanitizationAction.warn, SanitizationProfileScope.session, null)
        }
    }

    private fun unknownRule(field: String, action: SanitizationAction): SanitizationRule =
        SanitizationRule(id = "unknown-field/$field", fieldPattern = field.ifBlank { "unknown" }, action = action)

    private fun detectorFor(value: String, context: SanitizeContext): SensitiveDataDetector? =
        context.profile.detectors.firstOrNull { detector ->
            detector.enabled && when (detector.id) {
                "email-detector" -> emailRegex.matches(value)
                "phone-detector" -> phoneRegex.matches(value) && !looksLikeTimestamp(value)
                "ipv4-detector" -> ipRegex.matches(value)
                "iban-detector" -> ibanRegex.matches(value)
                "card-detector" -> cardRegex.matches(value)
                "uuid-detector" -> uuidRegex.matches(value)
                "jwt-detector" -> jwtRegex.matches(value)
                "api-key-detector", "bearer-token-detector" -> apiKeyRegex.matches(value)
                "address-detector" -> addressRegex.containsMatchIn(value)
                "name-detector" -> likelyPersonName(value, "")
                else -> detector.pattern?.let { Regex(it).containsMatchIn(value) } ?: false
            }
        }

    private fun applyDecision(
        field: String,
        normalized: String,
        value: String,
        decision: SanitizationDecision,
        context: SanitizeContext,
    ): String {
        if (decision.rule.protection == BuiltInRuleProtection.hard_blocked) {
            context.publishable = false
            context.warnings.add(DebugWarningType.unknown_pii, "Hard-blocked secret field was removed.", field)
            return ""
        }
        return when (decision.action) {
            SanitizationAction.keep -> value
            SanitizationAction.remove -> ""
            SanitizationAction.redact -> decision.rule.replacement ?: "[REDACTED]"
            SanitizationAction.tokenize -> {
                val tokenType = decision.rule.tokenType
                    ?: decision.detectedType
                    ?: if (normalized == "id") tokenPrefixFor(context.sourceName) else tokenPrefixFor(normalized.removeSuffix("_id").ifBlank { normalized })
                val relation = decision.rule.relation
                tokenFor(context, tokenType, relation?.entity ?: context.sourceName, relation?.canonicalField ?: normalized.ifBlank { "value" }, value)
            }
            SanitizationAction.hash -> hmacToken(context.sessionId, value)
            SanitizationAction.truncate -> value.take(decision.rule.truncateLength ?: 16)
            SanitizationAction.generalize -> generalizeValue(value, decision.rule.generalizationStrategy)
            SanitizationAction.warn -> {
                context.publishable = false
                context.warnings.add(warningTypeForMask(decision.detectedType ?: "UNKNOWN"), "Field requires approval before publishing.", field)
                "[REVIEW_REQUIRED]"
            }
        }
    }

    private fun generalizeValue(value: String, strategy: String?): String =
        when (strategy) {
            "date" -> value.take(10)
            "amount_range" -> value.toDoubleOrNull()?.let { amount ->
                val floor = (amount / 10).toInt() * 10
                "$floor-${floor + 10}"
            } ?: "[GENERALIZED]"
            else -> "[GENERALIZED]"
        }

    private fun hmacToken(sessionId: UUID, value: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec("rage-khab-safe-debug:$sessionId".toByteArray(), "HmacSHA256"))
        return mac.doFinal(value.toByteArray()).take(12).joinToString("") { "%02x".format(it) }
    }

    private fun tokenFor(context: SanitizeContext, prefix: String, table: String, column: String, realValue: String): String {
        val normalizedPrefix = prefix.uppercase()
        val existing = knownMappings(context.sessionId).firstOrNull {
            it.entityType == normalizedPrefix && it.realValue == realValue
        }
        if (existing != null) return existing.token

        val next = knownMappings(context.sessionId).count { it.entityType == normalizedPrefix } + 1
        val token = "${normalizedPrefix}_${next.toString().padStart(3, '0')}"
        store.saveMapping(
            DebugTokenMapping(
                sessionId = context.sessionId,
                token = token,
                entityType = normalizedPrefix,
                table = table,
                column = column,
                realValue = realValue,
                createdAt = Instant.now(),
            ),
        )
        return token
    }

    private fun knownMappings(sessionId: UUID): List<DebugTokenMapping> = store.mappingsFor(sessionId)

    private fun touch(sessionId: UUID): DebugSession {
        val session = requireSession(sessionId)
        return store.saveSession(session.copy(updatedAt = Instant.now()))
    }

    private fun audit(sessionId: UUID, action: String, detail: String) {
        store.saveAuditEvent(
            DebugAuditEvent(
                id = UUID.randomUUID(),
                sessionId = sessionId,
                action = action,
                detail = detail,
                createdAt = Instant.now(),
            ),
        )
    }

    private fun requireSession(sessionId: UUID): DebugSession =
        store.getSession(sessionId) ?: error("Debug session not found.")

    private fun validateMemoryPromotionContent(content: String) {
        val trimmed = content.trim()
        require(trimmed.isNotBlank()) { "Memory content must not be blank." }
        val blocked = listOfNotNull(
            debugTokenRegex.find(trimmed)?.value?.let { "debug token '$it'" },
            emailRegex.find(trimmed)?.value?.let { "email address" },
            phoneRegex.find(trimmed)?.value?.let { "phone number" },
            cardRegex.find(trimmed)?.value?.let { "payment card-like value" },
            ibanRegex.find(trimmed)?.value?.let { "IBAN-like value" },
            ssnRegex.find(trimmed)?.value?.let { "SSN-like value" },
            jwtRegex.find(trimmed)?.value?.let { "JWT-like secret" },
            apiKeyRegex.find(trimmed)?.value?.let { "API key-like secret" },
            sqlRealIdRegex.find(trimmed)?.value?.let { "SQL with a likely real identifier" },
        )
        require(blocked.isEmpty()) {
            "Memory promotion blocked because content appears to contain ${blocked.first()}. Save only sanitized durable lessons."
        }
    }

    private fun validateSuggestionSafe(content: String): Boolean =
        runCatching {
            validateMemoryPromotionContent(content)
            true
        }.getOrDefault(false)

    private fun sanitizeSuggestion(value: String): String =
        value
            .replace(debugTokenRegex, "the affected entity")
            .replace(uuidRegex, "the affected entity")
            .replace(Regex("""\b\d{4,}\b"""), "the affected entity")
            .replace(Regex("""\s+"""), " ")
            .trim()

    private fun parseCsv(raw: String): List<List<String>> {
        val rows = mutableListOf<List<String>>()
        val row = mutableListOf<String>()
        val cell = StringBuilder()
        var quoted = false
        var index = 0
        while (index < raw.length) {
            val char = raw[index]
            when {
                char == '"' && quoted && raw.getOrNull(index + 1) == '"' -> {
                    cell.append('"')
                    index += 1
                }
                char == '"' -> quoted = !quoted
                char == ',' && !quoted -> {
                    row += cell.toString()
                    cell.clear()
                }
                (char == '\n' || char == '\r') && !quoted -> {
                    if (char == '\r' && raw.getOrNull(index + 1) == '\n') index += 1
                    row += cell.toString()
                    cell.clear()
                    rows += row.toList()
                    row.clear()
                }
                else -> cell.append(char)
            }
            index += 1
        }
        if (cell.isNotEmpty() || row.isNotEmpty()) {
            row += cell.toString()
            rows += row.toList()
        }
        return rows.filterNot { cells -> cells.all { it.isBlank() } }
    }

    private fun csvEscape(value: String): String =
        if (value.any { it == ',' || it == '"' || it == '\n' || it == '\r' }) "\"${value.replace("\"", "\"\"")}\"" else value

    private fun likelyPersonName(value: String, field: String): Boolean =
        field.contains("name") || (value.length in 3..80 && value.split(Regex("""\s+""")).size in 2..3 && likelyFullNameRegex.matches(value))

    private fun normalizeFieldName(field: String): String =
        field.trim()
            .replace(Regex("""([a-z0-9])([A-Z])"""), "$1_$2")
            .lowercase()
            .replace(Regex("""[^a-z0-9]+"""), "_")
            .trim('_')

    private fun tokenPrefixFor(table: String): String = debugTokenPrefixFor(table)

    private fun warningTypeForMask(mask: String): DebugWarningType =
        when (mask.uppercase()) {
            "EMAIL" -> DebugWarningType.email
            "PHONE" -> DebugWarningType.phone
            "PERSON" -> DebugWarningType.person_name
            "ADDRESS" -> DebugWarningType.address
            else -> DebugWarningType.unknown_pii
        }

    private data class SanitizeContext(
        val sessionId: UUID,
        val sourceName: String,
        val mode: DebugSanitizerMode,
        val warnings: WarningCollector,
        val profile: SanitizationProfile,
        val audit: MutableList<SanitizationAuditEntry> = mutableListOf(),
        val counts: MutableMap<SanitizationAction, Int> = mutableMapOf(),
        var publishable: Boolean = true,
    ) {
        fun record(field: String, decision: SanitizationDecision, result: String) {
            counts[decision.action] = (counts[decision.action] ?: 0) + 1
            audit += SanitizationAuditEntry(
                field = field,
                action = decision.action,
                matchedRule = decision.rule.id,
                source = decision.source,
                originalDetectedType = decision.detectedType,
                result = result.takeIf { it.isNotBlank() && it != "[REVIEW_REQUIRED]" && it != "[REDACTED]" },
                blocking = decision.rule.protection == BuiltInRuleProtection.hard_blocked || decision.action == SanitizationAction.warn,
            )
        }

        fun summary(): SanitizationSummary =
            SanitizationSummary(
                kept = counts[SanitizationAction.keep] ?: 0,
                tokenized = counts[SanitizationAction.tokenize] ?: 0,
                redacted = counts[SanitizationAction.redact] ?: 0,
                removed = counts[SanitizationAction.remove] ?: 0,
                hashed = counts[SanitizationAction.hash] ?: 0,
                truncated = counts[SanitizationAction.truncate] ?: 0,
                generalized = counts[SanitizationAction.generalize] ?: 0,
                warnings = (counts[SanitizationAction.warn] ?: 0) + warnings.toList().sumOf { it.count ?: 1 },
            )
    }

    private data class SanitizationDecision(
        val rule: SanitizationRule,
        val action: SanitizationAction,
        val source: SanitizationProfileScope,
        val detectedType: String?,
    )

    private data class FieldRule(
        val token: String? = null,
        val mask: String? = null,
        val ref: String? = null,
        val keep: Boolean = false,
    )

    private data class ComparableLine(
        val lineNumber: Int,
        val text: String,
        val normalized: String,
    )

    private class WarningCollector {
        private val warnings = linkedMapOf<String, DebugWarning>()

        fun add(type: DebugWarningType, message: String, field: String? = null) {
            val key = "${type.name}:${field.orEmpty()}:$message"
            val current = warnings[key]
            warnings[key] = if (current == null) {
                DebugWarning(type, message, field, 1)
            } else {
                current.copy(count = (current.count ?: 1) + 1)
            }
        }

        fun toList(): List<DebugWarning> = warnings.values.toList()
    }

    companion object {
        private val emailRegex = Regex("""[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}""")
        private val phoneRegex = Regex("""(?<![A-Za-z0-9_])(?:\+?\d[\d \t().-]{7,}\d)(?![A-Za-z0-9_])""")
        private val timestampLikeRegex = Regex("""\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b""")
        private val dateLikeRegex = Regex("""\d{4}-\d{2}-\d{2}""")
        private val cardRegex = Regex("""(?:\d[ -]*?){13,19}""")
        private val ibanRegex = Regex("""[A-Z]{2}\d{2}[A-Z0-9]{11,30}""", RegexOption.IGNORE_CASE)
        private val ssnRegex = Regex("""\b\d{3}-\d{2}-\d{4}\b""")
        private val jwtRegex = Regex("""\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b""")
        private val apiKeyRegex = Regex("""(?i)\b(api[_-]?key|token|secret|authorization)\s*[:=]\s*([A-Za-z0-9._~+/=-]{16,})""")
        private val uuidRegex = Regex("""\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b""", RegexOption.IGNORE_CASE)
        private val ipRegex = Regex("""\b(?:\d{1,3}\.){3}\d{1,3}\b""")
        private val addressRegex = Regex("""\b\d{1,6}\s+[A-Za-z0-9 .'-]+\s+(Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Boulevard|Blvd)\b""", RegexOption.IGNORE_CASE)
        private val labelledNameRegex = Regex("""(?i)\b(name|customer|user|patient)\s*[:=]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})""")
        private val dobInTextRegex = Regex("""(?i)\b(dob|date_of_birth|birth_date|birthday)\s*[:=]\s*(\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{2,4})""")
        private val likelyFullNameRegex = Regex("""[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}""")
        private val debugTokenRegex = Regex("""\b(?:USER|ORDER|PAYMENT|EMAIL|PERSON|PHONE|ADDRESS|UNKNOWN|SECRET|SSN|DATE|UUID|IP)_\d{3,}\b""")
        private val debugLessonLineRegex = Regex("""\b(error|failed|failure|exception|caused by|invalid|timeout|rejected|stuck)\b""", RegexOption.IGNORE_CASE)
        private val sqlRealIdRegex = Regex("""\bwhere\s+[a-z_][a-z0-9_]*\s*=\s*(?:\d+|'[^']+')""", RegexOption.IGNORE_CASE)
        private const val MAX_COMPARISON_LINES = 80
        private const val MAX_COMPARISON_LINE_LENGTH = 500
        private const val MAX_SANITIZATION_AUDIT_ENTRIES = 200
        private val riskyColumns = listOf("email", "phone", "name", "address", "iban", "card", "ssn", "dob", "birth", "note", "comment", "description", "secret", "token", "api_key")
        private val ruleComparator = compareBy<SanitizationRule> { it.priority }
            .thenBy {
                when (it.matchType) {
                    SanitizationRuleMatchType.regex -> 0
                    SanitizationRuleMatchType.glob -> 1
                    SanitizationRuleMatchType.exact -> 2
                }
            }

        private fun SanitizationRule.matches(sourceName: String, field: String): Boolean {
            if (sourcePattern != null && !globRegex(sourcePattern).matches(sourceName)) return false
            return when (matchType) {
                SanitizationRuleMatchType.exact -> fieldPattern.equals(field, ignoreCase = true)
                SanitizationRuleMatchType.glob -> globRegex(fieldPattern).matches(field)
                SanitizationRuleMatchType.regex -> Regex(fieldPattern, RegexOption.IGNORE_CASE).matches(field)
            }
        }

        private fun globRegex(pattern: String): Regex =
            Regex("^" + pattern.split('*').joinToString(".*") { Regex.escape(it) } + "$", RegexOption.IGNORE_CASE)

        private fun rule(
            id: String,
            pattern: String,
            action: SanitizationAction,
            priority: Int,
            tokenType: String? = null,
            matchType: SanitizationRuleMatchType = SanitizationRuleMatchType.exact,
            protection: BuiltInRuleProtection = BuiltInRuleProtection.normal,
            relation: SanitizationRelation? = null,
        ) = SanitizationRule(
            id = id,
            fieldPattern = pattern,
            matchType = matchType,
            action = action,
            tokenType = tokenType,
            priority = priority,
            protection = protection,
            relation = relation,
        )

        private fun debugTokenPrefixFor(table: String): String =
            when (table.lowercase().trim()) {
                "users", "user", "customer", "customers" -> "USER"
                "orders", "order" -> "ORDER"
                "payments", "payment" -> "PAYMENT"
                else -> table.uppercase().replace(Regex("""[^A-Z0-9]+"""), "_").trim('_').ifBlank { "UNKNOWN" }
            }

        private val hardBlockedFieldNames = listOf(
            "password", "password_hash", "secret", "api_key", "access_token", "refresh_token", "authorization",
            "cookie", "session_cookie", "private_key", "client_secret", "otp", "pin", "cvv", "card_number",
        )

        private val hardBlockedFieldRules = hardBlockedFieldNames.map { rule("built-in/hard-block/$it", it, SanitizationAction.remove, 10_000, protection = BuiltInRuleProtection.hard_blocked) } +
            listOf(
                rule("built-in/hard-block/password-glob", "password*", SanitizationAction.remove, 10_000, matchType = SanitizationRuleMatchType.glob, protection = BuiltInRuleProtection.hard_blocked),
                rule("built-in/hard-block/token-glob", "*token*", SanitizationAction.remove, 9_900, matchType = SanitizationRuleMatchType.glob, protection = BuiltInRuleProtection.hard_blocked),
                rule("built-in/hard-block/secret-glob", "*secret*", SanitizationAction.remove, 9_900, matchType = SanitizationRuleMatchType.glob, protection = BuiltInRuleProtection.hard_blocked),
            )

        private val defaultTokenRules = listOf("id", "user_id", "customer_id", "account_id", "order_id", "payment_id", "shipment_id", "employee_id", "patient_id", "external_id")
            .map { field -> rule("built-in/token/$field", field, SanitizationAction.tokenize, 900, tokenType = field.takeUnless { it == "id" }?.let { debugTokenPrefixFor(it.removeSuffix("_id")) }) }

        private val defaultPiiRules = listOf("email" to "EMAIL", "name" to "PERSON", "first_name" to "PERSON", "last_name" to "PERSON", "full_name" to "PERSON", "phone" to "PHONE", "mobile" to "PHONE", "address" to "ADDRESS", "street" to "ADDRESS", "postal_code" to "ADDRESS", "iban" to "IBAN", "bank_account" to "BANK", "tax_id" to "TAX", "national_id" to "NATIONAL", "passport" to "PASSPORT", "ip_address" to "IP", "device_id" to "DEVICE")
            .map { (field, tokenType) -> rule("built-in/pii/$field", field, SanitizationAction.tokenize, 800, tokenType = tokenType) }

        private val defaultKeepRules = listOf("status", "state", "type", "category", "error_code", "error_type", "currency", "country_code", "created_at", "updated_at")
            .map { rule("built-in/keep/$it", it, SanitizationAction.keep, 500) }

        private val defaultDetectors = listOf(
            SensitiveDataDetector("email-detector", "Email address", action = SanitizationAction.tokenize, replacementType = "EMAIL"),
            SensitiveDataDetector("phone-detector", "Phone number", action = SanitizationAction.tokenize, replacementType = "PHONE"),
            SensitiveDataDetector("ipv4-detector", "IPv4 address", action = SanitizationAction.tokenize, replacementType = "IP"),
            SensitiveDataDetector("iban-detector", "IBAN", action = SanitizationAction.redact, replacementType = "IBAN"),
            SensitiveDataDetector("card-detector", "Credit card-like number", action = SanitizationAction.remove, replacementType = "CARD"),
            SensitiveDataDetector("uuid-detector", "UUID", action = SanitizationAction.tokenize, replacementType = "UUID"),
            SensitiveDataDetector("jwt-detector", "JWT", action = SanitizationAction.remove, replacementType = "SECRET"),
            SensitiveDataDetector("api-key-detector", "API key", action = SanitizationAction.remove, replacementType = "SECRET"),
            SensitiveDataDetector("address-detector", "Postal address", action = SanitizationAction.warn, replacementType = "ADDRESS"),
            SensitiveDataDetector("name-detector", "Possible person name", action = SanitizationAction.warn, replacementType = "PERSON"),
        )

        private val strictBuiltInProfile = SanitizationProfile(
            id = "built-in-strict",
            name = "Strict",
            scope = SanitizationProfileScope.built_in,
            defaultAction = SanitizationAction.remove,
            unknownFieldBehavior = UnknownFieldBehavior.remove,
            strictMode = true,
            rules = hardBlockedFieldRules + defaultTokenRules + defaultPiiRules + defaultKeepRules,
            detectors = defaultDetectors.map {
                if (it.action == SanitizationAction.warn) it.copy(action = SanitizationAction.tokenize) else it
            },
        )

        private val balancedBuiltInProfile = SanitizationProfile(
            id = "built-in-balanced",
            name = "Balanced",
            scope = SanitizationProfileScope.built_in,
            defaultAction = SanitizationAction.warn,
            unknownFieldBehavior = UnknownFieldBehavior.keep,
            rules = hardBlockedFieldRules + defaultTokenRules + defaultPiiRules + defaultKeepRules,
            detectors = defaultDetectors,
        )

        private val developerBuiltInProfile = SanitizationProfile(
            id = "built-in-developer-friendly",
            name = "Developer-friendly",
            scope = SanitizationProfileScope.built_in,
            defaultAction = SanitizationAction.warn,
            unknownFieldBehavior = UnknownFieldBehavior.keep,
            rules = hardBlockedFieldRules + defaultTokenRules + defaultPiiRules + defaultKeepRules,
            detectors = defaultDetectors.map {
                if (it.id in setOf("address-detector", "name-detector")) it.copy(action = SanitizationAction.warn) else it
            },
        )

        private val builtInSanitizationProfiles = listOf(strictBuiltInProfile, balancedBuiltInProfile, developerBuiltInProfile)
        private val configuredRules = mapOf(
            "users" to mapOf(
                "id" to FieldRule(token = "USER"),
                "user_id" to FieldRule(token = "USER"),
                "email" to FieldRule(mask = "EMAIL"),
                "first_name" to FieldRule(mask = "PERSON"),
                "last_name" to FieldRule(mask = "PERSON"),
                "name" to FieldRule(mask = "PERSON"),
                "phone" to FieldRule(mask = "PHONE"),
                "address" to FieldRule(mask = "ADDRESS"),
            ),
            "orders" to mapOf(
                "id" to FieldRule(token = "ORDER"),
                "order_id" to FieldRule(token = "ORDER"),
                "user_id" to FieldRule(ref = "users.id"),
                "customer_id" to FieldRule(ref = "users.id"),
                "status" to FieldRule(keep = true),
                "created_at" to FieldRule(keep = true),
                "updated_at" to FieldRule(keep = true),
            ),
            "payments" to mapOf(
                "id" to FieldRule(token = "PAYMENT"),
                "payment_id" to FieldRule(token = "PAYMENT"),
                "order_id" to FieldRule(ref = "orders.id"),
                "user_id" to FieldRule(ref = "users.id"),
                "status" to FieldRule(keep = true),
                "amount" to FieldRule(keep = true),
                "currency" to FieldRule(keep = true),
                "created_at" to FieldRule(keep = true),
            ),
        )
    }
}
