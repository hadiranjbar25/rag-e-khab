package com.ragekhab.api

import com.ragekhab.repository.Repository
import com.ragekhab.repository.RepositoryAgentService
import com.ragekhab.repository.RepositoryCatalogStore
import com.ragekhab.repository.RepositoryDeleteResult
import org.springframework.http.HttpStatus
import org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@RestController
@RequestMapping("/api/repositories")
class RepositoryController(
    private val repositoryCatalog: RepositoryCatalogStore,
    private val repositoryAgent: RepositoryAgentService,
) {
    @GetMapping
    fun list(): List<Repository> {
        repositoryAgent.status(null)
        return repositoryCatalog.list()
    }

    @GetMapping("/{id}")
    fun get(@PathVariable id: UUID): Repository =
        repositoryCatalog.get(id) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Repository not found")

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    fun delete(@PathVariable id: UUID): RepositoryDeleteResult =
        runCatching { repositoryAgent.deleteRepository(id) }
            .getOrElse {
                if (it.message == "Repository not found.") {
                    throw ResponseStatusException(HttpStatus.NOT_FOUND, it.message)
                }
                throw ResponseStatusException(INTERNAL_SERVER_ERROR, it.message ?: "Repository deletion failed")
            }
}
