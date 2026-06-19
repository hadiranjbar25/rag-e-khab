package com.ragekhab.context

import com.fasterxml.jackson.databind.ObjectMapper
import com.ragekhab.config.RagEKhabProperties
import com.ragekhab.config.RuntimeSettingsService
import com.ragekhab.search.SearchResult
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.stereotype.Service
import org.springframework.web.client.RestClient
import java.time.Duration

@Service
class ContextCompressionService(
    private val properties: RagEKhabProperties,
    private val settingsService: RuntimeSettingsService,
    private val mapper: ObjectMapper,
) {
    val providerName: String
        get() = settingsService.current().localLlm.provider

    private val client = RestClient.builder()
        .requestFactory(
            SimpleClientHttpRequestFactory().apply {
                setConnectTimeout(Duration.ofMillis(700))
                setReadTimeout(Duration.ofSeconds(8))
            },
        )
        .build()

    fun compress(task: String, chunks: List<SearchResult>, maxTokens: Int): CompressedContext? {
        val settings = settingsService.current().localLlm
        if (!settings.enabled || settings.provider.lowercase() != "ollama" || chunks.isEmpty()) return null

        val sourceText = chunks.joinToString("\n\n") { chunk ->
            "[${chunk.documentName} | ${chunk.chunkId} | score ${"%.3f".format(chunk.score)}]\n${chunk.text.take(1_200)}"
        }
        val prompt = """
            You compress repository context for Claude Code.
            Return strict JSON only. No markdown.
            Keep only information needed to complete the task.
            Split into:
            - criticalContext: facts Claude Code likely needs to edit correctly
            - importantContext: useful implementation patterns and constraints
            - optionalContext: lower priority hints only if budget remains
            Each item must be one compact sentence prefixed with its source filename.
            Stay under $maxTokens tokens total.

            Task:
            $task

            Candidate context:
            $sourceText

            JSON schema:
            {"summary":"...","criticalContext":["..."],"importantContext":["..."],"optionalContext":["..."]}
        """.trimIndent()

        return runCatching {
            val response = client.post()
                .uri("${settings.baseUrl}/api/generate")
                .body(mapOf("model" to settings.model, "prompt" to prompt, "stream" to false))
                .retrieve()
                .body(Map::class.java)
            val text = response?.get("response")?.toString()?.trim().orEmpty()
            parse(text)
        }.getOrNull()
    }

    private fun parse(text: String): CompressedContext? {
        val json = text.substringAfter('{', "").substringBeforeLast('}', "")
            .takeIf { it.isNotBlank() }
            ?.let { "{$it}" }
            ?: return null
        val node = mapper.readTree(json)
        return CompressedContext(
            summary = node["summary"]?.asText()?.takeIf { it.isNotBlank() } ?: return null,
            criticalContext = node["criticalContext"]?.mapNotNull { it.asText()?.takeIf(String::isNotBlank) }.orEmpty(),
            importantContext = node["importantContext"]?.mapNotNull { it.asText()?.takeIf(String::isNotBlank) }.orEmpty(),
            optionalContext = node["optionalContext"]?.mapNotNull { it.asText()?.takeIf(String::isNotBlank) }.orEmpty(),
        ).takeIf { it.criticalContext.isNotEmpty() || it.importantContext.isNotEmpty() }
    }
}

data class CompressedContext(
    val summary: String,
    val criticalContext: List<String>,
    val importantContext: List<String>,
    val optionalContext: List<String>,
)
