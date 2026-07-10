package com.ragekhab.activity

import java.time.Instant
import java.util.UUID

enum class ActivityStatus {
    success,
    failure,
}

data class AgentActivity(
    val id: UUID,
    val type: String,
    val action: String,
    val detail: String,
    val status: ActivityStatus,
    val projectId: UUID? = null,
    val sessionId: UUID? = null,
    val createdAt: Instant,
)

data class RecordActivityRequest(
    val type: String,
    val action: String,
    val detail: String,
    val status: ActivityStatus = ActivityStatus.success,
    val projectId: UUID? = null,
    val sessionId: UUID? = null,
)
