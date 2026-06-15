package com.ragekhab.chat

import com.ragekhab.search.SearchResult
import java.time.Instant

data class ChatRequest(val question: String, val limit: Int = 8, val projectId: String? = null)

data class ChatResponse(
    val answer: String,
    val sources: List<SearchResult>,
    val provider: String,
    val createdAt: Instant = Instant.now(),
)
