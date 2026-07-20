package com.ragekhab.document

import com.ragekhab.testStateStore
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class DocumentRepositoryTest {
    @Test
    fun `documents and chunks reload from storage`() {
        val state = testStateStore()
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

        DocumentRepository(state).save(document, listOf(chunk))

        val reloaded = DocumentRepository(state)

        assertEquals(listOf(document), reloaded.list())
        assertEquals(listOf(chunk), reloaded.get(documentId)?.chunks)
    }

    @Test
    fun `deleted documents stay deleted after reload`() {
        val state = testStateStore()
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
        val repository = DocumentRepository(state)

        repository.save(document, emptyList())
        assertNotNull(repository.get(documentId))
        repository.delete(documentId)

        assertNull(DocumentRepository(state).get(documentId))
    }

    @Test
    fun `legacy combined records migrate without losing documents or chunks`() {
        val state = testStateStore()
        val documentId = UUID.randomUUID()
        val projectId = UUID.randomUUID()
        val document = KnowledgeDocument(
            id = documentId,
            projectId = projectId,
            projectName = "General",
            name = "legacy.txt",
            format = DocumentFormat.TEXT,
            contentType = "text/plain",
            sizeBytes = 6,
            createdAt = Instant.parse("2026-06-21T10:15:30Z"),
            chunkCount = 1,
        )
        val chunk = DocumentChunk(
            id = "$documentId:0",
            projectId = projectId,
            projectName = "General",
            documentId = documentId,
            documentName = document.name,
            pageNumber = null,
            text = "legacy",
        )
        state.put("documents", documentId, StoredDocument(document, listOf(chunk)))

        val repository = DocumentRepository(state)

        assertEquals(listOf(document), repository.list())
        assertEquals(listOf(chunk), repository.get(documentId)?.chunks)
        assertEquals(mapOf(projectId to 1), repository.countsByProject())
        assertEquals(true, state.isEmpty("documents"))
    }
}
