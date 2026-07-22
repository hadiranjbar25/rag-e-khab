package com.ragekhab.document

import com.ragekhab.storage.AppStateStore
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class DocumentRepository(
    private val state: AppStateStore,
) {
    init {
        migrateLegacyDocuments()
    }

    fun save(document: KnowledgeDocument, documentChunks: List<DocumentChunk>): KnowledgeDocument {
        state.put(DOCUMENTS_STORE, document.id, document)
        state.put(CHUNKS_STORE, document.id, StoredDocumentChunks(documentChunks))
        return document
    }

    fun list(): List<KnowledgeDocument> =
        documents().sortedByDescending { it.createdAt }

    fun list(projectId: UUID): List<KnowledgeDocument> =
        documents().filter { it.projectId == projectId }.sortedByDescending { it.createdAt }

    fun ids(): Set<UUID> = documents().mapTo(mutableSetOf()) { it.id }

    fun get(id: UUID): DocumentDetail? {
        val document = state.get(DOCUMENTS_STORE, id, KnowledgeDocument::class.java) ?: return null
        val chunks = state.get(CHUNKS_STORE, id, StoredDocumentChunks::class.java)?.chunks.orEmpty()
        return DocumentDetail(document, chunks)
    }

    fun allChunks(): List<DocumentChunk> =
        state.list(CHUNKS_STORE, StoredDocumentChunks::class.java).flatMap { it.chunks }

    fun delete(id: UUID): Boolean {
        val deletedDocument = state.delete(DOCUMENTS_STORE, id)
        state.delete(CHUNKS_STORE, id)
        return deletedDocument
    }

    fun deleteAll(ids: Collection<UUID>): Int {
        if (ids.isEmpty()) return 0
        val deletedDocuments = state.deleteAll(DOCUMENTS_STORE, ids)
        state.deleteAll(CHUNKS_STORE, ids)
        return deletedDocuments
    }

    fun clear() {
        state.deleteStore(DOCUMENTS_STORE)
        state.deleteStore(CHUNKS_STORE)
        state.deleteStore(LEGACY_STORE)
    }

    fun countsByProject(): Map<UUID, Int> =
        documents().groupingBy { it.projectId }.eachCount()

    private fun documents(): List<KnowledgeDocument> =
        state.list(DOCUMENTS_STORE, KnowledgeDocument::class.java)

    private fun migrateLegacyDocuments() {
        if (state.isEmpty(LEGACY_STORE)) return
        state.list(LEGACY_STORE, StoredDocument::class.java).forEach { stored ->
            state.put(DOCUMENTS_STORE, stored.document.id, stored.document)
            state.put(CHUNKS_STORE, stored.document.id, StoredDocumentChunks(stored.chunks))
        }
        state.deleteStore(LEGACY_STORE)
    }

    private companion object {
        const val LEGACY_STORE = "documents"
        const val DOCUMENTS_STORE = "document-metadata"
        const val CHUNKS_STORE = "document-chunks"
    }
}

data class StoredDocument(
    val document: KnowledgeDocument,
    val chunks: List<DocumentChunk>,
)

data class StoredDocumentChunks(
    val chunks: List<DocumentChunk>,
)
