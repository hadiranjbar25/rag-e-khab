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
    fun search(query: String, limit: Int = 8, projectId: UUID? = null): List<SearchResult> =
        vectorIndex.search(query, limit, projectId)

    fun stats(): IndexStats = IndexStats(
        documentCount = repository.list().size,
        chunkCount = repository.allChunks().size,
        vectorStore = vectorIndex.status(),
        collection = properties.qdrant.collection,
    )
}
