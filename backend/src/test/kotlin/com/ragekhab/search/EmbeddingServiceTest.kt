package com.ragekhab.search

import com.fasterxml.jackson.databind.ObjectMapper
import com.ragekhab.config.RagEKhabProperties
import com.ragekhab.config.RuntimeSettingsService
import kotlin.test.Test
import kotlin.test.assertEquals

class EmbeddingServiceTest {
    @Test
    fun `hash provider uses existing text embedder dimensions`() {
        val ollama = FakeOllamaEmbeddingClient()
        val service = EmbeddingService(
            settingsService = settings("hash"),
            hashEmbedder = TextEmbedder(),
            ollamaClient = ollama,
        )

        val vector = service.embed("Authentication uses JWT filters")

        assertEquals(384, service.dimensions())
        assertEquals(384, vector.size)
        assertEquals(0, ollama.calls)
    }

    @Test
    fun `ollama provider uses configured model and dimensions from response`() {
        val ollama = FakeOllamaEmbeddingClient(listOf(0.1f, 0.2f, 0.3f))
        val service = EmbeddingService(
            settingsService = settings("ollama"),
            hashEmbedder = TextEmbedder(),
            ollamaClient = ollama,
        )

        val vector = service.embed("Repository context")

        assertEquals(listOf(0.1f, 0.2f, 0.3f), vector)
        assertEquals(3, service.dimensions())
        assertEquals(2, ollama.calls)
        assertEquals("http://ollama.test:11434", ollama.lastBaseUrl)
        assertEquals("nomic-embed-text", ollama.lastModel)
    }

    private fun settings(provider: String) =
        RuntimeSettingsService(
            properties = RagEKhabProperties(
                embedding = RagEKhabProperties.Embedding(
                    provider = provider,
                    model = "nomic-embed-text",
                    baseUrl = "http://ollama.test:11434",
                    dimensions = 384,
                ),
            ),
            mapper = ObjectMapper(),
        )

    private class FakeOllamaEmbeddingClient(
        private val response: List<Float> = emptyList(),
    ) : OllamaEmbeddingClient {
        var calls = 0
        var lastBaseUrl: String? = null
        var lastModel: String? = null

        override fun embed(baseUrl: String, model: String, text: String): List<Float> {
            calls += 1
            lastBaseUrl = baseUrl
            lastModel = model
            return response
        }
    }
}
