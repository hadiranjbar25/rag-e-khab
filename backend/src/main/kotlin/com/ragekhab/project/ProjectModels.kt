package com.ragekhab.project

import java.time.Instant
import java.util.UUID

data class Project(
    val id: UUID,
    val name: String,
    val description: String?,
    val createdAt: Instant,
    val documentCount: Int = 0,
)

data class CreateProjectRequest(
    val name: String,
    val description: String? = null,
)
