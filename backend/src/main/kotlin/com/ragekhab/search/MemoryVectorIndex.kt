package com.ragekhab.search

import com.ragekhab.document.DocumentChunk
import org.springframework.stereotype.Component
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Component
class MemoryVectorIndex(private val embedder: EmbeddingService) : VectorIndex {
    private val indexed = ConcurrentHashMap<String, IndexedChunk>()

    override fun upsert(chunks: List<DocumentChunk>) {
        val signature = embedder.signature()
        chunks.forEach { chunk -> indexed[chunk.id] = IndexedChunk(chunk, embedder.embed(chunk.text), signature) }
    }

    override fun search(query: String, limit: Int, projectId: UUID?): List<SearchResult> {
        val vector = embedder.embed(query)
        val signature = embedder.signature()
        return indexed.values
            .asSequence()
            .filter { it.embeddingSignature == signature }
            .filter { projectId == null || it.chunk.projectId == projectId }
            .map { it.chunk.toResult(embedder.cosine(vector, it.vector)) }
            .filter { it.score > 0.0 }
            .sortedByDescending { it.score }
            .take(limit.coerceIn(1, 30))
            .toList()
    }

    override fun deleteDocument(documentId: UUID) {
        deleteDocuments(listOf(documentId))
    }

    override fun deleteDocuments(documentIds: Collection<UUID>) {
        val ids = documentIds.toSet()
        indexed.entries.removeIf { it.value.chunk.documentId in ids }
    }

    override fun reindex(chunks: List<DocumentChunk>) {
        indexed.clear()
        upsert(chunks)
    }

    override fun status(): String = "memory"

    private data class IndexedChunk(
        val chunk: DocumentChunk,
        val vector: List<Float>,
        val embeddingSignature: String,
    )
}
