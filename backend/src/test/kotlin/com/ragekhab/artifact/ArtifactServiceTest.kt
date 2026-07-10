package com.ragekhab.artifact

import com.ragekhab.document.ArtifactIngestionRequest
import com.ragekhab.document.ArtifactKind
import com.ragekhab.document.Chunker
import com.ragekhab.document.DocumentChunk
import com.ragekhab.document.DocumentRepository
import com.ragekhab.project.ProjectRepository
import com.ragekhab.project.ProjectService
import com.ragekhab.search.SearchResult
import com.ragekhab.search.VectorIndex
import com.ragekhab.testStateStore
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class ArtifactServiceTest {
    @Test
    fun `artifact ingestion stores raw artifact and indexes compressed chunks`() {
        val state = testStateStore()
        val documentRepository = DocumentRepository(state)
        val vectorIndex = CapturingVectorIndex()
        val service = service(state, documentRepository, vectorIndex)
        val raw = buildString {
            repeat(20) { appendLine("2026-07-10T10:15:00Z INFO downloaded dependency-$it") }
            appendLine("2026-07-10T10:16:00Z ERROR Failed to start SupplierService userId=USER_123")
            appendLine("java.lang.IllegalStateException: bad supplier state")
            appendLine("    at com.acme.SupplierService.start(SupplierService.java:55)")
        }

        val result = service.ingest(
            ArtifactIngestionRequest(
                title = "backend.log",
                content = raw,
                kind = ArtifactKind.LOG,
            ),
        )

        val storedRaw = service.getRawArtifact(result.rawArtifact.id)
        val indexedText = vectorIndex.upserted.single().text

        assertNotNull(storedRaw)
        assertEquals(raw.trim(), storedRaw.content)
        assertContains(indexedText, "Failed to start SupplierService")
        assertContains(indexedText, "USER_123")
        assertContains(indexedText, "SupplierService.java:55")
        assertTrue(indexedText.length < storedRaw.content.length)
        assertEquals(result.rawArtifact.id, vectorIndex.upserted.single().rawArtifactId)
        assertEquals(ArtifactKind.LOG, vectorIndex.upserted.single().artifactKind)
    }

    @Test
    fun `raw expansion returns slices and related raw context`() {
        val state = testStateStore()
        val documentRepository = DocumentRepository(state)
        val service = service(state, documentRepository, CapturingVectorIndex())

        val result = service.ingest(
            ArtifactIngestionRequest(
                title = "status",
                content = "line 1\nline 2\nline 3\nline 4",
                kind = ArtifactKind.GIT_STATUS,
            ),
        )

        val slice = service.getArtifactSlice(result.rawArtifact.id, beforeLine = 2, afterLine = 3)
        val related = service.getRelatedRawContext(result.compressedDocument.id)

        assertEquals("line 2\nline 3", slice?.text)
        assertEquals(result.rawArtifact.id, related?.rawArtifact?.id)
    }

    private fun service(
        state: com.ragekhab.storage.AppStateStore,
        documentRepository: DocumentRepository,
        vectorIndex: VectorIndex,
    ): ArtifactService =
        ArtifactService(
            compressors = listOf(
                TestOutputCompressor(),
                StackTraceCompressor(),
                GitDiffCompressor(),
                GitStatusCompressor(),
                LogCompressor(),
                DirectoryTreeCompressor(),
                QueryResultCompressor(),
                TextArtifactCompressor(),
            ),
            rawArtifacts = RawArtifactStore(state),
            documentRepository = documentRepository,
            chunker = Chunker(),
            vectorIndex = vectorIndex,
            projectService = ProjectService(ProjectRepository(state), documentRepository),
        )

    private class CapturingVectorIndex : VectorIndex {
        val upserted = mutableListOf<DocumentChunk>()
        override fun upsert(chunks: List<DocumentChunk>) {
            upserted += chunks
        }

        override fun search(query: String, limit: Int, projectId: UUID?): List<SearchResult> = emptyList()
        override fun deleteDocument(documentId: UUID) = Unit
        override fun reindex(chunks: List<DocumentChunk>) = Unit
        override fun status(): String = "test"
    }
}
