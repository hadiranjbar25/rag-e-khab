package com.ragekhab.api

import com.ragekhab.document.DocumentService
import com.ragekhab.project.CreateProjectRequest
import com.ragekhab.project.DeleteProjectResult
import com.ragekhab.project.Project
import com.ragekhab.project.ProjectHealthService
import com.ragekhab.project.ProjectRepository as ProjectStore
import com.ragekhab.project.ProjectService
import com.ragekhab.project.WorkspaceHealth
import com.ragekhab.repository.LinkRepositoryRequest
import com.ragekhab.repository.ProjectRepository as ProjectRepositoryLink
import com.ragekhab.repository.Repository
import com.ragekhab.repository.RepositoryCatalogStore
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
    private val projectHealthService: ProjectHealthService,
    private val documentService: DocumentService,
    private val repositoryCatalog: RepositoryCatalogStore,
) {
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@RequestBody request: CreateProjectRequest): Project = projectService.create(request)

    @GetMapping
    fun list(): List<Project> = projectService.list()

    @GetMapping("/{id}")
    fun get(@PathVariable id: UUID): Project =
        projectService.get(id) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")

    @GetMapping("/{id}/health")
    fun health(@PathVariable id: UUID): WorkspaceHealth =
        runCatching { projectHealthService.health(id) }
            .getOrElse { throw ResponseStatusException(HttpStatus.NOT_FOUND, it.message ?: "Project not found") }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): DeleteProjectResult {
        if (id == ProjectStore.DEFAULT_PROJECT_ID) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "The General project cannot be deleted")
        }
        val project = projectService.get(id) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
        val documents = documentService.list(id)
        val deletedDocuments = documents.count { documentService.delete(it.id) }
        val deletedRepositoryLinks = repositoryCatalog.deleteLinksForProject(id)
        val deleted = projectService.delete(id)
        return DeleteProjectResult(
            deleted = deleted,
            projectId = id,
            projectName = project.name,
            deletedDocuments = deletedDocuments,
            deletedRepositoryMetadata = 0,
            deletedRepositoryLinks = deletedRepositoryLinks,
        )
    }

    @GetMapping("/{id}/repositories")
    fun repositories(@PathVariable id: UUID): List<Repository> {
        projectService.get(id) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
        return repositoryCatalog.linksForProject(id).mapNotNull { repositoryCatalog.get(it.repositoryId) }
    }

    @PostMapping("/{id}/repositories")
    @ResponseStatus(HttpStatus.CREATED)
    fun linkRepository(@PathVariable id: UUID, @RequestBody request: LinkRepositoryRequest): ProjectRepositoryLink {
        projectService.get(id) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
        repositoryCatalog.get(request.repositoryId) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Repository not found")
        return repositoryCatalog.link(id, request.repositoryId)
    }

    @DeleteMapping("/{id}/repositories/{repositoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun unlinkRepository(@PathVariable id: UUID, @PathVariable repositoryId: UUID) {
        projectService.get(id) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
        if (!repositoryCatalog.unlink(id, repositoryId)) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Repository link not found")
        }
    }
}
