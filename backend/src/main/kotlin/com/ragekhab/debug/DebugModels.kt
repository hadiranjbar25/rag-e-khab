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
    val warningSummary: List<DebugWarning>,
    val dataRequestId: UUID? = null,
    val createdAt: Instant,
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
    val artifacts: List<DebugArtifact>,
    val tokens: List<DebugSafeToken>,
    val dataRequests: List<DebugSafeDataRequest>,
    val notes: List<DebugNote>,
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
    val artifacts: List<DebugArtifact>,
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
