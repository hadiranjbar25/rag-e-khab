package com.ragekhab.context

import com.ragekhab.config.RagEKhabProperties
import com.ragekhab.config.RuntimeSettingsService
import com.ragekhab.project.ProjectService
import com.ragekhab.search.SearchResult
import com.ragekhab.search.SemanticSearchService
import org.springframework.stereotype.Component
import java.util.UUID
import kotlin.math.ln
import kotlin.math.roundToInt

@Component
class ContextOptimizationPipeline(
    private val searchService: SemanticSearchService,
    private val projectService: ProjectService,
    private val properties: RagEKhabProperties,
    private val settingsService: RuntimeSettingsService,
) {
    fun prepare(request: ContextOptimizationRequest): ContextOptimizationDraft {
        val task = request.task.trim()
        require(task.isNotBlank()) { "Task must not be blank." }

        val maxTokens = (request.maxTokens ?: request.targetTokens ?: settingsService.current().optimizer.maxTokens).coerceIn(300, 8_000)
        val scope = request.repository?.trim()?.takeIf { it.isNotBlank() }
        val module = request.module?.trim()?.takeIf { it.isNotBlank() }
        val projectId = resolveProjectId(request.projectId, scope, module)
        val candidateLimit = (request.candidateLimit ?: 30).coerceIn(8, 30)
        val candidates = searchService.search(task, candidateLimit, projectId)
            .filterByScope(scope, module)
        val taskTerms = task.normalizedTerms()
        val ranked = candidates
            .distinctByContent()
            .map { it.toCandidate(taskTerms) }
            .filter { it.valueScore >= 0.16 }
            .sortedWith(compareByDescending<OptimizedCandidate> { it.valueScore }.thenBy { it.result.documentName })
        val selected = selectWithinBudget(ranked, maxTokens)

        return ContextOptimizationDraft(
            task = task,
            repository = scope,
            module = module,
            maxTokens = maxTokens,
            taskTerms = taskTerms,
            candidates = candidates,
            selected = selected,
        )
    }

    fun retrievalSections(draft: ContextOptimizationDraft): ContextSections =
        ContextSections(
            summary = buildSummary(draft.task, draft.selected),
            critical = draft.selected.take(5).map { it.toContextLine(draft.taskTerms, critical = true) }.distinct(),
            important = draft.selected.drop(5).take(7).map { it.toContextLine(draft.taskTerms, critical = false) }.distinct(),
            optional = draft.selected.drop(12).take(6).map { it.toContextLine(draft.taskTerms, critical = false) }.distinct(),
        )

    fun toOptimizedContext(draft: ContextOptimizationDraft, sections: ContextSections, compression: String, cacheHit: Boolean = false): OptimizedContext {
        val budgeted = fitToBudget(sections, draft.maxTokens)
        val sourceCandidates = draft.selected
            .map { it.result.documentName }
            .distinct()
            .ifEmpty { draft.candidates.map { it.documentName }.distinct() }
        val sources = fitSources(sourceCandidates, budgeted, draft.maxTokens)
        val candidateTokens = draft.candidates.sumOf { it.text.estimatedTokens() }
        val optimizedTokens = estimatePayloadTokens(budgeted, sources)
        return OptimizedContext(
            summary = budgeted.summary.ifBlank { buildSummary(draft.task, draft.selected) },
            criticalContext = budgeted.critical,
            importantContext = budgeted.important,
            optionalContext = budgeted.optional,
            sources = sources,
            estimatedTokens = optimizedTokens,
            tokenSavings = savings(candidateTokens, optimizedTokens, draft.maxTokens),
            cacheHit = cacheHit,
            compression = compression,
        )
    }

    private fun resolveProjectId(projectId: String?, repository: String?, module: String?): UUID? {
        projectId?.takeIf { it.isNotBlank() }?.let {
            return runCatching { UUID.fromString(it) }
                .getOrElse { throw IllegalArgumentException("projectId must be a valid UUID.") }
        }
        val scope = repository ?: module ?: return null
        return projectService.list()
            .firstOrNull { it.name.equals(scope, ignoreCase = true) }
            ?.id
    }

    private fun List<SearchResult>.filterByScope(repository: String?, module: String?): List<SearchResult> {
        val filters = listOfNotNull(repository, module).map { it.lowercase() }
        if (filters.isEmpty()) return this
        val filtered = filter { result ->
            filters.any { filter ->
                result.projectName.lowercase().contains(filter) ||
                    result.documentName.lowercase().contains(filter) ||
                    result.text.lowercase().contains(filter)
            }
        }
        return filtered.ifEmpty { this }
    }

    private fun List<SearchResult>.distinctByContent(): List<SearchResult> {
        val seen = mutableSetOf<String>()
        return filter { result ->
            val fingerprint = result.text.lowercase().replace(Regex("\\s+"), " ").take(500)
            seen.add(fingerprint)
        }
    }

    private fun SearchResult.toCandidate(taskTerms: Set<String>): OptimizedCandidate {
        val textTerms = text.normalizedTerms()
        val overlap = if (taskTerms.isEmpty()) 0.0 else taskTerms.count { it in textTerms }.toDouble() / taskTerms.size
        val pathBoost = documentName.normalizedTerms().count { it in taskTerms } * 0.08
        val structureBoost = when {
            documentName.endsWith(".kt", ignoreCase = true) -> 0.08
            documentName.endsWith(".java", ignoreCase = true) -> 0.08
            documentName.endsWith(".md", ignoreCase = true) -> 0.06
            else -> 0.0
        }
        val densityPenalty = ln((text.length.coerceAtLeast(120)).toDouble() / 120.0) * 0.03
        return OptimizedCandidate(this, textTerms, (score * 0.58) + (overlap * 0.34) + pathBoost + structureBoost - densityPenalty)
    }

    private fun selectWithinBudget(candidates: List<OptimizedCandidate>, maxTokens: Int): List<OptimizedCandidate> {
        val selected = mutableListOf<OptimizedCandidate>()
        val coveredTerms = mutableSetOf<String>()
        var tokenEstimate = 120
        val candidateBudget = (maxTokens * 1.7).roundToInt().coerceAtLeast(maxTokens)

        candidates.forEach { candidate ->
            val novelty = candidate.terms.count { coveredTerms.add(it) }
            val hasRoom = tokenEstimate + candidate.result.text.estimatedTokens() <= candidateBudget
            val shouldKeep = selected.size < 3 || novelty >= 3 || candidate.valueScore >= 0.55
            if (hasRoom && shouldKeep) {
                selected += candidate
                tokenEstimate += candidate.result.text.estimatedTokens().coerceAtMost(240)
            }
        }
        return selected.ifEmpty { candidates.take(3) }
    }

    private fun fitToBudget(sections: ContextSections, maxTokens: Int): ContextSections {
        val summary = sections.summary.compressLine(70)
        val critical = mutableListOf<String>()
        val important = mutableListOf<String>()
        val optional = mutableListOf<String>()
        var used = summary.estimatedTokens() + 80

        fun addLines(lines: List<String>, target: MutableList<String>, maxLineTokens: Int) {
            lines.forEach { line ->
                val compressed = line.compressLine(maxLineTokens)
                val tokens = compressed.estimatedTokens()
                if (used + tokens <= maxTokens) {
                    target += compressed
                    used += tokens
                }
            }
        }

        addLines(sections.critical, critical, 80)
        addLines(sections.important, important, 60)
        addLines(sections.optional, optional, 45)
        return sections.copy(summary = summary, critical = critical, important = important, optional = optional)
    }

    private fun fitSources(sources: List<String>, sections: ContextSections, maxTokens: Int): List<String> {
        val selected = mutableListOf<String>()
        var used = estimatePayloadTokens(sections, emptyList())
        sources.take(10).forEach { source ->
            val tokens = source.estimatedTokens()
            if (used + tokens <= maxTokens) {
                selected += source
                used += tokens
            }
        }
        return selected
    }

    private fun OptimizedCandidate.toContextLine(taskTerms: Set<String>, critical: Boolean): String {
        val source = result.documentName.removeSuffix(".txt")
        val sentence = result.text
            .split(Regex("(?<=[.!?])\\s+|\\n+"))
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .maxByOrNull { sentence -> sentence.normalizedTerms().count { it in taskTerms } }
            ?: result.text.trim()
        val compressed = sentence.replace(Regex("\\s+"), " ").trim()
            .take(if (critical) 220 else 180)
            .trimEnd(',', ';', ':', '-')
        return "$source: $compressed"
    }

    private fun buildSummary(task: String, selected: List<OptimizedCandidate>): String {
        val top = selected.firstOrNull()?.result
        return if (top == null) {
            "No indexed context was found for task: $task."
        } else {
            "Most relevant context for '$task' is concentrated in ${top.documentName}; ${selected.map { it.result.documentName }.distinct().size} source(s) selected for Claude Code."
        }
    }

    private fun estimatePayloadTokens(sections: ContextSections, sources: List<String>): Int =
        listOf(sections.summary, sections.critical.joinToString("\n"), sections.important.joinToString("\n"), sections.optional.joinToString("\n"), sources.joinToString("\n"))
            .joinToString("\n")
            .estimatedTokens()

    private fun savings(candidateTokens: Int, optimizedTokens: Int, maxTokens: Int): TokenSavingsReport {
        val saved = (candidateTokens - optimizedTokens).coerceAtLeast(0)
        val percent = if (candidateTokens == 0) 0.0 else (saved.toDouble() / candidateTokens.toDouble() * 100.0)
        return TokenSavingsReport(candidateTokens, optimizedTokens, saved, (percent * 10.0).roundToInt() / 10.0, maxTokens)
    }

    private fun String.normalizedTerms(): Set<String> =
        lowercase()
            .split(Regex("[^a-z0-9_./-]+"))
            .map { it.trim('.', '/', '-', '_') }
            .filter { it.length >= 3 && it !in stopWords }
            .toSet()

    private fun String.estimatedTokens(): Int =
        (length / 4.0).toInt().coerceAtLeast(if (isBlank()) 0 else 1)

    private fun String.compressLine(maxTokens: Int): String {
        val maxChars = maxTokens * 4
        return replace(Regex("\\s+"), " ")
            .trim()
            .let { if (it.length <= maxChars) it else it.take(maxChars).trimEnd(',', ';', ':', '-', ' ') }
    }

    private companion object {
        val stopWords = setOf(
            "the", "and", "for", "with", "from", "this", "that", "are", "was", "were", "will", "can",
            "should", "would", "could", "into", "onto", "has", "have", "had", "not", "but", "you",
            "your", "its", "api", "add", "fix", "use", "used", "using",
        )
    }
}

data class ContextOptimizationDraft(
    val task: String,
    val repository: String?,
    val module: String?,
    val maxTokens: Int,
    val taskTerms: Set<String>,
    val candidates: List<SearchResult>,
    val selected: List<OptimizedCandidate>,
)

data class OptimizedCandidate(
    val result: SearchResult,
    val terms: Set<String>,
    val valueScore: Double,
)

data class ContextSections(
    val summary: String,
    val critical: List<String>,
    val important: List<String>,
    val optional: List<String>,
)
