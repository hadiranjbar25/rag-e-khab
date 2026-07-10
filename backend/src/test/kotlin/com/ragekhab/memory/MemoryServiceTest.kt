package com.ragekhab.memory

import com.ragekhab.document.DocumentChunk
import com.ragekhab.repository.RepositoryFileMetadata
import com.ragekhab.repository.RepositoryMetadataStore
import com.ragekhab.search.SearchResult
import com.ragekhab.search.VectorIndex
import com.ragekhab.testStateStore
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class MemoryServiceTest {
    @Test
    fun `repo scoped memories are marked stale when related files changed later`() {
        val state = testStateStore()
        val metadataStore = RepositoryMetadataStore(state)
        val service = MemoryService(MemoryRepository(state), FakeVectorIndex(), metadataStore)
        val memory = service.remember(
            RememberRequest(
                type = MemoryType.CodingConvention,
                content = "Supplier validation lives in SupplierValidator.",
                repository = "supplier-service",
                module = "src",
            ),
        )
        metadataStore.save(
            RepositoryFileMetadata(
                documentId = UUID.randomUUID(),
                repository = "supplier-service",
                repositoryRoot = "agent:supplier-service",
                filePath = "src/main/java/com/example/supplier/SupplierValidator.java",
                module = "src",
                language = "java",
                lastModifiedAt = memory.createdAt.plusSeconds(60),
                sizeBytes = 120,
                contentHash = "validator-v2",
                indexedAt = Instant.now(),
            ),
        )

        val listed = service.list().single()

        assertEquals(MemoryFreshnessStatus.stale, listed.freshness.status)
        assertTrue(listed.freshness.changedFiles.single().endsWith("SupplierValidator.java"))
    }

    @Test
    fun `global memories stay current without repository scope`() {
        val state = testStateStore()
        val service = MemoryService(MemoryRepository(state), FakeVectorIndex(), RepositoryMetadataStore(state))

        service.remember(
            RememberRequest(
                type = MemoryType.ProjectKnowledge,
                content = "Use sentence case in UI labels.",
            ),
        )

        assertEquals(MemoryFreshnessStatus.current, service.list().single().freshness.status)
    }

    private class FakeVectorIndex : VectorIndex {
        override fun upsert(chunks: List<DocumentChunk>) = Unit
        override fun search(query: String, limit: Int, projectId: UUID?): List<SearchResult> = emptyList()
        override fun deleteDocument(documentId: UUID) = Unit
        override fun reindex(chunks: List<DocumentChunk>) = Unit
        override fun status(): String = "fake"
    }
}
