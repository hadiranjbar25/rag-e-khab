package com.ragekhab.repository

import com.ragekhab.storage.AppStateStore
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.util.UUID

@org.springframework.stereotype.Repository
class RepositoryCatalogStore(
    private val state: AppStateStore,
) {
    fun upsert(name: String, path: String, language: String, syncedAt: Instant, status: String = "synced"): com.ragekhab.repository.Repository {
        val id = stableRepositoryId(name, path)
        val repository = com.ragekhab.repository.Repository(
            id = id,
            name = name,
            path = path,
            language = language,
            lastSyncedAt = syncedAt,
            status = status,
        )
        return state.put(REPOSITORIES_STORE, id, repository)
    }

    fun list(): List<com.ragekhab.repository.Repository> =
        repositories()
            .filter { it.status != "deleted" }
            .sortedBy { it.name.lowercase() }

    fun listDeleted(): List<com.ragekhab.repository.Repository> =
        repositories().filter { it.status == "deleted" }

    fun hasAny(): Boolean = repositories().isNotEmpty()

    fun get(id: UUID): com.ragekhab.repository.Repository? = state.get(REPOSITORIES_STORE, id, com.ragekhab.repository.Repository::class.java)

    fun findByName(name: String): com.ragekhab.repository.Repository? =
        repositories().firstOrNull { it.name.equals(name, ignoreCase = true) }

    fun link(projectId: UUID, repositoryId: UUID): ProjectRepository {
        require(get(repositoryId) != null) { "Repository not found." }
        val link = ProjectRepository(projectId, repositoryId)
        return state.put(LINKS_STORE, linkKey(projectId, repositoryId), link)
    }

    fun unlink(projectId: UUID, repositoryId: UUID): Boolean = state.delete(LINKS_STORE, linkKey(projectId, repositoryId))

    fun linksForProject(projectId: UUID): List<ProjectRepository> =
        links().filter { it.projectId == projectId }

    fun linksForRepository(repositoryId: UUID): List<ProjectRepository> =
        links().filter { it.repositoryId == repositoryId }

    fun deleteLinksForProject(projectId: UUID): Int {
        val keys = links().filter { it.projectId == projectId }.map { linkKey(it.projectId, it.repositoryId) }
        keys.forEach { state.delete(LINKS_STORE, it) }
        return keys.size
    }

    fun deleteRepository(repositoryId: UUID): com.ragekhab.repository.Repository? {
        val removed = get(repositoryId)
        if (removed != null) {
            state.delete(REPOSITORIES_STORE, repositoryId)
            links()
                .filter { it.repositoryId == repositoryId }
                .map { linkKey(it.projectId, it.repositoryId) }
                .forEach { state.delete(LINKS_STORE, it) }
        }
        return removed
    }

    fun markDeleted(repositoryId: UUID): com.ragekhab.repository.Repository? {
        val repository = get(repositoryId) ?: return null
        val deleted = repository.copy(status = "deleted")
        state.put(REPOSITORIES_STORE, repositoryId, deleted)
        links()
            .filter { it.repositoryId == repositoryId }
            .map { linkKey(it.projectId, it.repositoryId) }
            .forEach { state.delete(LINKS_STORE, it) }
        return deleted
    }

    private fun repositories(): List<com.ragekhab.repository.Repository> =
        state.list(REPOSITORIES_STORE, com.ragekhab.repository.Repository::class.java)

    private fun links(): List<ProjectRepository> =
        state.list(LINKS_STORE, ProjectRepository::class.java)

    private fun linkKey(projectId: UUID, repositoryId: UUID): String = "$projectId:$repositoryId"

    companion object {
        private const val REPOSITORIES_STORE = "repositories"
        private const val LINKS_STORE = "repository-links"

        fun stableRepositoryId(name: String, path: String): UUID =
            UUID.nameUUIDFromBytes("${name.trim().lowercase()}:${path.trim()}".toByteArray(StandardCharsets.UTF_8))
    }
}
