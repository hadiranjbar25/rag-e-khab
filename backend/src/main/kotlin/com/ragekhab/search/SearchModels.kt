package com.ragekhab.search

data class SearchRequest(val query: String, val limit: Int = 8, val projectId: String? = null)

data class SearchResult(
    val projectId: String,
    val projectName: String,
    val documentId: String,
    val documentName: String,
    val pageNumber: Int?,
    val chunkId: String,
    val score: Double,
    val text: String,
    val rawArtifactId: String? = null,
    val artifactKind: String? = null,
    val rawTokenEstimate: Int? = null,
    val compressedTokenEstimate: Int? = null,
    val reductionPercent: Int? = null,
)

data class IndexStats(
    val documentCount: Int,
    val chunkCount: Int,
    val vectorStore: String,
    val collection: String,
)
