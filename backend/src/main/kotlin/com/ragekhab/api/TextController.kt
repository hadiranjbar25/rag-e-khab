package com.ragekhab.api

import com.ragekhab.document.DocumentService
import com.ragekhab.document.KnowledgeDocument
import com.ragekhab.document.TextIngestionRequest
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/texts")
class TextController(private val documentService: DocumentService) {
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun addText(@RequestBody request: TextIngestionRequest): KnowledgeDocument =
        documentService.addText(request.title, request.text, request.projectId?.let(UUID::fromString))
}
