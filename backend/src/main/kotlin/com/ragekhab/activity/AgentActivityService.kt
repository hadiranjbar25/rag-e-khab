package com.ragekhab.activity

import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

@Service
class AgentActivityService(
    private val store: AgentActivityStore,
) {
    fun record(request: RecordActivityRequest): AgentActivity =
        store.save(
            AgentActivity(
                id = UUID.randomUUID(),
                type = request.type.trim().ifBlank { "agent" },
                action = request.action.trim().ifBlank { "unknown" },
                detail = request.detail.trim().ifBlank { request.action },
                status = request.status,
                projectId = request.projectId,
                sessionId = request.sessionId,
                createdAt = Instant.now(),
            ),
        )

    fun list(limit: Int = 50): List<AgentActivity> = store.list(limit)
}
