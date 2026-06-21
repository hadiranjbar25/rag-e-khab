package com.ragekhab.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "ragekhab")
data class RagEKhabProperties(
    val storageDir: String = "./data/documents",
    val llm: Llm = Llm(),
    val localLlm: LocalLlm = LocalLlm(),
    val embedding: Embedding = Embedding(),
    val optimizer: Optimizer = Optimizer(),
    val qdrant: Qdrant = Qdrant(),
    val repositoryAgent: RepositoryAgent = RepositoryAgent(),
) {
    data class Llm(
        val provider: String = "ollama",
        val model: String = "llama3.1",
        val apiKey: String = "",
        val baseUrl: String = "http://localhost:11434",
    )

    data class LocalLlm(
        val enabled: Boolean = false,
        val provider: String = "ollama",
        val baseUrl: String = "http://localhost:11434",
        val model: String = "qwen2.5:7b",
    )

    data class Embedding(
        val provider: String = "hash",
        val model: String = "nomic-embed-text",
        val baseUrl: String = "http://host.docker.internal:11434",
        val dimensions: Int = 384,
    )

    data class Optimizer(
        val mode: String = "retrieval",
        val maxTokens: Int = 3_000,
    )

    data class Qdrant(
        val url: String = "http://localhost:6333",
        val collection: String = "ragekhab_documents",
    )

    data class RepositoryAgent(
        val path: String = "",
        val scheduled: Boolean = false,
        val intervalMs: Long = 300_000,
    )
}
