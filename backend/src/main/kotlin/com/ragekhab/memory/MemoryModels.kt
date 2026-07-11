package com.ragekhab.memory

import com.ragekhab.project.ProjectRepository
import java.time.Instant
import java.util.UUID

enum class MemoryType {
    ArchitectureDecision,
    CodingConvention,
    BugFix,
    ProjectKnowledge,
    DomainKnowledge,
    TechnicalDebt,
    Pattern,
}

data class AgentMemory(
    val id: UUID,
    val type: MemoryType,
    val content: String,
    val confidence: Double,
    val createdAt: Instant,
    val usageCount: Int = 0,
    val lastAccessedAt: Instant? = null,
    val repository: String? = null,
    val module: String? = null,
    val projectIds: List<UUID> = listOf(ProjectRepository.DEFAULT_PROJECT_ID),
    val freshness: MemoryFreshness = MemoryFreshness(),
)

enum class MemoryFreshnessStatus {
    current,
    stale,
}

data class MemoryFreshness(
    val status: MemoryFreshnessStatus = MemoryFreshnessStatus.current,
    val reason: String? = null,
    val changedFiles: List<String> = emptyList(),
    val newestChangeAt: Instant? = null,
)

data class RememberRequest(
    val type: MemoryType,
    val content: String,
    val confidence: Double = 0.85,
    val repository: String? = null,
    val module: String? = null,
    val projectId: UUID? = null,
    val global: Boolean = false,
)

data class RecallMemoryRequest(
    val task: String,
    val limit: Int = 8,
    val repository: String? = null,
    val module: String? = null,
    val type: MemoryType? = null,
    val projectId: UUID? = null,
)

data class RelevantMemory(
    val id: String,
    val type: MemoryType,
    val content: String,
    val relevanceScore: Double,
    val confidenceScore: Double,
    val createdAt: Instant,
    val usageCount: Int,
    val lastAccessedAt: Instant?,
    val repository: String? = null,
    val module: String? = null,
    val projectIds: List<UUID> = listOf(ProjectRepository.DEFAULT_PROJECT_ID),
    val freshness: MemoryFreshness = MemoryFreshness(),
)

data class RecallMemoryResponse(
    val relevantMemories: List<RelevantMemory>,
)
