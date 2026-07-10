package com.ragekhab.project

import com.ragekhab.document.DocumentRepository
import com.ragekhab.memory.MemoryFreshnessStatus
import com.ragekhab.memory.MemoryService
import com.ragekhab.repository.RepositoryCatalogStore
import org.springframework.stereotype.Service
import java.time.Duration
import java.time.Instant
import java.util.UUID

@Service
class ProjectHealthService(
    private val projectService: ProjectService,
    private val documentRepository: DocumentRepository,
    private val memoryService: MemoryService,
    private val repositoryCatalog: RepositoryCatalogStore,
) {
    fun health(projectId: UUID): WorkspaceHealth {
        val project = projectService.requireProject(projectId)
        val documents = documentRepository.list(project.id)
        val memories = memoryService.list(project.id)
        val repositories = repositoryCatalog.linksForProject(project.id).mapNotNull { repositoryCatalog.get(it.repositoryId) }
        val now = Instant.now()
        val recentRepositories = repositories.count { repository ->
            repository.lastSyncedAt?.let { Duration.between(it, now).toDays() <= RECENT_SYNC_DAYS } == true
        }
        val staleMemories = memories.count { it.freshness.status == MemoryFreshnessStatus.stale }
        val chunkCount = documents.sumOf { it.chunkCount }

        val sourceScore = when {
            chunkCount >= 10 -> 25
            chunkCount > 0 -> 15
            else -> 0
        }
        val memoryScore = when {
            memories.size >= 5 -> 25
            memories.isNotEmpty() -> 15
            else -> 0
        }
        val repositoryScore = when {
            repositories.isEmpty() -> 0
            recentRepositories == repositories.size -> 25
            recentRepositories > 0 -> 15
            else -> 8
        }
        val freshnessScore = when {
            memories.isEmpty() -> 10
            staleMemories == 0 -> 25
            staleMemories < memories.size -> 15
            else -> 5
        }

        val score = (sourceScore + memoryScore + repositoryScore + freshnessScore).coerceIn(0, 100)
        val status = when {
            score >= 75 && staleMemories == 0 -> WorkspaceHealthStatus.ready
            score >= 45 -> WorkspaceHealthStatus.review
            else -> WorkspaceHealthStatus.setup
        }

        return WorkspaceHealth(
            projectId = project.id,
            score = score,
            status = status,
            summary = summary(status, staleMemories, repositories.size, documents.size, memories.size),
            documentCount = documents.size,
            chunkCount = chunkCount,
            memoryCount = memories.size,
            staleMemoryCount = staleMemories,
            repositoryCount = repositories.size,
            recentlySyncedRepositoryCount = recentRepositories,
            checks = listOf(
                WorkspaceHealthCheck("Sources", checkStatus(sourceScore), "$chunkCount indexed source units across ${documents.size} sources."),
                WorkspaceHealthCheck("Memories", checkStatus(memoryScore), "${memories.size} durable memories available to agents."),
                WorkspaceHealthCheck("Repositories", checkStatus(repositoryScore), "$recentRepositories of ${repositories.size} linked repositories synced in the last $RECENT_SYNC_DAYS days."),
                WorkspaceHealthCheck("Freshness", checkStatus(freshnessScore), "$staleMemories memories need review after repository changes."),
            ),
        )
    }

    private fun checkStatus(score: Int): WorkspaceHealthStatus =
        when {
            score >= 25 -> WorkspaceHealthStatus.ready
            score > 0 -> WorkspaceHealthStatus.review
            else -> WorkspaceHealthStatus.setup
        }

    private fun summary(
        status: WorkspaceHealthStatus,
        staleMemories: Int,
        repositories: Int,
        documents: Int,
        memories: Int,
    ): String =
        when {
            status == WorkspaceHealthStatus.ready -> "Ready for agents."
            staleMemories > 0 -> "$staleMemories memories need review before agents rely on them."
            repositories == 0 -> "Link a repository so agents can use code-aware context."
            documents == 0 -> "Add sources or sync a repository to improve retrieval."
            memories == 0 -> "Add workspace memories for conventions and recurring lessons."
            else -> "Workspace is usable, but more context would improve agent answers."
        }

    private companion object {
        const val RECENT_SYNC_DAYS = 14L
    }
}
