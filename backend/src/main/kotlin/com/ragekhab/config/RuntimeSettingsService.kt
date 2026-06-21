package com.ragekhab.config

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Service
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.atomic.AtomicReference

data class OptimizerRuntimeSettings(
    val mode: String,
    val maxTokens: Int,
)

data class LlmRuntimeSettings(
    val provider: String,
    val model: String,
    val apiKey: String,
    val baseUrl: String,
)

data class LocalLlmRuntimeSettings(
    val enabled: Boolean,
    val provider: String,
    val baseUrl: String,
    val model: String,
)

data class EmbeddingRuntimeSettings(
    val provider: String = "hash",
    val model: String = "nomic-embed-text",
    val baseUrl: String = "http://host.docker.internal:11434",
    val dimensions: Int = 384,
)

data class RepositoryAgentRuntimeSettings(
    val path: String,
    val scheduled: Boolean,
    val intervalMs: Long,
)

data class RuntimeSettings(
    val llm: LlmRuntimeSettings,
    val optimizer: OptimizerRuntimeSettings,
    val localLlm: LocalLlmRuntimeSettings,
    val embedding: EmbeddingRuntimeSettings = EmbeddingRuntimeSettings(),
    val repositoryAgent: RepositoryAgentRuntimeSettings,
)

data class UpdateRuntimeSettingsRequest(
    val llm: LlmRuntimeSettings? = null,
    val optimizer: OptimizerRuntimeSettings? = null,
    val localLlm: LocalLlmRuntimeSettings? = null,
    val embedding: EmbeddingRuntimeSettings? = null,
    val repositoryAgent: RepositoryAgentRuntimeSettings? = null,
)

@Service
class RuntimeSettingsService(
    private val properties: RagEKhabProperties,
    private val mapper: ObjectMapper,
) {
    private val storagePath: Path = Path.of(properties.storageDir).resolve("runtime-settings.json")
    private val settings = AtomicReference(load() ?: defaults())

    fun current(): RuntimeSettings = settings.get()

    fun update(request: UpdateRuntimeSettingsRequest): RuntimeSettings {
        val updated = settings.updateAndGet { current ->
            val llm = request.llm?.let {
                LlmRuntimeSettings(
                    provider = it.provider.trim().takeIf(String::isNotBlank) ?: "ollama",
                    model = it.model.trim().takeIf(String::isNotBlank) ?: "llama3.1",
                    apiKey = it.apiKey,
                    baseUrl = it.baseUrl.trim().takeIf(String::isNotBlank) ?: "http://localhost:11434",
                )
            } ?: current.llm
            val localLlm = request.localLlm?.let {
                LocalLlmRuntimeSettings(
                    enabled = it.enabled,
                    provider = it.provider.trim().takeIf(String::isNotBlank) ?: "ollama",
                    baseUrl = it.baseUrl.trim().takeIf(String::isNotBlank) ?: "http://localhost:11434",
                    model = it.model.trim().takeIf(String::isNotBlank) ?: "qwen2.5:7b",
                )
            } ?: current.localLlm
            val optimizer = request.optimizer?.let {
                OptimizerRuntimeSettings(
                    mode = it.mode.trim().lowercase().takeIf { mode -> mode in setOf("retrieval", "compression") }
                        ?: error("Optimizer mode must be retrieval or compression."),
                    maxTokens = it.maxTokens.coerceIn(300, 8_000),
                )
            } ?: current.optimizer
            require(optimizer.mode != "compression" || localLlm.enabled) {
                "Compression optimizer mode requires local LLM compression to be enabled."
            }
            val embedding = request.embedding?.let {
                val provider = it.provider.trim().lowercase().takeIf { provider -> provider in setOf("hash", "ollama") }
                    ?: error("Embedding provider must be hash or ollama.")
                if (provider == "hash") {
                    EmbeddingRuntimeSettings(
                        provider = "hash",
                        model = "hash-based embedder",
                        baseUrl = it.baseUrl.trim().takeIf(String::isNotBlank) ?: "http://host.docker.internal:11434",
                        dimensions = 384,
                    )
                } else {
                    EmbeddingRuntimeSettings(
                        provider = "ollama",
                        model = it.model.trim().takeIf(String::isNotBlank) ?: "nomic-embed-text",
                        baseUrl = it.baseUrl.trim().takeIf(String::isNotBlank) ?: "http://host.docker.internal:11434",
                        dimensions = it.dimensions.coerceIn(1, 8_192),
                    )
                }
            } ?: current.embedding
            val repositoryAgent = request.repositoryAgent?.let {
                RepositoryAgentRuntimeSettings(
                    path = it.path.trim(),
                    scheduled = it.scheduled,
                    intervalMs = it.intervalMs.coerceAtLeast(30_000),
                )
            } ?: current.repositoryAgent
            RuntimeSettings(llm, optimizer, localLlm, embedding, repositoryAgent)
        }
        persist(updated)
        return updated
    }

    private fun defaults(): RuntimeSettings =
        RuntimeSettings(
            llm = LlmRuntimeSettings(
                provider = properties.llm.provider,
                model = properties.llm.model,
                apiKey = properties.llm.apiKey,
                baseUrl = properties.llm.baseUrl,
            ),
            optimizer = OptimizerRuntimeSettings(
                mode = properties.optimizer.mode,
                maxTokens = properties.optimizer.maxTokens,
            ),
            localLlm = LocalLlmRuntimeSettings(
                enabled = properties.localLlm.enabled,
                provider = properties.localLlm.provider,
                baseUrl = properties.localLlm.baseUrl,
                model = properties.localLlm.model,
            ),
            embedding = EmbeddingRuntimeSettings(
                provider = properties.embedding.provider,
                model = properties.embedding.model,
                baseUrl = properties.embedding.baseUrl,
                dimensions = properties.embedding.dimensions,
            ),
            repositoryAgent = RepositoryAgentRuntimeSettings(
                path = properties.repositoryAgent.path,
                scheduled = properties.repositoryAgent.scheduled,
                intervalMs = properties.repositoryAgent.intervalMs,
            ),
        )

    private fun load(): RuntimeSettings? =
        if (!Files.exists(storagePath)) null else runCatching {
            mapper.readValue(Files.readString(storagePath), RuntimeSettings::class.java)
        }.getOrNull()

    private fun persist(value: RuntimeSettings) {
        Files.createDirectories(storagePath.parent)
        Files.writeString(storagePath, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(value))
    }
}
