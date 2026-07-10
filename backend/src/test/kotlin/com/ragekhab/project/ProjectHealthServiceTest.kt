package com.ragekhab.project

import com.ragekhab.document.DocumentChunk
import com.ragekhab.document.DocumentFormat
import com.ragekhab.document.DocumentRepository
import com.ragekhab.document.KnowledgeDocument
import com.ragekhab.memory.MemoryRepository
import com.ragekhab.memory.MemoryService
import com.ragekhab.memory.MemoryType
import com.ragekhab.memory.RememberRequest
import com.ragekhab.repository.RepositoryCatalogStore
import com.ragekhab.repository.RepositoryMetadataStore
import com.ragekhab.search.SearchResult
import com.ragekhab.search.VectorIndex
import com.ragekhab.testStateStore
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ProjectHealthServiceTest {
    @Test
    fun `empty workspace needs setup`() {
        val fixture = healthFixture()
        val project = fixture.projectService.create(CreateProjectRequest("Empty"))

        val health = fixture.healthService.health(project.id)

        assertEquals(WorkspaceHealthStatus.setup, health.status)
        assertTrue(health.score < 45)
    }

    @Test
    fun `workspace with sources memories and recent repository is ready`() {
        val fixture = healthFixture()
        val project = fixture.projectService.create(CreateProjectRequest("Supplier"))
        repeat(5) { index ->
            fixture.memoryService.remember(
                RememberRequest(
                    type = MemoryType.ProjectKnowledge,
                    content = "Supplier workspace lesson $index",
                    repository = "supplier-service",
                    projectId = project.id,
                ),
            )
        }
        saveDocument(fixture.documentRepository, project)
        val repository = fixture.repositoryCatalog.upsert(
            name = "supplier-service",
            path = "/tmp/supplier-service",
            language = "java",
            syncedAt = Instant.now(),
        )
        fixture.repositoryCatalog.link(project.id, repository.id)

        val health = fixture.healthService.health(project.id)

        assertEquals(WorkspaceHealthStatus.ready, health.status)
        assertEquals(100, health.score)
        assertEquals(1, health.recentlySyncedRepositoryCount)
    }

    private fun healthFixture(): HealthFixture {
        val state = testStateStore()
        val documentRepository = DocumentRepository(state)
        val projectService = ProjectService(ProjectRepository(state), documentRepository)
        val memoryService = MemoryService(MemoryRepository(state), FakeVectorIndex(), RepositoryMetadataStore(state))
        val repositoryCatalog = RepositoryCatalogStore(state)
        return HealthFixture(
            projectService = projectService,
            documentRepository = documentRepository,
            memoryService = memoryService,
            repositoryCatalog = repositoryCatalog,
            healthService = ProjectHealthService(projectService, documentRepository, memoryService, repositoryCatalog),
        )
    }

    private fun saveDocument(repository: DocumentRepository, project: Project) {
        val documentId = UUID.randomUUID()
        val chunks = (1..10).map { index ->
            DocumentChunk(
                id = "$documentId:$index",
                projectId = project.id,
                projectName = project.name,
                documentId = documentId,
                documentName = "Supplier.md",
                pageNumber = null,
                text = "supplier context $index",
            )
        }
        repository.save(
            KnowledgeDocument(
                id = documentId,
                projectId = project.id,
                projectName = project.name,
                name = "Supplier.md",
                format = DocumentFormat.MARKDOWN,
                contentType = "text/markdown",
                sizeBytes = 120,
                createdAt = Instant.now(),
                chunkCount = chunks.size,
            ),
            chunks,
        )
    }

    private data class HealthFixture(
        val projectService: ProjectService,
        val documentRepository: DocumentRepository,
        val memoryService: MemoryService,
        val repositoryCatalog: RepositoryCatalogStore,
        val healthService: ProjectHealthService,
    )

    private class FakeVectorIndex : VectorIndex {
        override fun upsert(chunks: List<DocumentChunk>) = Unit
        override fun search(query: String, limit: Int, projectId: UUID?): List<SearchResult> = emptyList()
        override fun deleteDocument(documentId: UUID) = Unit
        override fun reindex(chunks: List<DocumentChunk>) = Unit
        override fun status(): String = "fake"
    }
}
