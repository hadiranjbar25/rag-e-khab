package com.ragekhab.llm

import com.ragekhab.search.SearchResult

data class LLMRequest(
    val question: String,
    val context: List<SearchResult>,
)

interface LLMProvider {
    val name: String
    fun answer(request: LLMRequest): String
}
