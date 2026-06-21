package com.ragekhab.document

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.ragekhab.config.RagEKhabProperties
import org.springframework.stereotype.Repository
import java.nio.file.Files
import java.nio.file.Path
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Repository
class DocumentRepository(
    private val properties: RagEKhabProperties,
    private val mapper: ObjectMapper,
) {
    private val documents = ConcurrentHashMap<UUID, KnowledgeDocument>()
    private val chunks = ConcurrentHashMap<UUID, List<DocumentChunk>>()
    private val storagePath: Path = Path.of(properties.storageDir).resolve("documents.json")

    init {
        load()
    }

    fun save(document: KnowledgeDocument, documentChunks: List<DocumentChunk>): KnowledgeDocument {
        documents[document.id] = document
        chunks[document.id] = documentChunks
        persist()
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
        if (removed) persist()
        return removed
    }

    fun clear() {
        documents.clear()
        chunks.clear()
        persist()
    }

    private fun load() {
        if (!Files.exists(storagePath)) return
        runCatching {
            val items = mapper.readValue(Files.readString(storagePath), object : TypeReference<List<StoredDocument>>() {})
            items.forEach {
                documents[it.document.id] = it.document
                chunks[it.document.id] = it.chunks
            }
        }
    }

    private fun persist() {
        Files.createDirectories(storagePath.parent)
        val items = documents.values
            .sortedByDescending { it.createdAt }
            .map { StoredDocument(it, chunks[it.id].orEmpty()) }
        Files.writeString(storagePath, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(items))
    }
}

private data class StoredDocument(
    val document: KnowledgeDocument,
    val chunks: List<DocumentChunk>,
)
