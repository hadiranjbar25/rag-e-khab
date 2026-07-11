package com.ragekhab.document

import java.time.Instant
import java.util.UUID

enum class DocumentFormat {
    PDF,
    WORD,
    PRESENTATION,
    SPREADSHEET,
    HTML,
    MARKDOWN,
    TEXT,
    OTHER,
}

enum class ArtifactKind {
    TEST_OUTPUT,
    STACK_TRACE,
    GIT_DIFF,
    GIT_STATUS,
    LOG,
    DIRECTORY_TREE,
    QUERY_RESULT,
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
    val rawArtifactId: UUID? = null,
    val artifactKind: ArtifactKind? = null,
    val rawTokenEstimate: Int? = null,
    val compressedTokenEstimate: Int? = null,
    val reductionPercent: Int? = null,
)

data class DocumentChunk(
    val id: String,
    val projectId: UUID,
    val projectName: String,
    val documentId: UUID,
    val documentName: String,
    val pageNumber: Int?,
    val text: String,
    val rawArtifactId: UUID? = null,
    val artifactKind: ArtifactKind? = null,
    val rawTokenEstimate: Int? = null,
    val compressedTokenEstimate: Int? = null,
    val reductionPercent: Int? = null,
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

data class ArtifactIngestionRequest(
    val title: String,
    val content: String,
    val kind: ArtifactKind = ArtifactKind.TEXT,
    val projectId: String? = null,
)
