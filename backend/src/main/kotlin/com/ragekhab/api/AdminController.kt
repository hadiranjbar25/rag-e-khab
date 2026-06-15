package com.ragekhab.api

import com.ragekhab.config.RagEKhabProperties
import com.ragekhab.document.DocumentService
import com.ragekhab.llm.LLMProviderFactory
import com.ragekhab.search.IndexStats
import com.ragekhab.search.SemanticSearchService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

data class AdminStatus(
    val provider: String,
    val model: String,
    val availableProviders: List<String>,
    val qdrantUrl: String,
    val index: IndexStats,
)

@RestController
@RequestMapping("/api")
class AdminController(
    private val documentService: DocumentService,
    private val searchService: SemanticSearchService,
    private val providers: LLMProviderFactory,
    private val properties: RagEKhabProperties,
) {
    @PostMapping("/reindex")
    fun reindex() = documentService.reindex()

    @GetMapping("/admin/status")
    fun status() = AdminStatus(
        provider = providers.current().name,
        model = properties.llm.model,
        availableProviders = providers.available(),
        qdrantUrl = properties.qdrant.url,
        index = searchService.stats(),
    )
}
