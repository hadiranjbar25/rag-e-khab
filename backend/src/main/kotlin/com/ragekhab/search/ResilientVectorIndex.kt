package com.ragekhab.search

import com.ragekhab.document.DocumentChunk
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Component
import java.util.UUID

@Component
@Primary
class ResilientVectorIndex(
    private val qdrant: QdrantVectorIndex,
    private val memory: MemoryVectorIndex,
) : VectorIndex {
    private val logger = LoggerFactory.getLogger(javaClass)
    @Volatile private var qdrantHealthy = true

    override fun upsert(chunks: List<DocumentChunk>) {
        if (chunks.isEmpty()) return
        runCatching {
            qdrant.upsert(chunks)
            qdrantHealthy = true
        }.onFailure {
            markFallback("upsert", it)
            memory.upsert(chunks)
        }
    }

    override fun search(query: String, limit: Int, projectId: UUID?): List<SearchResult> =
        runCatching {
            qdrant.search(query, limit, projectId).also { qdrantHealthy = true }
        }.getOrElse {
            markFallback("search", it)
            memory.search(query, limit, projectId)
        }

    override fun deleteDocument(documentId: UUID) {
        deleteDocuments(listOf(documentId))
    }

    override fun deleteDocuments(documentIds: Collection<UUID>) {
        if (documentIds.isEmpty()) return
        runCatching {
            qdrant.deleteDocuments(documentIds)
            qdrantHealthy = true
        }.onFailure {
            markFallback("delete", it)
            memory.deleteDocuments(documentIds)
        }
    }

    override fun reindex(chunks: List<DocumentChunk>) {
        runCatching {
            qdrant.reindex(chunks)
            qdrantHealthy = true
        }.onFailure {
            markFallback("reindex", it)
            memory.reindex(chunks)
        }
    }

    override fun status(): String = if (qdrantHealthy) "qdrant" else "memory-fallback"

    private fun markFallback(operation: String, throwable: Throwable) {
        qdrantHealthy = false
        logger.warn("Qdrant {} failed; using lightweight in-memory fallback for this request", operation, throwable)
    }
}
