package com.ragekhab.api

import com.ragekhab.debug.CreateDebugSessionRequest
import com.ragekhab.debug.CreateDebugDataRequest
import com.ragekhab.debug.DebugArtifact
import com.ragekhab.debug.DebugArtifactSlice
import com.ragekhab.debug.DebugDataRequest
import com.ragekhab.debug.DebugDataRequestCreated
import com.ragekhab.debug.DebugSession
import com.ragekhab.debug.DebugSessionDetail
import com.ragekhab.debug.DebugSessionService
import com.ragekhab.debug.DebugTokenMapping
import com.ragekhab.debug.PromoteDebugMemoryRequest
import com.ragekhab.debug.RecordAgentRequest
import com.ragekhab.debug.SanitizeDebugRequest
import com.ragekhab.debug.SanitizeDebugResponse
import com.ragekhab.memory.AgentMemory
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/debug-sessions")
class DebugSessionController(
    private val debugSessions: DebugSessionService,
) {
    @GetMapping
    fun list(@RequestParam(required = false, defaultValue = "false") includeArchived: Boolean): List<DebugSession> =
        debugSessions.list(includeArchived)

    @PostMapping
    fun create(@RequestBody request: CreateDebugSessionRequest): DebugSession =
        debugSessions.create(request.title)

    @GetMapping("/{sessionId}")
    fun detail(@PathVariable sessionId: UUID): DebugSessionDetail =
        debugSessions.detail(sessionId)

    @PostMapping("/{sessionId}/archive")
    fun archive(@PathVariable sessionId: UUID): DebugSession =
        debugSessions.archive(sessionId)

    @PostMapping("/{sessionId}/sanitize")
    fun sanitize(@PathVariable sessionId: UUID, @RequestBody request: SanitizeDebugRequest): SanitizeDebugResponse =
        debugSessions.sanitize(sessionId, request)

    @GetMapping("/{sessionId}/tokens/{token}")
    fun resolve(@PathVariable sessionId: UUID, @PathVariable token: String): DebugTokenMapping =
        debugSessions.resolveToken(sessionId, token)

    @PostMapping("/{sessionId}/agent-requests")
    fun recordAgentRequest(@PathVariable sessionId: UUID, @RequestBody request: RecordAgentRequest) =
        debugSessions.recordAgentRequest(sessionId, request.request)

    @PostMapping("/{sessionId}/claude-requests")
    fun recordClaudeRequest(@PathVariable sessionId: UUID, @RequestBody request: RecordAgentRequest) =
        debugSessions.recordAgentRequest(sessionId, request.request)

    @GetMapping("/{sessionId}/data-requests")
    fun dataRequests(@PathVariable sessionId: UUID) =
        debugSessions.listDataRequests(sessionId)

    @PostMapping("/{sessionId}/data-requests")
    fun createDataRequest(@PathVariable sessionId: UUID, @RequestBody request: CreateDebugDataRequest): DebugDataRequestCreated =
        debugSessions.createDataRequest(sessionId, request)

    @PostMapping("/{sessionId}/data-requests/{requestId}/complete")
    fun completeDataRequest(@PathVariable sessionId: UUID, @PathVariable requestId: UUID): DebugDataRequest =
        debugSessions.completeDataRequest(sessionId, requestId)

    @PostMapping("/{sessionId}/data-requests/{requestId}/reject")
    fun rejectDataRequest(@PathVariable sessionId: UUID, @PathVariable requestId: UUID): DebugDataRequest =
        debugSessions.rejectDataRequest(sessionId, requestId)

    @PostMapping("/{sessionId}/promote-memory")
    fun promoteMemory(@PathVariable sessionId: UUID, @RequestBody request: PromoteDebugMemoryRequest): AgentMemory =
        debugSessions.promoteMemory(sessionId, request)

    @PostMapping("/{sessionId}/exports")
    fun auditExport(@PathVariable sessionId: UUID, @RequestBody(required = false) request: DebugExportRequest?): Map<String, Boolean> {
        debugSessions.auditExport(sessionId, request?.artifactId)
        return mapOf("recorded" to true)
    }

    @GetMapping("/{sessionId}/artifacts/{artifactId}/slice")
    fun artifactSlice(
        @PathVariable sessionId: UUID,
        @PathVariable artifactId: UUID,
        @RequestParam beforeLine: Int,
        @RequestParam afterLine: Int,
    ): DebugArtifactSlice =
        debugSessions.artifactSlice(sessionId, artifactId, beforeLine, afterLine)
}

data class DebugExportRequest(val artifactId: UUID? = null)
