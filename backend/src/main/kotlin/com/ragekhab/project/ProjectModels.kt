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

data class DeleteProjectResult(
    val deleted: Boolean,
    val projectId: UUID,
    val projectName: String,
    val deletedDocuments: Int,
    val deletedRepositoryMetadata: Int,
    val deletedRepositoryLinks: Int = 0,
)

enum class WorkspaceHealthStatus {
    ready,
    review,
    setup,
}

data class WorkspaceHealthCheck(
    val name: String,
    val status: WorkspaceHealthStatus,
    val detail: String,
)

data class WorkspaceHealth(
    val projectId: UUID,
    val score: Int,
    val status: WorkspaceHealthStatus,
    val summary: String,
    val documentCount: Int,
    val chunkCount: Int,
    val memoryCount: Int,
    val staleMemoryCount: Int,
    val repositoryCount: Int,
    val recentlySyncedRepositoryCount: Int,
    val checks: List<WorkspaceHealthCheck>,
)
