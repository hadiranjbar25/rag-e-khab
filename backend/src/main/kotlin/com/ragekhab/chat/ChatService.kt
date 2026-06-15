package com.ragekhab.chat

import com.ragekhab.llm.LLMProviderFactory
import com.ragekhab.llm.LLMRequest
import com.ragekhab.search.SemanticSearchService
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class ChatService(
    private val searchService: SemanticSearchService,
    private val providerFactory: LLMProviderFactory,
) {
    fun ask(question: String, limit: Int = 8, projectId: UUID? = null): ChatResponse {
        require(question.isNotBlank()) { "Question must not be blank." }
        val sources = searchService.search(question, limit, projectId)
        val provider = providerFactory.current()
        return ChatResponse(
            answer = provider.answer(LLMRequest(question, sources)),
            sources = sources,
            provider = provider.name,
        )
    }
}
