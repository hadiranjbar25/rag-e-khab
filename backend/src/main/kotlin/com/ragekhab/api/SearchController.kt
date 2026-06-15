package com.ragekhab.api

import com.ragekhab.search.SearchRequest
import com.ragekhab.search.SearchResult
import com.ragekhab.search.SemanticSearchService
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/search")
class SearchController(private val searchService: SemanticSearchService) {
    @PostMapping
    fun search(@RequestBody request: SearchRequest): List<SearchResult> =
        searchService.search(request.query, request.limit, request.projectId?.let(UUID::fromString))
}
