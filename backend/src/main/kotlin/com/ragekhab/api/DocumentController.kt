package com.ragekhab.api

import com.ragekhab.document.DocumentDetail
import com.ragekhab.document.DocumentService
import com.ragekhab.document.KnowledgeDocument
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@RestController
@RequestMapping("/api/documents")
class DocumentController(private val documentService: DocumentService) {
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun upload(@RequestPart("file") file: MultipartFile, @RequestParam(required = false) projectId: UUID?): KnowledgeDocument =
        documentService.upload(file, projectId)

    @GetMapping
    fun list(@RequestParam(required = false) projectId: UUID?): List<KnowledgeDocument> = documentService.list(projectId)

    @GetMapping("/{id}")
    fun get(@PathVariable id: UUID): DocumentDetail =
        documentService.get(id) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found")

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable id: UUID) {
        if (!documentService.delete(id)) throw ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found")
    }
}
