package com.ragekhab.context

import com.ragekhab.config.RagEKhabProperties
import com.ragekhab.config.RuntimeSettingsService
import com.ragekhab.llm.LangChain4jChatClient
import com.ragekhab.search.SearchResult
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.ragekhab.testStateStore
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

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

    private class FakeModeOptimizer(
        override val mode: ContextOptimizerMode,
        private val compressionLabel: String,
    ) : ModeAwareContextOptimizer {
        var calls = 0

        override fun optimize(request: ContextOptimizationRequest): OptimizedContext {
            calls += 1
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
}
