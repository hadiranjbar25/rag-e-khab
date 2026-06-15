package com.ragekhab.document

import org.springframework.stereotype.Repository
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Repository
class DocumentRepository {
    private val documents = ConcurrentHashMap<UUID, KnowledgeDocument>()
    private val chunks = ConcurrentHashMap<UUID, List<DocumentChunk>>()

    fun save(document: KnowledgeDocument, documentChunks: List<DocumentChunk>): KnowledgeDocument {
        documents[document.id] = document
        chunks[document.id] = documentChunks
        return document
    }

    fun list(): List<KnowledgeDocument> = documents.values.sortedByDescending { it.createdAt }

    fun list(projectId: UUID): List<KnowledgeDocument> =
        documents.values.filter { it.projectId == projectId }.sortedByDescending { it.createdAt }

    fun get(id: UUID): DocumentDetail? {
        val document = documents[id] ?: return null
        return DocumentDetail(document, chunks[id].orEmpty())
    }

    fun allChunks(): List<DocumentChunk> = chunks.values.flatten()

    fun delete(id: UUID): Boolean {
        val removed = documents.remove(id) != null
        chunks.remove(id)
        return removed
    }

    fun clear() {
        documents.clear()
        chunks.clear()
    }
}
