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
)

data class IndexStats(
    val documentCount: Int,
    val chunkCount: Int,
    val vectorStore: String,
    val collection: String,
)
