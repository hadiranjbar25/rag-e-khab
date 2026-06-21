package com.ragekhab.search

import com.ragekhab.config.RuntimeSettingsService
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import java.util.concurrent.ConcurrentHashMap

interface OllamaEmbeddingClient {
    fun embed(baseUrl: String, model: String, text: String): List<Float>
}

@Component
class RestOllamaEmbeddingClient : OllamaEmbeddingClient {
    override fun embed(baseUrl: String, model: String, text: String): List<Float> {
        val response = RestClient.create(baseUrl)
            .post()
            .uri("/api/embeddings")
            .body(mapOf("model" to model, "prompt" to text))
            .retrieve()
            .body(Map::class.java)

        val embedding = response?.get("embedding") as? List<*>
            ?: error("Ollama embedding response did not contain an 'embedding' array.")
        return embedding.map { value ->
            (value as? Number)?.toFloat()
                ?: error("Ollama embedding response contained a non-numeric value.")
        }.takeIf { it.isNotEmpty() }
            ?: error("Ollama embedding response was empty.")
    }
}

@Component
class EmbeddingService(
    private val settingsService: RuntimeSettingsService,
    private val hashEmbedder: TextEmbedder,
    private val ollamaClient: OllamaEmbeddingClient,
) {
    private val dimensionCache = ConcurrentHashMap<String, Int>()

    fun embed(text: String): List<Float> =
        when (provider()) {
            "hash" -> hashEmbedder.embed(text)
            "ollama" -> ollamaEmbedding(text)
            else -> error("Unsupported embedding provider '${provider()}'. Available: hash, ollama")
        }

    fun dimensions(): Int =
        when (provider()) {
            "hash" -> hashEmbedder.dimensions
            "ollama" -> dimensionCache.computeIfAbsent(signature()) { embed("RAG-e Khab embedding dimension probe").size }
            else -> error("Unsupported embedding provider '${provider()}'. Available: hash, ollama")
        }

    fun cosine(a: List<Float>, b: List<Float>): Double =
        hashEmbedder.cosine(a, b)

    fun signature(): String {
        val settings = settingsService.current().embedding
        return "${settings.provider.lowercase()}|${settings.model}|${settings.baseUrl}"
    }

    private fun provider(): String =
        settingsService.current().embedding.provider.lowercase()

    private fun ollamaEmbedding(text: String): List<Float> {
        val settings = settingsService.current().embedding
        return runCatching {
            ollamaClient.embed(settings.baseUrl, settings.model, text)
        }.getOrElse { throwable ->
            throw IllegalStateException(
                "Embedding provider 'ollama' failed for model '${settings.model}' at '${settings.baseUrl}'. " +
                    "Start Ollama, pull the model, or switch RAGEKHAB_EMBEDDING_PROVIDER=hash.",
                throwable,
            )
        }
    }
}
