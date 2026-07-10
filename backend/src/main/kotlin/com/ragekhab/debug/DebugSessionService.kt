package com.ragekhab.debug

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.TextNode
import com.ragekhab.memory.AgentMemory
import com.ragekhab.memory.MemoryService
import com.ragekhab.memory.RememberRequest
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

@Service
class DebugSessionService(
    private val store: DebugSessionStore,
    private val mapper: ObjectMapper,
    private val memoryService: MemoryService,
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

    fun detail(sessionId: UUID): DebugSessionDetail {
        val session = requireSession(sessionId)
        return DebugSessionDetail(
            session = session,
            tokenMappings = store.mappingsFor(sessionId),
            artifacts = store.artifactsFor(sessionId),
            dataRequests = store.dataRequestsFor(sessionId),
            notes = store.notesFor(sessionId),
            auditEvents = store.auditEventsFor(sessionId),
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
        val context = SanitizeContext(sessionId, request.sourceName.trim().ifBlank { "custom" }, request.mode, warnings)
        val sanitized = when (request.inputType) {
            DebugInputType.csv -> sanitizeCsv(request.rawText, context)
            DebugInputType.json -> sanitizeJson(request.rawText, context)
            DebugInputType.log -> sanitizeLog(request.rawText, context)
        }
        val now = Instant.now()
        val artifact = store.saveArtifact(
            DebugArtifact(
                id = UUID.randomUUID(),
                sessionId = sessionId,
                inputType = request.inputType,
                sourceName = context.sourceName,
                sanitizedText = sanitized,
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
            ),
        )
        touch(sessionId)
        audit(sessionId, "memory_promoted", memory.id.toString())
        return memory
    }

    fun contextForMcp(sessionId: UUID): DebugSessionContext {
        val detail = detail(sessionId)
        return DebugSessionContext(
            session = detail.session,
            artifacts = detail.artifacts,
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
            artifacts = detail.artifacts,
            dataRequests = detail.dataRequests.map(::safeDataRequest),
            timeline = detail.auditEvents,
            notes = detail.notes,
        )
    }

    fun auditExport(sessionId: UUID, artifactId: UUID? = null) {
        requireSession(sessionId)
        audit(sessionId, "artifact_copied_exported", artifactId?.toString() ?: "instruction_or_sanitized_output")
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
        val rule = configuredRules[context.sourceName.lowercase()]?.get(normalized) ?: inferredRule(normalized)
        if (rule?.keep == true) return value
        if (rule?.token != null) return tokenFor(context, rule.token, context.sourceName, normalized, value)
        if (rule?.ref != null) {
            val (table, column) = rule.ref.split(".", limit = 2).let { it[0] to it.getOrElse(1) { "id" } }
            return tokenFor(context, tokenPrefixFor(table), table, column, value)
        }
        if (rule?.mask != null) {
            context.warnings.add(warningTypeForMask(rule.mask), "Detected ${rule.mask.lowercase()} value and replaced it with a token.", field)
            return tokenFor(context, rule.mask, context.sourceName, normalized, value)
        }

        when {
            emailRegex.matches(value) -> {
                context.warnings.add(DebugWarningType.email, "Detected email address and replaced it with a token.", field)
                return tokenFor(context, "EMAIL", context.sourceName, normalized.ifBlank { "email" }, value)
            }
            phoneRegex.matches(value) -> {
                context.warnings.add(DebugWarningType.phone, "Detected phone number and replaced it with a token.", field)
                return tokenFor(context, "PHONE", context.sourceName, normalized.ifBlank { "phone" }, value)
            }
            cardRegex.matches(value) -> {
                context.warnings.add(DebugWarningType.unknown_pii, "Possible payment card value was removed.", field)
                return tokenFor(context, "UNKNOWN", context.sourceName, normalized.ifBlank { "card" }, value)
            }
            ibanRegex.matches(value) -> {
                context.warnings.add(DebugWarningType.unknown_pii, "Possible IBAN value was removed.", field)
                return tokenFor(context, "UNKNOWN", context.sourceName, normalized.ifBlank { "iban" }, value)
            }
            ssnRegex.matches(value) -> {
                context.warnings.add(DebugWarningType.unknown_pii, "SSN-like value was removed.", field)
                return tokenFor(context, "SSN", context.sourceName, normalized.ifBlank { "ssn" }, value)
            }
            jwtRegex.matches(value) || apiKeyRegex.matches(value) -> {
                context.warnings.add(DebugWarningType.unknown_pii, "Secret-like value was removed.", field)
                return tokenFor(context, "SECRET", context.sourceName, normalized.ifBlank { "secret" }, value)
            }
            riskyColumns.any { normalized.contains(it) } -> {
                context.warnings.add(DebugWarningType.risky_column, "Column may contain sensitive data.", field)
                val sanitized = sanitizeFreeText(value, context, field)
                return when {
                    sanitized != value -> sanitized
                    context.mode == DebugSanitizerMode.strict -> tokenFor(context, "UNKNOWN", context.sourceName, normalized.ifBlank { "unknown" }, value)
                    else -> value
                }
            }
            addressRegex.containsMatchIn(value) -> {
                context.warnings.add(DebugWarningType.address, "Value may contain an address.", field)
                return tokenFor(context, "ADDRESS", context.sourceName, normalized.ifBlank { "address" }, value)
            }
            likelyPersonName(value, normalized) -> {
                context.warnings.add(DebugWarningType.person_name, "Value may contain a person name.", field)
                return tokenFor(context, "PERSON", context.sourceName, normalized.ifBlank { "name" }, value)
            }
            else -> return value
        }
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

    private fun tokenPrefixFor(table: String): String =
        when (table.lowercase().trim()) {
            "users", "user", "customer", "customers" -> "USER"
            "orders", "order" -> "ORDER"
            "payments", "payment" -> "PAYMENT"
            else -> table.uppercase().replace(Regex("""[^A-Z0-9]+"""), "_").trim('_').ifBlank { "UNKNOWN" }
        }

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
    )

    private data class FieldRule(
        val token: String? = null,
        val mask: String? = null,
        val ref: String? = null,
        val keep: Boolean = false,
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
        private val phoneRegex = Regex("""(?:\+?\d[\d\s().-]{7,}\d)""")
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
        private val sqlRealIdRegex = Regex("""\bwhere\s+[a-z_][a-z0-9_]*\s*=\s*(?:\d+|'[^']+')""", RegexOption.IGNORE_CASE)
        private val riskyColumns = listOf("email", "phone", "name", "address", "iban", "card", "ssn", "dob", "birth", "note", "comment", "description", "secret", "token", "api_key")
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
