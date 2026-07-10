package com.ragekhab.artifact

import com.ragekhab.document.ArtifactKind
import com.ragekhab.document.KnowledgeDocument
import java.time.Instant
import java.util.UUID

data class RawArtifact(
    val id: UUID,
    val projectId: UUID,
    val projectName: String,
    val name: String,
    val kind: ArtifactKind,
    val content: String,
    val createdAt: Instant,
    val compressedDocumentId: UUID? = null,
)

data class ArtifactCompressionMetrics(
    val rawTokenEstimate: Int,
    val compressedTokenEstimate: Int,
    val reductionPercent: Int,
)

data class CompressedArtifact(
    val kind: ArtifactKind,
    val title: String,
    val text: String,
    val metrics: ArtifactCompressionMetrics,
)

data class ArtifactIngestionResult(
    val rawArtifact: RawArtifact,
    val compressedDocument: KnowledgeDocument,
    val metrics: ArtifactCompressionMetrics,
)

data class ArtifactSlice(
    val artifactId: UUID,
    val startLine: Int,
    val endLine: Int,
    val text: String,
)

data class RelatedRawContext(
    val compressedArtifactId: UUID,
    val rawArtifact: RawArtifact,
)

data class CompressionInput(
    val title: String,
    val kind: ArtifactKind,
    val content: String,
)
