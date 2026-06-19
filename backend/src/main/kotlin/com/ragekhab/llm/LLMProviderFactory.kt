package com.ragekhab.llm

import com.ragekhab.config.RuntimeSettingsService
import org.springframework.stereotype.Component

@Component
class LLMProviderFactory(
    providers: List<LLMProvider>,
    private val settingsService: RuntimeSettingsService,
) {
    private val byName = providers.associateBy { it.name.lowercase() }

    fun current(): LLMProvider =
        byName[settingsService.current().llm.provider.lowercase()]
            ?: error("Unsupported LLM provider '${settingsService.current().llm.provider}'. Available: ${byName.keys.sorted()}")

    fun available(): List<String> = byName.keys.sorted()
}
