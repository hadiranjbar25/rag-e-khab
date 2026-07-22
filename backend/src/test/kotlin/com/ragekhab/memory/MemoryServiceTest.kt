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
import kotlin.test.assertFailsWith
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
                global = true,
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
                global = true,
            ),
        )

        assertEquals(MemoryFreshnessStatus.current, service.list().single().freshness.status)
    }

    @Test
    fun `memory scope must be explicit`() {
        val state = testStateStore()
        val service = MemoryService(MemoryRepository(state), FakeVectorIndex(), RepositoryMetadataStore(state))

        val error = assertFailsWith<IllegalArgumentException> {
            service.remember(
                RememberRequest(
                    type = MemoryType.TechnicalDebt,
                    content = "Split large frontend panels into typed components.",
                ),
            )
        }

        assertTrue(error.message.orEmpty().contains("Memory scope must be explicit"))
    }

    @Test
    fun `new memories must contain one concise lesson`() {
        val state = testStateStore()
        val service = MemoryService(MemoryRepository(state), FakeVectorIndex(), RepositoryMetadataStore(state))

        val error = assertFailsWith<IllegalArgumentException> {
            service.remember(
                RememberRequest(
                    type = MemoryType.ProjectKnowledge,
                    content = "x".repeat(601),
                    global = true,
                ),
            )
        }

        assertTrue(error.message.orEmpty().contains("600 characters or fewer"))
    }

    @Test
    fun `recall compacts legacy oversized memories without changing stored content`() {
        val state = testStateStore()
        val repository = MemoryRepository(state)
        val service = MemoryService(repository, FakeVectorIndex(), RepositoryMetadataStore(state))
        val content = "Reusable architecture lesson " + "implementation detail ".repeat(100)
        repository.save(
            AgentMemory(
                id = UUID.randomUUID(),
                type = MemoryType.ArchitectureDecision,
                content = content,
                confidence = 0.9,
                createdAt = Instant.now(),
            ),
        )

        val recalled = service.recall(RecallMemoryRequest(task = "architecture lesson")).relevantMemories.single()

        assertTrue(recalled.content.length <= 480)
        assertTrue(recalled.content.contains("Shortened for recall"))
        assertEquals(content, service.list().single().content)
    }

    private class FakeVectorIndex : VectorIndex {
        override fun upsert(chunks: List<DocumentChunk>) = Unit
        override fun search(query: String, limit: Int, projectId: UUID?): List<SearchResult> = emptyList()
        override fun deleteDocument(documentId: UUID) = Unit
        override fun reindex(chunks: List<DocumentChunk>) = Unit
        override fun status(): String = "fake"
    }
}
