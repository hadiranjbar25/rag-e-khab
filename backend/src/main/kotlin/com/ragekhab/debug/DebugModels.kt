package com.ragekhab.debug

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonValue
import com.ragekhab.memory.MemoryType
import java.time.Instant
import java.util.UUID

enum class DebugSessionStatus {
    active,
    archived,
}

enum class DebugInputType {
    csv,
    json,
    log,
}

enum class DebugSanitizerMode {
    strict,
    balanced,
    permissive,
}

enum class SanitizationAction {
    keep,
    remove,
    redact,
    tokenize,
    hash,
    truncate,
    generalize,
    warn,
}

enum class SanitizationProfileScope {
    built_in,
    project,
    session,
}

enum class SanitizationRuleMatchType {
    exact,
    glob,
    regex,
}

enum class SanitizationDataType {
    string,
    number,
    boolean,
    date,
    `object`,
    array,
}

enum class BuiltInRuleProtection {
    normal,
    protected,
    hard_blocked,
}

enum class UnknownFieldBehavior {
    remove,
    redact,
    warn,
    keep,
}

enum class DebugWarningType(private val wireName: String) {
    email("email"),
    phone("phone"),
    person_name("name"),
    address("address"),
    unknown_pii("unknown_pii"),
    risky_column("risky_column");

    @JsonValue
    fun json(): String = wireName

    companion object {
        @JvmStatic
        @JsonCreator
        fun from(value: String): DebugWarningType =
            entries.firstOrNull { it.wireName == value || it.name == value }
                ?: error("Unsupported debug warning type '$value'")
    }
}

enum class DebugDataRequestStatus {
    pending,
    completed,
    rejected,
}

data class DebugSession(
    val id: UUID,
    val title: String,
    val status: DebugSessionStatus,
    val createdAt: Instant,
    val updatedAt: Instant,
)

data class DebugTokenMapping(
    val sessionId: UUID,
    val token: String,
    val entityType: String,
    val table: String,
    val column: String,
    val realValue: String,
    val createdAt: Instant,
)

data class DebugArtifact(
    val id: UUID,
    val sessionId: UUID,
    val inputType: DebugInputType,
    val sourceName: String,
    val sanitizedText: String,
    val compactText: String? = null,
    val rawTokenEstimate: Int? = null,
    val compressedTokenEstimate: Int? = null,
    val reductionPercent: Int? = null,
    val profileName: String = "Balanced",
    val publishable: Boolean = true,
    val summary: SanitizationSummary = SanitizationSummary(),
    val audit: List<SanitizationAuditEntry> = emptyList(),
    val warningSummary: List<DebugWarning>,
    val dataRequestId: UUID? = null,
    val createdAt: Instant,
)

data class SanitizationSummary(
    val kept: Int = 0,
    val tokenized: Int = 0,
    val redacted: Int = 0,
    val removed: Int = 0,
    val hashed: Int = 0,
    val truncated: Int = 0,
    val generalized: Int = 0,
    val warnings: Int = 0,
)

data class SanitizationAuditEntry(
    val field: String,
    val action: SanitizationAction,
    val matchedRule: String,
    val source: SanitizationProfileScope,
    val originalDetectedType: String? = null,
    val result: String? = null,
    val blocking: Boolean = false,
)

data class SanitizationProfile(
    val id: String,
    val name: String,
    val description: String? = null,
    val scope: SanitizationProfileScope,
    val enabled: Boolean = true,
    val defaultAction: SanitizationAction = SanitizationAction.warn,
    val unknownFieldBehavior: UnknownFieldBehavior = UnknownFieldBehavior.warn,
    val strictMode: Boolean = false,
    val rules: List<SanitizationRule> = emptyList(),
    val detectors: List<SensitiveDataDetector> = emptyList(),
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = createdAt,
)

data class SanitizationRule(
    val id: String,
    val enabled: Boolean = true,
    val sourcePattern: String? = null,
    val fieldPattern: String,
    val matchType: SanitizationRuleMatchType = SanitizationRuleMatchType.exact,
    val dataType: SanitizationDataType? = null,
    val action: SanitizationAction,
    val tokenType: String? = null,
    val replacement: String? = null,
    val truncateLength: Int? = null,
    val generalizationStrategy: String? = null,
    val relation: SanitizationRelation? = null,
    val priority: Int = 0,
    val description: String? = null,
    val protection: BuiltInRuleProtection = BuiltInRuleProtection.normal,
)

data class SanitizationRelation(
    val entity: String,
    val canonicalField: String,
)

data class SensitiveDataDetector(
    val id: String,
    val name: String,
    val enabled: Boolean = true,
    val action: SanitizationAction,
    val pattern: String? = null,
    val confidenceThreshold: Double? = null,
    val replacementType: String? = null,
)

data class DebugWarning(
    val type: DebugWarningType,
    val message: String,
    val field: String? = null,
    val count: Int? = null,
)

data class DebugNote(
    val id: UUID,
    val sessionId: UUID,
    val request: String,
    val createdAt: Instant,
)

data class DebugAuditEvent(
    val id: UUID,
    val sessionId: UUID,
    val action: String,
    val detail: String,
    val createdAt: Instant,
)

data class DebugDataRequest(
    val id: UUID,
    val sessionId: UUID,
    val status: DebugDataRequestStatus,
    val entity: String,
    val relation: String? = null,
    val parentToken: String? = null,
    val reason: String,
    val requestedFields: List<String> = emptyList(),
    val suggestedSql: String? = null,
    val createdAt: Instant,
    val completedAt: Instant? = null,
)

data class CreateDebugSessionRequest(val title: String)

data class SanitizeDebugRequest(
    val inputType: DebugInputType,
    val sourceName: String,
    val rawText: String,
    val dataRequestId: UUID? = null,
    val mode: DebugSanitizerMode = DebugSanitizerMode.balanced,
    val projectProfile: SanitizationProfile? = null,
    val sessionProfile: SanitizationProfile? = null,
    val artifactProfile: SanitizationProfile? = null,
)

data class SanitizeDebugResponse(
    val session: DebugSession,
    val sanitizedText: String,
    val artifact: DebugArtifact,
    val warnings: List<DebugWarning>,
    val tokenMappings: List<DebugTokenMapping>,
)

data class DebugSessionDetail(
    val session: DebugSession,
    val tokenMappings: List<DebugTokenMapping>,
    val artifacts: List<DebugArtifact>,
    val dataRequests: List<DebugDataRequest>,
    val notes: List<DebugNote>,
    val auditEvents: List<DebugAuditEvent>,
    val memorySuggestions: List<DebugMemorySuggestion> = emptyList(),
)

data class DebugMemorySuggestion(
    val id: String,
    val type: MemoryType,
    val content: String,
    val confidence: Double,
    val reason: String,
)

data class RecordAgentRequest(val request: String)

data class CreateDebugDataRequest(
    val entity: String,
    val relation: String? = null,
    val parentToken: String? = null,
    val reason: String,
    val requestedFields: List<String> = emptyList(),
)

data class DebugDataRequestCreated(
    val id: UUID,
    val status: DebugDataRequestStatus,
)

data class PromoteDebugMemoryRequest(
    val type: MemoryType,
    val content: String,
    val confidence: Double = 0.9,
    val repository: String? = null,
    val module: String? = null,
    val projectId: UUID? = null,
    val global: Boolean = false,
)

data class DebugSessionContext(
    val session: DebugSession,
    val artifacts: List<DebugSafeArtifact>,
    val tokens: List<DebugSafeToken>,
    val dataRequests: List<DebugSafeDataRequest>,
    val notes: List<DebugNote>,
)

data class DebugSafeArtifact(
    val id: UUID,
    val sessionId: UUID,
    val inputType: DebugInputType,
    val sourceName: String,
    val sanitizedText: String,
    val compactText: String? = null,
    val rawTokenEstimate: Int? = null,
    val compressedTokenEstimate: Int? = null,
    val reductionPercent: Int? = null,
    val warningSummary: List<DebugWarning>,
    val dataRequestId: UUID? = null,
    val createdAt: Instant,
    val artifactId: UUID = id,
    val profileName: String,
    val sanitizedContent: String = sanitizedText,
    val summary: SanitizationSummary,
    val audit: List<SanitizationAuditEntry> = emptyList(),
)

data class DebugSafeToken(
    val token: String,
    val entityType: String,
    val table: String,
    val column: String,
    val createdAt: Instant,
)

data class DebugSafeDataRequest(
    val id: UUID,
    val sessionId: UUID,
    val status: DebugDataRequestStatus,
    val entity: String,
    val relation: String? = null,
    val parentToken: String? = null,
    val reason: String,
    val requestedFields: List<String> = emptyList(),
    val createdAt: Instant,
    val completedAt: Instant? = null,
)

data class DebugSessionState(
    val session: DebugSession,
    val artifacts: List<DebugSafeArtifact>,
    val dataRequests: List<DebugSafeDataRequest>,
    val timeline: List<DebugAuditEvent>,
    val notes: List<DebugNote>,
)

data class DebugArtifactSlice(
    val artifactId: UUID,
    val startLine: Int,
    val endLine: Int,
    val text: String,
)

enum class DebugArtifactDiffType {
    added,
    removed,
}

data class DebugArtifactReference(
    val id: UUID,
    val sourceName: String,
    val inputType: DebugInputType,
    val createdAt: Instant,
    val lineCount: Int,
)

data class DebugArtifactDiffLine(
    val type: DebugArtifactDiffType,
    val lineNumber: Int,
    val text: String,
)

data class DebugArtifactComparison(
    val left: DebugArtifactReference,
    val right: DebugArtifactReference,
    val summary: String,
    val unchangedLineCount: Int,
    val totalChangedLines: Int,
    val addedLines: List<DebugArtifactDiffLine>,
    val removedLines: List<DebugArtifactDiffLine>,
)
