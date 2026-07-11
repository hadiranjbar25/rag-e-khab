package com.ragekhab.context

data class ContextOptimizationRequest(
    val task: String,
    val projectId: String? = null,
    val repository: String? = null,
    val module: String? = null,
    val maxTokens: Int? = null,
    val candidateLimit: Int? = null,
    val targetTokens: Int? = null,
    val budgetProfile: String? = null,
)

data class ContextBudgetProfileDefinition(
    val name: String,
    val label: String,
    val maxTokens: Int,
    val description: String,
)

object ContextBudgetProfiles {
    val profiles = listOf(
        ContextBudgetProfileDefinition(
            name = "small",
            label = "Small",
            maxTokens = 1_200,
            description = "Fast, focused context for narrow edits and simple questions.",
        ),
        ContextBudgetProfileDefinition(
            name = "standard",
            label = "Standard",
            maxTokens = 3_000,
            description = "Default context for normal coding tasks.",
        ),
        ContextBudgetProfileDefinition(
            name = "deep",
            label = "Deep",
            maxTokens = 6_000,
            description = "Broader context for refactors, dependency chains, and unfamiliar code.",
        ),
    )

    fun resolve(name: String?): ContextBudgetProfileDefinition? {
        val normalized = name?.trim()?.lowercase()?.takeIf { it.isNotBlank() } ?: return null
        return profiles.firstOrNull { it.name == normalized }
    }
}

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
    val budgetProfile: String? = null,
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
