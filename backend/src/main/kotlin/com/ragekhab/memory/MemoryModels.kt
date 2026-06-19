package com.ragekhab.memory

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
)

data class RememberRequest(
    val type: MemoryType,
    val content: String,
    val confidence: Double = 0.85,
    val repository: String? = null,
    val module: String? = null,
)

data class RecallMemoryRequest(
    val task: String,
    val limit: Int = 8,
    val repository: String? = null,
    val module: String? = null,
    val type: MemoryType? = null,
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
)

data class RecallMemoryResponse(
    val relevantMemories: List<RelevantMemory>,
)
