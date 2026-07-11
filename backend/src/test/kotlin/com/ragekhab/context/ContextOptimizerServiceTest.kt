package com.ragekhab.context

import com.ragekhab.config.RagEKhabProperties
import com.ragekhab.config.RuntimeSettingsService
import com.ragekhab.llm.LangChain4jChatClient
import com.ragekhab.document.DocumentChunk
import com.ragekhab.document.DocumentRepository
import com.ragekhab.project.ProjectRepository
import com.ragekhab.project.ProjectService
import com.ragekhab.search.SearchResult
import com.ragekhab.search.SemanticSearchService
import com.ragekhab.search.VectorIndex
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.ragekhab.testStateStore
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ContextOptimizerServiceTest {
    @Test
    fun `request accepts explicit null candidate limit`() {
        val request = jacksonObjectMapper().readValue<ContextOptimizationRequest>(
            """{"task":"Fix context optimizer","maxTokens":1200,"candidateLimit":null}""",
        )

        assertEquals("Fix context optimizer", request.task)
        assertNull(request.candidateLimit)
    }

    @Test
    fun `retrieval mode selects retrieval optimizer`() {
        val retrieval = FakeModeOptimizer(ContextOptimizerMode.Retrieval, "retrieval-only")
        val compression = FakeModeOptimizer(ContextOptimizerMode.Compression, "local-llm:ollama")
        val service = ContextOptimizerService(
            settingsService = RuntimeSettingsService(
                RagEKhabProperties(optimizer = RagEKhabProperties.Optimizer(mode = "retrieval", maxTokens = 3_000)),
                testStateStore(),
            ),
            optimizers = listOf(retrieval, compression),
        )

        val result = service.optimize(ContextOptimizationRequest(task = "Add pagination"))

        assertEquals("retrieval-only", result.compression)
        assertEquals(1, retrieval.calls)
        assertEquals(0, compression.calls)
    }

    @Test
    fun `compression mode selects compression optimizer`() {
        val retrieval = FakeModeOptimizer(ContextOptimizerMode.Retrieval, "retrieval-only")
        val compression = FakeModeOptimizer(ContextOptimizerMode.Compression, "local-llm:ollama")
        val service = ContextOptimizerService(
            settingsService = RuntimeSettingsService(
                RagEKhabProperties(optimizer = RagEKhabProperties.Optimizer(mode = "compression", maxTokens = 3_000)),
                testStateStore(),
            ),
            optimizers = listOf(retrieval, compression),
        )

        val result = service.optimize(ContextOptimizationRequest(task = "Add SSO"))

        assertEquals("local-llm:ollama", result.compression)
        assertEquals(0, retrieval.calls)
        assertEquals(1, compression.calls)
    }

    @Test
    fun `budget profile sets effective max tokens when no explicit budget is provided`() {
        val retrieval = FakeModeOptimizer(ContextOptimizerMode.Retrieval, "retrieval-only")
        val service = ContextOptimizerService(
            settingsService = RuntimeSettingsService(
                RagEKhabProperties(optimizer = RagEKhabProperties.Optimizer(mode = "retrieval", maxTokens = 3_000)),
                testStateStore(),
            ),
            optimizers = listOf(retrieval),
        )

        val result = service.optimize(ContextOptimizationRequest(task = "Inspect auth flow", budgetProfile = "deep"))

        assertEquals(6_000, retrieval.lastRequest?.maxTokens)
        assertEquals("deep", result.budgetProfile)
    }

    @Test
    fun `explicit max tokens wins over budget profile`() {
        val retrieval = FakeModeOptimizer(ContextOptimizerMode.Retrieval, "retrieval-only")
        val service = ContextOptimizerService(
            settingsService = RuntimeSettingsService(
                RagEKhabProperties(optimizer = RagEKhabProperties.Optimizer(mode = "retrieval", maxTokens = 3_000)),
                testStateStore(),
            ),
            optimizers = listOf(retrieval),
        )

        val result = service.optimize(ContextOptimizationRequest(task = "Inspect auth flow", maxTokens = 900, budgetProfile = "deep"))

        assertEquals(900, retrieval.lastRequest?.maxTokens)
        assertEquals("custom", result.budgetProfile)
    }

    @Test
    fun `compression service does not call local llm when disabled`() {
        val compression = ContextCompressionService(
            properties = RagEKhabProperties(localLlm = RagEKhabProperties.LocalLlm(enabled = false)),
            settingsService = RuntimeSettingsService(
                RagEKhabProperties(localLlm = RagEKhabProperties.LocalLlm(enabled = false)),
                testStateStore(),
            ),
            mapper = ObjectMapper(),
            chatClient = LangChain4jChatClient(),
        )

        val result = compression.compress("Fix auth", listOf(searchResult()), 1_000)

        assertNull(result)
    }

    @Test
    fun `retrieval optimizer includes context preview with reasons and token estimates`() {
        val state = testStateStore()
        val documentRepository = DocumentRepository(state)
        val pipeline = ContextOptimizationPipeline(
            searchService = SemanticSearchService(
                repository = documentRepository,
                properties = RagEKhabProperties(),
                vectorIndex = FakeVectorIndex(
                    listOf(
                        searchResult().copy(
                            documentName = "SupplierService.kt",
                            score = 0.92,
                            text = "SupplierService validates supplier tax ID before saving supplier onboarding requests.",
                        ),
                    ),
                ),
            ),
            projectService = ProjectService(ProjectRepository(state), documentRepository),
            properties = RagEKhabProperties(),
            settingsService = RuntimeSettingsService(RagEKhabProperties(), state),
        )

        val result = RetrievalOnlyContextOptimizer(pipeline).optimize(
            ContextOptimizationRequest(task = "Add supplier tax ID validation", maxTokens = 1_200),
        )

        assertEquals("SupplierService.kt", result.preview.single().source)
        assertTrue(result.preview.single().reason.contains("task term"))
        assertTrue(result.preview.single().estimatedTokens > 0)
    }

    private class FakeModeOptimizer(
        override val mode: ContextOptimizerMode,
        private val compressionLabel: String,
    ) : ModeAwareContextOptimizer {
        var calls = 0
        var lastRequest: ContextOptimizationRequest? = null

        override fun optimize(request: ContextOptimizationRequest): OptimizedContext {
            calls += 1
            lastRequest = request
            return optimized(compressionLabel)
        }
    }

    private companion object {
        fun searchResult() = SearchResult(
            projectId = "project",
            projectName = "General",
            documentId = "document",
            documentName = "Auth.kt",
            pageNumber = null,
            chunkId = "chunk",
            score = 0.9,
            text = "Authentication uses JwtAuthenticationFilter.",
        )

        fun optimized(compression: String) = OptimizedContext(
            summary = "summary",
            criticalContext = listOf("critical"),
            importantContext = emptyList(),
            sources = listOf("Source.kt"),
            estimatedTokens = 10,
            tokenSavings = TokenSavingsReport(100, 10, 90, 90.0, 3_000),
            compression = compression,
        )
    }

    private class FakeVectorIndex(private val results: List<SearchResult>) : VectorIndex {
        override fun upsert(chunks: List<DocumentChunk>) = Unit
        override fun search(query: String, limit: Int, projectId: UUID?): List<SearchResult> = results.take(limit)
        override fun deleteDocument(documentId: UUID) = Unit
        override fun reindex(chunks: List<DocumentChunk>) = Unit
        override fun status(): String = "fake"
    }
}
