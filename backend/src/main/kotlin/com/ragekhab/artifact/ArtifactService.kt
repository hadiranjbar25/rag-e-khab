package com.ragekhab.artifact

import com.ragekhab.document.ArtifactIngestionRequest
import com.ragekhab.document.ArtifactKind
import com.ragekhab.document.Chunker
import com.ragekhab.document.DocumentFormat
import com.ragekhab.document.DocumentRepository
import com.ragekhab.document.KnowledgeDocument
import com.ragekhab.document.ParsedPage
import com.ragekhab.project.ProjectService
import com.ragekhab.search.VectorIndex
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

@Service
class ArtifactService(
    private val compressors: List<ContextCompressor>,
    private val rawArtifacts: RawArtifactStore,
    private val documentRepository: DocumentRepository,
    private val chunker: Chunker,
    private val vectorIndex: VectorIndex,
    private val projectService: ProjectService,
) {
    fun ingest(request: ArtifactIngestionRequest): ArtifactIngestionResult {
        val normalizedTitle = request.title.trim().takeIf { it.isNotBlank() } ?: "Developer artifact"
        val normalizedContent = request.content.trim()
        require(normalizedContent.isNotBlank()) { "Artifact content must not be blank." }

        val project = request.projectId?.takeIf { it.isNotBlank() }?.let { projectService.requireProject(UUID.fromString(it)) }
            ?: projectService.defaultProject()
        val rawArtifactId = UUID.randomUUID()
        val compressedDocumentId = UUID.randomUUID()
        val compressed = compressorFor(request.kind).compress(
            CompressionInput(
                title = normalizedTitle,
                kind = request.kind,
                content = normalizedContent,
            ),
        )
        val rawArtifact = rawArtifacts.save(
            RawArtifact(
                id = rawArtifactId,
                projectId = project.id,
                projectName = project.name,
                name = normalizedTitle,
                kind = request.kind,
                content = normalizedContent,
                createdAt = Instant.now(),
                compressedDocumentId = compressedDocumentId,
            ),
        )
        val name = "${normalizedTitle.removeSuffix(".txt")}.compressed.txt"
        val chunks = chunker.chunk(project.id, project.name, compressedDocumentId, name, listOf(ParsedPage(null, compressed.text)))
            .map {
                it.copy(
                    rawArtifactId = rawArtifact.id,
                    artifactKind = request.kind,
                    rawTokenEstimate = compressed.metrics.rawTokenEstimate,
                    compressedTokenEstimate = compressed.metrics.compressedTokenEstimate,
                    reductionPercent = compressed.metrics.reductionPercent,
                )
            }
        require(chunks.isNotEmpty()) { "Compressed artifact did not contain indexable text." }

        val document = documentRepository.save(
            KnowledgeDocument(
                id = compressedDocumentId,
                projectId = project.id,
                projectName = project.name,
                name = name,
                format = DocumentFormat.TEXT,
                contentType = "text/plain",
                sizeBytes = compressed.text.toByteArray(Charsets.UTF_8).size.toLong(),
                createdAt = Instant.now(),
                chunkCount = chunks.size,
                rawArtifactId = rawArtifact.id,
                artifactKind = request.kind,
                rawTokenEstimate = compressed.metrics.rawTokenEstimate,
                compressedTokenEstimate = compressed.metrics.compressedTokenEstimate,
                reductionPercent = compressed.metrics.reductionPercent,
            ),
            chunks,
        )
        vectorIndex.upsert(chunks)
        return ArtifactIngestionResult(rawArtifact, document, compressed.metrics)
    }

    fun getRawArtifact(id: UUID): RawArtifact? = rawArtifacts.get(id)

    fun getArtifactSlice(id: UUID, beforeLine: Int, afterLine: Int): ArtifactSlice? {
        val artifact = rawArtifacts.get(id) ?: return null
        val lines = artifact.content.lines()
        if (lines.isEmpty()) {
            return ArtifactSlice(id, 1, 1, "")
        }
        val start = beforeLine.coerceAtLeast(1).coerceAtMost(lines.size)
        val end = afterLine.coerceAtLeast(start).coerceAtMost(lines.size)
        return ArtifactSlice(
            artifactId = id,
            startLine = start,
            endLine = end,
            text = lines.subList(start - 1, end).joinToString("\n"),
        )
    }

    fun getRelatedRawContext(compressedArtifactId: UUID): RelatedRawContext? {
        val document = documentRepository.get(compressedArtifactId)?.document
        val rawId = document?.rawArtifactId
        val raw = rawId?.let(rawArtifacts::get) ?: rawArtifacts.findByCompressedDocumentId(compressedArtifactId) ?: return null
        return RelatedRawContext(compressedArtifactId, raw)
    }

    private fun compressorFor(kind: ArtifactKind): ContextCompressor =
        compressors.firstOrNull { it.supports(kind) } ?: compressors.first { it.supports(ArtifactKind.TEXT) }
}
