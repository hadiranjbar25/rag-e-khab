package com.ragekhab.document

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.ragekhab.config.RagEKhabProperties
import java.nio.file.Files
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class DocumentRepositoryTest {
    @Test
    fun `documents and chunks reload from storage`() {
        val storageDir = Files.createTempDirectory("ragekhab-documents")
        val properties = RagEKhabProperties(storageDir = storageDir.toString())
        val documentId = UUID.randomUUID()
        val projectId = UUID.randomUUID()
        val document = KnowledgeDocument(
            id = documentId,
            projectId = projectId,
            projectName = "Billing",
            name = "README.md",
            format = DocumentFormat.MARKDOWN,
            contentType = "text/markdown",
            sizeBytes = 42,
            createdAt = Instant.parse("2026-06-21T10:15:30Z"),
            chunkCount = 1,
        )
        val chunk = DocumentChunk(
            id = "$documentId:0",
            projectId = projectId,
            projectName = "Billing",
            documentId = documentId,
            documentName = "README.md",
            pageNumber = null,
            text = "Billing APIs use cursor pagination.",
        )

        DocumentRepository(properties, mapper()).save(document, listOf(chunk))

        val reloaded = DocumentRepository(properties, mapper())

        assertEquals(listOf(document), reloaded.list())
        assertEquals(listOf(chunk), reloaded.get(documentId)?.chunks)
    }

    @Test
    fun `deleted documents stay deleted after reload`() {
        val storageDir = Files.createTempDirectory("ragekhab-documents")
        val properties = RagEKhabProperties(storageDir = storageDir.toString())
        val documentId = UUID.randomUUID()
        val document = KnowledgeDocument(
            id = documentId,
            projectId = UUID.randomUUID(),
            projectName = "General",
            name = "note.txt",
            format = DocumentFormat.TEXT,
            contentType = "text/plain",
            sizeBytes = 4,
            createdAt = Instant.parse("2026-06-21T10:15:30Z"),
            chunkCount = 0,
        )
        val repository = DocumentRepository(properties, mapper())

        repository.save(document, emptyList())
        assertNotNull(repository.get(documentId))
        repository.delete(documentId)

        assertNull(DocumentRepository(properties, mapper()).get(documentId))
    }

    private fun mapper(): ObjectMapper =
        ObjectMapper()
            .registerModule(JavaTimeModule())
            .findAndRegisterModules()
}
