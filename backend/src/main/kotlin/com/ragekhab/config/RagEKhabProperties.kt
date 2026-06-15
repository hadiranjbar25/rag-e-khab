package com.ragekhab.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "ragekhab")
data class RagEKhabProperties(
    val storageDir: String = "./data/documents",
    val llm: Llm = Llm(),
    val qdrant: Qdrant = Qdrant(),
) {
    data class Llm(
        val provider: String = "ollama",
        val model: String = "llama3.1",
        val apiKey: String = "",
        val baseUrl: String = "http://localhost:11434",
    )

    data class Qdrant(
        val url: String = "http://localhost:6333",
        val collection: String = "ragekhab_documents",
    )
}
