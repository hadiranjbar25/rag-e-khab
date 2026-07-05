package com.ragekhab.document

import com.ragekhab.storage.AppStateStore
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class DocumentRepository(
    private val state: AppStateStore,
) {
    fun save(document: KnowledgeDocument, documentChunks: List<DocumentChunk>): KnowledgeDocument {
        state.put(STORE, document.id, StoredDocument(document, documentChunks))
        return document
    }

    fun list(): List<KnowledgeDocument> =
        stored().map { it.document }.sortedByDescending { it.createdAt }

    fun list(projectId: UUID): List<KnowledgeDocument> =
        stored().map { it.document }.filter { it.projectId == projectId }.sortedByDescending { it.createdAt }

    fun get(id: UUID): DocumentDetail? {
        val stored = state.get(STORE, id, StoredDocument::class.java) ?: return null
        return DocumentDetail(stored.document, stored.chunks)
    }

    fun allChunks(): List<DocumentChunk> = stored().flatMap { it.chunks }

    fun delete(id: UUID): Boolean = state.delete(STORE, id)

    fun clear() {
        state.deleteStore(STORE)
    }

    private fun stored(): List<StoredDocument> = state.list(STORE, StoredDocument::class.java)

    private companion object {
        const val STORE = "documents"
    }
}

data class StoredDocument(
    val document: KnowledgeDocument,
    val chunks: List<DocumentChunk>,
)
