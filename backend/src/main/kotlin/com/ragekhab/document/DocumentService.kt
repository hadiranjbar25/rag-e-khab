package com.ragekhab.document

import com.ragekhab.config.RagEKhabProperties
import com.ragekhab.project.ProjectService
import com.ragekhab.search.VectorIndex
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import java.nio.file.Files
import java.nio.file.Path
import java.time.Instant
import java.util.UUID

@Service
class DocumentService(
    private val parser: DocumentParser,
    private val chunker: Chunker,
    private val repository: DocumentRepository,
    private val properties: RagEKhabProperties,
    private val vectorIndex: VectorIndex,
    private val projectService: ProjectService,
) {
    fun upload(file: MultipartFile, projectId: UUID? = null): KnowledgeDocument {
        require(!file.isEmpty) { "Document upload is empty." }

        val id = UUID.randomUUID()
        val project = projectId?.let { projectService.requireProject(it) } ?: projectService.defaultProject()
        val originalName = file.originalFilename?.takeIf { it.isNotBlank() } ?: "document-$id"
        val format = parser.detectFormat(file)
        val pages = parser.parse(file, format)
        val chunks = chunker.chunk(project.id, project.name, id, originalName, pages)
        require(chunks.isNotEmpty()) { "Document did not contain indexable text." }

        persistFile(id, originalName, file.bytes)
        val document = repository.save(
            KnowledgeDocument(
                id = id,
                projectId = project.id,
                projectName = project.name,
                name = originalName,
                format = format,
                contentType = file.contentType ?: "application/octet-stream",
                sizeBytes = file.size,
                createdAt = Instant.now(),
                chunkCount = chunks.size,
            ),
            chunks,
        )
        vectorIndex.upsert(chunks)
        return document
    }

    fun addText(title: String, text: String, projectId: UUID? = null): KnowledgeDocument {
        val normalizedTitle = title.trim().takeIf { it.isNotBlank() } ?: "Text note"
        val normalizedText = text.trim()
        require(normalizedText.isNotBlank()) { "Text must not be blank." }

        val id = UUID.randomUUID()
        val project = projectId?.let { projectService.requireProject(it) } ?: projectService.defaultProject()
        val name = if (normalizedTitle.endsWith(".txt")) normalizedTitle else "$normalizedTitle.txt"
        val bytes = normalizedText.toByteArray(Charsets.UTF_8)
        val chunks = chunker.chunk(project.id, project.name, id, name, listOf(ParsedPage(null, normalizedText)))
        require(chunks.isNotEmpty()) { "Text did not contain indexable content." }

        persistFile(id, name, bytes)
        val document = repository.save(
            KnowledgeDocument(
                id = id,
                projectId = project.id,
                projectName = project.name,
                name = name,
                format = DocumentFormat.TEXT,
                contentType = "text/plain",
                sizeBytes = bytes.size.toLong(),
                createdAt = Instant.now(),
                chunkCount = chunks.size,
            ),
            chunks,
        )
        vectorIndex.upsert(chunks)
        return document
    }

    fun list(): List<KnowledgeDocument> = repository.list()

    fun list(projectId: UUID?): List<KnowledgeDocument> =
        projectId?.let { repository.list(it) } ?: repository.list()

    fun get(id: UUID): DocumentDetail? = repository.get(id)

    fun delete(id: UUID): Boolean {
        val deleted = repository.delete(id)
        vectorIndex.deleteDocument(id)
        Files.deleteIfExists(storagePath(id))
        return deleted
    }

    fun reindex(): List<KnowledgeDocument> {
        vectorIndex.reindex(repository.allChunks())
        return repository.list()
    }

    private fun persistFile(id: UUID, name: String, bytes: ByteArray) {
        val dir = Path.of(properties.storageDir)
        Files.createDirectories(dir)
        Files.write(storagePath(id), bytes)
        Files.writeString(dir.resolve("$id.name"), name)
    }

    private fun storagePath(id: UUID): Path = Path.of(properties.storageDir).resolve("$id.bin")
}
