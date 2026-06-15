package com.ragekhab.document

import java.time.Instant
import java.util.UUID

enum class DocumentFormat {
    PDF,
    MARKDOWN,
    TEXT,
}

data class KnowledgeDocument(
    val id: UUID,
    val projectId: UUID,
    val projectName: String,
    val name: String,
    val format: DocumentFormat,
    val contentType: String,
    val sizeBytes: Long,
    val createdAt: Instant,
    val chunkCount: Int,
)

data class DocumentChunk(
    val id: String,
    val projectId: UUID,
    val projectName: String,
    val documentId: UUID,
    val documentName: String,
    val pageNumber: Int?,
    val text: String,
)

data class DocumentDetail(
    val document: KnowledgeDocument,
    val chunks: List<DocumentChunk>,
)

data class TextIngestionRequest(
    val title: String,
    val text: String,
    val projectId: String? = null,
)
