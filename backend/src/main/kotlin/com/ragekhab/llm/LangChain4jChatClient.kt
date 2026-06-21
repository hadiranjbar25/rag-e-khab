package com.ragekhab.llm

import dev.langchain4j.model.ollama.OllamaChatModel
import org.springframework.stereotype.Component

@Component
class LangChain4jChatClient {
    fun ollama(baseUrl: String, model: String, prompt: String): String {
        val chatModel = OllamaChatModel.builder()
            .baseUrl(baseUrl)
            .modelName(model)
            .build()
        return chatModel.chat(prompt)
    }
}
