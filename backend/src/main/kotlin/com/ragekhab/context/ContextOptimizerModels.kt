package com.ragekhab.context

data class ContextOptimizationRequest(
    val task: String,
    val projectId: String? = null,
    val repository: String? = null,
    val module: String? = null,
    val maxTokens: Int? = null,
    val candidateLimit: Int? = null,
    val targetTokens: Int? = null,
)

data class OptimizedContext(
    val summary: String,
    val criticalContext: List<String>,
    val importantContext: List<String>,
    val optionalContext: List<String> = emptyList(),
    val sources: List<String>,
    val preview: List<ContextPreviewItem> = emptyList(),
    val estimatedTokens: Int,
    val tokenSavings: TokenSavingsReport,
    val cacheHit: Boolean = false,
    val compression: String = "deterministic",
)

data class ContextPreviewItem(
    val source: String,
    val documentId: String,
    val chunkId: String,
    val score: Double,
    val estimatedTokens: Int,
    val reason: String,
    val artifactKind: String? = null,
    val compressed: Boolean = false,
)

data class TokenSavingsReport(
    val candidateTokens: Int,
    val optimizedTokens: Int,
    val savedTokens: Int,
    val savingsPercent: Double,
    val maxTokens: Int,
)
