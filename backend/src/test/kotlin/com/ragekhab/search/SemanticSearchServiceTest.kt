package com.ragekhab.search

import com.ragekhab.config.RagEKhabProperties
import com.ragekhab.document.DocumentChunk
import com.ragekhab.document.DocumentRepository
import com.ragekhab.testStateStore
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals

class SemanticSearchServiceTest {
    @Test
    fun `exact file and symbol matches outrank generic semantic results`() {
        val exact = result(
            name = "RAGEKHAB/frontend/src/components/pages/renderers/renderRepositoriesPage.tsx",
            text = "export function renderRepositoriesPage(app: RageKhabAppModel) {}",
            score = 0.50,
        )
        val generic = result(
            name = "RAGEKHAB/README.md",
            text = "Repository pages display files and project context.",
            score = 0.62,
        )
        val service = SemanticSearchService(
            repository = DocumentRepository(testStateStore()),
            properties = RagEKhabProperties(),
            vectorIndex = FakeVectorIndex(listOf(generic, exact)),
        )

        val results = service.search("update renderRepositoriesPage file viewer", limit = 2)

        assertEquals(exact.documentName, results.first().documentName)
    }

    private fun result(name: String, text: String, score: Double) = SearchResult(
        projectId = UUID.randomUUID().toString(),
        projectName = "RAG-E-Khab",
        documentId = UUID.randomUUID().toString(),
        documentName = name,
        pageNumber = null,
        chunkId = UUID.randomUUID().toString(),
        score = score,
        text = text,
    )

    private class FakeVectorIndex(private val results: List<SearchResult>) : VectorIndex {
        override fun upsert(chunks: List<DocumentChunk>) = Unit
        override fun search(query: String, limit: Int, projectId: UUID?): List<SearchResult> = results.take(limit)
        override fun deleteDocument(documentId: UUID) = Unit
        override fun reindex(chunks: List<DocumentChunk>) = Unit
        override fun status(): String = "fake"
    }
}
