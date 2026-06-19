package com.ragekhab.context

import com.ragekhab.config.RuntimeSettingsService
import org.springframework.stereotype.Service
import java.util.concurrent.ConcurrentHashMap

@Service
class ContextOptimizerService(
    private val settingsService: RuntimeSettingsService,
    optimizers: List<ModeAwareContextOptimizer>,
) : ContextOptimizer {
    private val cache = ConcurrentHashMap<String, OptimizedContext>()
    private val byMode = optimizers.associateBy { it.mode }

    override fun optimize(request: ContextOptimizationRequest): OptimizedContext {
        val settings = settingsService.current()
        val maxTokens = (request.maxTokens ?: request.targetTokens ?: settings.optimizer.maxTokens).coerceIn(300, 8_000)
        val cacheKey = listOf(
            selectedMode().name,
            request.task.cacheKey(),
            request.repository.orEmpty(),
            request.module.orEmpty(),
            request.projectId.orEmpty(),
            maxTokens.toString(),
        ).joinToString("|")

        cache[cacheKey]?.takeIf { it.estimatedTokens <= maxTokens }?.let { return it.copy(cacheHit = true) }

        val result = when (selectedMode()) {
            ContextOptimizerMode.Retrieval -> optimizer(ContextOptimizerMode.Retrieval).optimize(request)
            ContextOptimizerMode.Compression -> optimizer(ContextOptimizerMode.Compression).optimize(request)
        }
        remember(cacheKey, result)
        return result
    }

    private fun selectedMode(): ContextOptimizerMode =
        ContextOptimizerMode.from(settingsService.current().optimizer.mode)

    private fun optimizer(mode: ContextOptimizerMode): ModeAwareContextOptimizer =
        byMode[mode] ?: error("No context optimizer registered for mode $mode")

    private fun remember(key: String, result: OptimizedContext) {
        if (cache.size > 100) {
            cache.keys.take(25).forEach(cache::remove)
        }
        cache[key] = result
    }

    private fun String.cacheKey(): String =
        lowercase()
            .split(Regex("[^a-z0-9_./-]+"))
            .filter { it.length >= 3 }
            .sorted()
            .joinToString("-")
            .take(160)
}

@Service
class RetrievalOnlyContextOptimizer(
    private val pipeline: ContextOptimizationPipeline,
) : ModeAwareContextOptimizer {
    override val mode = ContextOptimizerMode.Retrieval

    override fun optimize(request: ContextOptimizationRequest): OptimizedContext {
        val draft = pipeline.prepare(request)
        return pipeline.toOptimizedContext(
            draft = draft,
            sections = pipeline.retrievalSections(draft),
            compression = "retrieval-only",
        )
    }
}

@Service
class CompressionContextOptimizer(
    private val pipeline: ContextOptimizationPipeline,
    private val compressionService: ContextCompressionService,
) : ModeAwareContextOptimizer {
    override val mode = ContextOptimizerMode.Compression

    override fun optimize(request: ContextOptimizationRequest): OptimizedContext {
        val draft = pipeline.prepare(request)
        val compressed = compressionService.compress(draft.task, draft.selected.map { it.result }, draft.maxTokens)
        val sections = compressed?.let {
            ContextSections(
                summary = it.summary,
                critical = it.criticalContext.distinct(),
                important = it.importantContext.distinct(),
                optional = it.optionalContext.distinct(),
            )
        } ?: pipeline.retrievalSections(draft)

        return pipeline.toOptimizedContext(
            draft = draft,
            sections = sections,
            compression = compressed?.let { "local-llm:${compressionService.providerName}" } ?: "retrieval-fallback",
        )
    }
}
