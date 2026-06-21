package com.ragekhab.memory

import com.ragekhab.document.DocumentChunk
import com.ragekhab.project.ProjectRepository
import com.ragekhab.search.SearchResult
import com.ragekhab.search.VectorIndex
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Service
import java.time.Duration
import java.time.Instant
import java.util.UUID
import kotlin.math.ln
import kotlin.math.roundToInt

@Service
class MemoryService(
    private val repository: MemoryRepository,
    private val vectorIndex: VectorIndex,
) {
    @EventListener(ApplicationReadyEvent::class)
    fun indexStoredMemories() {
        vectorIndex.upsert(repository.list().map { it.toChunk() })
    }

    fun remember(request: RememberRequest): AgentMemory {
        val content = request.content.trim()
        require(content.isNotBlank()) { "Memory content must not be blank." }

        val memory = AgentMemory(
            id = UUID.randomUUID(),
            type = request.type,
            content = content,
            confidence = request.confidence.coerceIn(0.0, 1.0),
            createdAt = Instant.now(),
            repository = request.repository?.trim()?.takeIf { it.isNotBlank() },
            module = request.module?.trim()?.takeIf { it.isNotBlank() },
            projectIds = listOf(request.projectId ?: ProjectRepository.DEFAULT_PROJECT_ID),
        )
        repository.save(memory)
        vectorIndex.upsert(listOf(memory.toChunk()))
        return memory
    }

    fun recall(request: RecallMemoryRequest): RecallMemoryResponse {
        val task = request.task.trim()
        require(task.isNotBlank()) { "Task must not be blank." }

        val limit = request.limit.coerceIn(1, 20)
        val vectorMatches = vectorIndex.search(task, 30)
            .mapNotNull { result ->
                val memoryId = result.memoryId() ?: return@mapNotNull null
                val memory = repository.get(memoryId) ?: return@mapNotNull null
                if (!memory.matches(request)) return@mapNotNull null
                RankedMemory(memory, result.score, task)
            }

        val ranked = vectorMatches
            .ifEmpty { fallbackRank(task, request) }
            .distinctBy { it.memory.id }
            .sortedByDescending { it.finalScore }
            .take(limit)

        val now = Instant.now()
        val updated = ranked.map { rankedMemory ->
            val accessed = rankedMemory.memory.copy(
                usageCount = rankedMemory.memory.usageCount + 1,
                lastAccessedAt = now,
            )
            repository.save(accessed)
            rankedMemory.copy(memory = accessed)
        }

        return RecallMemoryResponse(updated.map { it.toRelevantMemory() })
    }

    fun list(projectId: UUID? = null): List<AgentMemory> =
        repository.list().filter { memory ->
            projectId == null || projectId in memory.normalizedProjectIds()
        }

    fun linkToProject(memoryId: UUID, projectId: UUID): AgentMemory {
        val memory = repository.get(memoryId) ?: error("Memory not found.")
        val updated = memory.copy(projectIds = (memory.normalizedProjectIds() + projectId).distinct())
        repository.save(updated)
        vectorIndex.upsert(listOf(updated.toChunk()))
        return updated
    }

    fun unlinkFromProject(memoryId: UUID, projectId: UUID): AgentMemory {
        val memory = repository.get(memoryId) ?: error("Memory not found.")
        val remaining = memory.normalizedProjectIds().filter { it != projectId }
        val updated = memory.copy(projectIds = remaining.ifEmpty { listOf(ProjectRepository.DEFAULT_PROJECT_ID) })
        repository.save(updated)
        vectorIndex.upsert(listOf(updated.toChunk()))
        return updated
    }

    fun delete(id: UUID): Boolean {
        val deleted = repository.delete(id)
        if (deleted) vectorIndex.deleteDocument(id)
        return deleted
    }

    private fun fallbackRank(task: String, request: RecallMemoryRequest): List<RankedMemory> {
        val taskTerms = task.normalizedTerms()
        return repository.list()
            .asSequence()
            .filter { it.matches(request) }
            .map { memory ->
                val overlap = memory.searchText().normalizedTerms().let { terms ->
                    if (taskTerms.isEmpty()) 0.0 else taskTerms.count { it in terms }.toDouble() / taskTerms.size
                }
                RankedMemory(memory, overlap, task)
            }
            .filter { it.vectorScore > 0.0 }
            .toList()
    }

    private fun AgentMemory.matches(request: RecallMemoryRequest): Boolean {
        if (request.type != null && type != request.type) return false
        val repositoryFilter = request.repository?.trim()?.lowercase()?.takeIf { it.isNotBlank() }
        if (repositoryFilter != null && repository?.lowercase() != repositoryFilter) return false
        val moduleFilter = request.module?.trim()?.lowercase()?.takeIf { it.isNotBlank() }
        if (moduleFilter != null && module?.lowercase() != moduleFilter) return false
        if (request.projectId != null && request.projectId !in normalizedProjectIds()) return false
        return true
    }

    private fun AgentMemory.toChunk(): DocumentChunk =
        DocumentChunk(
            id = memoryChunkId(id),
            projectId = normalizedProjectIds().firstOrNull() ?: ProjectRepository.DEFAULT_PROJECT_ID,
            projectName = ProjectRepository.DEFAULT_PROJECT_NAME,
            documentId = id,
            documentName = "memory-${type.name}-$id",
            pageNumber = null,
            text = searchText(),
        )

    private fun AgentMemory.searchText(): String =
        listOfNotNull(
            "Type: ${type.name}",
            "Projects: ${normalizedProjectIds().joinToString()}",
            repository?.let { "Repository: $it" },
            module?.let { "Module: $it" },
            content,
        ).joinToString("\n")

    private fun AgentMemory.normalizedProjectIds(): List<UUID> =
        projectIds.ifEmpty { listOf(ProjectRepository.DEFAULT_PROJECT_ID) }

    private fun SearchResult.memoryId(): UUID? =
        chunkId.removePrefix(MEMORY_CHUNK_PREFIX)
            .takeIf { it != chunkId }
            ?.let { runCatching { UUID.fromString(it) }.getOrNull() }

    private fun RankedMemory.toRelevantMemory(): RelevantMemory =
        RelevantMemory(
            id = memory.id.toString(),
            type = memory.type,
            content = memory.content,
            relevanceScore = finalScore.roundScore(),
            confidenceScore = memory.confidence.roundScore(),
            createdAt = memory.createdAt,
            usageCount = memory.usageCount,
            lastAccessedAt = memory.lastAccessedAt,
            repository = memory.repository,
            module = memory.module,
            projectIds = memory.normalizedProjectIds(),
        )

    private fun String.normalizedTerms(): Set<String> =
        lowercase()
            .split(Regex("[^a-z0-9_./-]+"))
            .map { it.trim('.', '/', '-', '_') }
            .filter { it.length >= 3 && it !in stopWords }
            .toSet()

    private fun Double.roundScore(): Double =
        (this * 10_000.0).roundToInt() / 10_000.0

    private data class RankedMemory(
        val memory: AgentMemory,
        val vectorScore: Double,
        val task: String,
    ) {
        val finalScore: Double
            get() {
                val usageBoost = ln((memory.usageCount + 1).toDouble()) * 0.06
                val accessedAt = memory.lastAccessedAt ?: memory.createdAt
                val ageDays = Duration.between(accessedAt, Instant.now()).toDays().coerceAtLeast(0)
                val recencyBoost = 0.12 / (1.0 + ageDays)
                val exactTypeBoost = if (task.normalizedTypeHint() == memory.type.name.lowercase()) 0.08 else 0.0
                return (vectorScore * 0.68) + (memory.confidence * 0.14) + usageBoost + recencyBoost + exactTypeBoost
            }

        private fun String.normalizedTypeHint(): String =
            lowercase().split(Regex("[^a-z]+")).firstOrNull().orEmpty()
    }

    private companion object {
        const val MEMORY_CHUNK_PREFIX = "memory:"

        fun memoryChunkId(id: UUID): String = "$MEMORY_CHUNK_PREFIX$id"

        val stopWords = setOf(
            "the", "and", "for", "with", "from", "this", "that", "are", "was", "were", "will", "can",
            "should", "would", "could", "into", "onto", "has", "have", "had", "not", "but", "you",
            "your", "its", "api", "add", "fix", "use", "used", "using", "task",
        )
    }
}
