package com.ragekhab.api

import com.ragekhab.config.RagEKhabProperties
import com.ragekhab.config.RuntimeSettings
import com.ragekhab.config.RuntimeSettingsService
import com.ragekhab.config.UpdateRuntimeSettingsRequest
import com.ragekhab.document.DocumentService
import com.ragekhab.llm.LLMProviderFactory
import com.ragekhab.search.IndexStats
import com.ragekhab.search.SemanticSearchService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

data class AdminStatus(
    val provider: String,
    val model: String,
    val availableProviders: List<String>,
    val qdrantUrl: String,
    val index: IndexStats,
    val settings: RuntimeSettings,
)

@RestController
@RequestMapping("/api")
class AdminController(
    private val documentService: DocumentService,
    private val searchService: SemanticSearchService,
    private val providers: LLMProviderFactory,
    private val properties: RagEKhabProperties,
    private val settingsService: RuntimeSettingsService,
) {
    @PostMapping("/reindex")
    fun reindex() = documentService.reindex()

    @GetMapping("/admin/status")
    fun status() = AdminStatus(
        provider = settingsService.current().llm.provider,
        model = settingsService.current().llm.model,
        availableProviders = providers.available(),
        qdrantUrl = properties.qdrant.url,
        index = searchService.stats(),
        settings = settingsService.current(),
    )

    @PutMapping("/admin/settings")
    fun updateSettings(@RequestBody request: UpdateRuntimeSettingsRequest): RuntimeSettings =
        settingsService.update(request)
}
