package com.ragekhab.llm

import com.ragekhab.config.RagEKhabProperties
import org.springframework.stereotype.Component

@Component
class LLMProviderFactory(
    providers: List<LLMProvider>,
    private val properties: RagEKhabProperties,
) {
    private val byName = providers.associateBy { it.name.lowercase() }

    fun current(): LLMProvider =
        byName[properties.llm.provider.lowercase()]
            ?: error("Unsupported LLM provider '${properties.llm.provider}'. Available: ${byName.keys.sorted()}")

    fun available(): List<String> = byName.keys.sorted()
}
