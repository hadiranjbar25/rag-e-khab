package com.ragekhab.search

import com.ragekhab.config.RagEKhabProperties
import com.ragekhab.document.DocumentRepository
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class SemanticSearchService(
    private val repository: DocumentRepository,
    private val properties: RagEKhabProperties,
    private val vectorIndex: VectorIndex,
) {
    fun search(query: String, limit: Int = 8, projectId: UUID? = null): List<SearchResult> {
        val terms = query.normalizedTerms()
        return vectorIndex.search(query, (limit * 3).coerceAtMost(90), projectId)
            .map { result ->
                val path = result.documentName.lowercase()
                val text = result.text.lowercase()
                val exactPathMatches = terms.count { it in path }
                val exactTextMatches = terms.count { Regex("""\b${Regex.escape(it)}\b""").containsMatchIn(text) }
                val lexicalBoost = (exactPathMatches * 0.12) + (exactTextMatches * 0.025)
                result.copy(score = result.score + lexicalBoost)
            }
            .sortedByDescending { it.score }
            .take(limit)
    }

    fun stats(): IndexStats = IndexStats(
        documentCount = repository.list().size,
        chunkCount = repository.allChunks().size,
        vectorStore = vectorIndex.status(),
        collection = properties.qdrant.collection,
    )

    private fun String.normalizedTerms(): Set<String> =
        lowercase()
            .split(Regex("[^a-z0-9_./-]+"))
            .flatMap { token -> token.split('/', '.', '-', '_') }
            .filter { it.length >= 3 }
            .toSet()
}
