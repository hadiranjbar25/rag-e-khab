package com.ragekhab.search

import com.ragekhab.document.DocumentChunk
import java.util.UUID

interface VectorIndex {
    fun upsert(chunks: List<DocumentChunk>)
    fun search(query: String, limit: Int, projectId: UUID? = null): List<SearchResult>
    fun deleteDocument(documentId: UUID)
    fun reindex(chunks: List<DocumentChunk>)
    fun status(): String
}
