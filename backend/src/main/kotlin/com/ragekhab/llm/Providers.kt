package com.ragekhab.llm

import com.ragekhab.config.RagEKhabProperties
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

abstract class ConfiguredHttpProvider(
    protected val properties: RagEKhabProperties,
    protected val client: RestClient = RestClient.create(),
) : LLMProvider {
    protected fun prompt(request: LLMRequest): String {
        val context = request.context.joinToString("\n\n") {
            "[${it.chunkId} | ${it.documentName} | page ${it.pageNumber ?: "n/a"}]\n${it.text}"
        }
        return """
            Answer the question using only the cited context. If the answer is not present, say so.

            Question:
            ${request.question}

            Context:
            $context
        """.trimIndent()
    }

    protected fun fallback(request: LLMRequest): String {
        val best = request.context.firstOrNull()
            ?: return "I could not find relevant knowledge base content for that question."
        return "The closest matching source says: ${best.text}"
    }
}

@Component
class OllamaProvider(properties: RagEKhabProperties) : ConfiguredHttpProvider(properties) {
    override val name = "ollama"

    override fun answer(request: LLMRequest): String =
        runCatching {
            val response = client.post()
                .uri("${properties.llm.baseUrl}/api/generate")
                .body(mapOf("model" to properties.llm.model, "prompt" to prompt(request), "stream" to false))
                .retrieve()
                .body(Map::class.java)
            response?.get("response")?.toString()?.takeIf { it.isNotBlank() } ?: fallback(request)
        }.getOrElse { fallback(request) }
}

@Component
class OpenAIProvider(properties: RagEKhabProperties) : ConfiguredHttpProvider(properties) {
    override val name = "openai"

    override fun answer(request: LLMRequest): String = fallback(request)
}

@Component
class ClaudeProvider(properties: RagEKhabProperties) : ConfiguredHttpProvider(properties) {
    override val name = "claude"

    override fun answer(request: LLMRequest): String = fallback(request)
}

@Component
class GeminiProvider(properties: RagEKhabProperties) : ConfiguredHttpProvider(properties) {
    override val name = "gemini"

    override fun answer(request: LLMRequest): String = fallback(request)
}
