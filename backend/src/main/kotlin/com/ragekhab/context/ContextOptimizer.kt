package com.ragekhab.context

interface ContextOptimizer {
    fun optimize(request: ContextOptimizationRequest): OptimizedContext
}

interface ModeAwareContextOptimizer : ContextOptimizer {
    val mode: ContextOptimizerMode
}

enum class ContextOptimizerMode {
    Retrieval,
    Compression;

    companion object {
        fun from(value: String): ContextOptimizerMode =
            entries.firstOrNull { it.name.equals(value, ignoreCase = true) }
                ?: error("Unsupported optimizer mode '$value'. Use retrieval or compression.")
    }
}
