package com.ragekhab.api

import com.ragekhab.document.DocumentService
import com.ragekhab.project.CreateProjectRequest
import com.ragekhab.project.DeleteProjectResult
import com.ragekhab.project.Project
import com.ragekhab.project.ProjectRepository
import com.ragekhab.project.ProjectService
import com.ragekhab.repository.RepositoryMetadataStore
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@RestController
@RequestMapping("/api/projects")
class ProjectController(
    private val projectService: ProjectService,
    private val documentService: DocumentService,
    private val repositoryMetadataStore: RepositoryMetadataStore,
) {
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@RequestBody request: CreateProjectRequest): Project = projectService.create(request)

    @GetMapping
    fun list(): List<Project> = projectService.list()

    @GetMapping("/{id}")
    fun get(@PathVariable id: UUID): Project =
        projectService.get(id) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): DeleteProjectResult {
        if (id == ProjectRepository.DEFAULT_PROJECT_ID) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "The General project cannot be deleted")
        }
        val project = projectService.get(id) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
        val documents = documentService.list(id)
        val deletedDocuments = documents.count { documentService.delete(it.id) }
        val deletedRepositoryMetadata = repositoryMetadataStore.deleteRepository(project.name)
        val deleted = projectService.delete(id)
        return DeleteProjectResult(
            deleted = deleted,
            projectId = id,
            projectName = project.name,
            deletedDocuments = deletedDocuments,
            deletedRepositoryMetadata = deletedRepositoryMetadata,
        )
    }
}
