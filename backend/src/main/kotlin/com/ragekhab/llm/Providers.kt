package com.ragekhab.llm

import com.ragekhab.config.RagEKhabProperties
import com.ragekhab.config.RuntimeSettingsService
import org.springframework.stereotype.Component

abstract class PromptingLLMProvider(
    protected val properties: RagEKhabProperties,
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
class OllamaProvider(
    properties: RagEKhabProperties,
    private val settingsService: RuntimeSettingsService,
    private val chatClient: LangChain4jChatClient,
) : PromptingLLMProvider(properties) {
    override val name = "ollama"

    override fun answer(request: LLMRequest): String =
        runCatching {
            val settings = settingsService.current().llm
            chatClient.ollama(settings.baseUrl, settings.model, prompt(request))
                .takeIf { it.isNotBlank() }
                ?: fallback(request)
        }.getOrElse { fallback(request) }
}

@Component
class OpenAIProvider(properties: RagEKhabProperties) : PromptingLLMProvider(properties) {
    override val name = "openai"

    override fun answer(request: LLMRequest): String = fallback(request)
}

@Component
class ClaudeProvider(properties: RagEKhabProperties) : PromptingLLMProvider(properties) {
    override val name = "claude"

    override fun answer(request: LLMRequest): String = fallback(request)
}

@Component
class GeminiProvider(properties: RagEKhabProperties) : PromptingLLMProvider(properties) {
    override val name = "gemini"

    override fun answer(request: LLMRequest): String = fallback(request)
}
