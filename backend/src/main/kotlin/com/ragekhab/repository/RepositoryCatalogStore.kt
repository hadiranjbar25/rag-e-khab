package com.ragekhab.repository

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.ragekhab.config.RagEKhabProperties
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@org.springframework.stereotype.Repository
class RepositoryCatalogStore(
    private val properties: RagEKhabProperties,
    private val mapper: ObjectMapper,
) {
    private val repositories = ConcurrentHashMap<UUID, com.ragekhab.repository.Repository>()
    private val links = ConcurrentHashMap<String, ProjectRepository>()
    private val storagePath: Path = Path.of(properties.storageDir).resolve("repositories.json")

    init {
        load()
    }

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
        repositories[id] = repository
        persist()
        return repository
    }

    fun list(): List<com.ragekhab.repository.Repository> =
        repositories.values
            .filter { it.status != "deleted" }
            .sortedBy { it.name.lowercase() }

    fun hasAny(): Boolean = repositories.isNotEmpty()

    fun get(id: UUID): com.ragekhab.repository.Repository? = repositories[id]

    fun findByName(name: String): com.ragekhab.repository.Repository? =
        repositories.values.firstOrNull { it.name.equals(name, ignoreCase = true) }

    fun link(projectId: UUID, repositoryId: UUID): ProjectRepository {
        require(repositories.containsKey(repositoryId)) { "Repository not found." }
        val link = ProjectRepository(projectId, repositoryId)
        links[linkKey(projectId, repositoryId)] = link
        persist()
        return link
    }

    fun unlink(projectId: UUID, repositoryId: UUID): Boolean {
        val removed = links.remove(linkKey(projectId, repositoryId)) != null
        if (removed) persist()
        return removed
    }

    fun linksForProject(projectId: UUID): List<ProjectRepository> =
        links.values.filter { it.projectId == projectId }

    fun linksForRepository(repositoryId: UUID): List<ProjectRepository> =
        links.values.filter { it.repositoryId == repositoryId }

    fun deleteLinksForProject(projectId: UUID): Int {
        val keys = links.values.filter { it.projectId == projectId }.map { linkKey(it.projectId, it.repositoryId) }
        keys.forEach(links::remove)
        if (keys.isNotEmpty()) persist()
        return keys.size
    }

    fun deleteRepository(repositoryId: UUID): com.ragekhab.repository.Repository? {
        val removed = repositories.remove(repositoryId)
        if (removed != null) {
            links.values
                .filter { it.repositoryId == repositoryId }
                .map { linkKey(it.projectId, it.repositoryId) }
                .forEach(links::remove)
            persist()
        }
        return removed
    }

    fun markDeleted(repositoryId: UUID): com.ragekhab.repository.Repository? {
        val repository = repositories[repositoryId] ?: return null
        val deleted = repository.copy(status = "deleted")
        repositories[repositoryId] = deleted
        links.values
            .filter { it.repositoryId == repositoryId }
            .map { linkKey(it.projectId, it.repositoryId) }
            .forEach(links::remove)
        persist()
        return deleted
    }

    private fun load() {
        if (!Files.exists(storagePath)) return
        runCatching {
            val stored = mapper.readValue(Files.readString(storagePath), StoredRepositoryCatalog::class.java)
            stored.repositories.forEach { repositories[it.id] = it }
            stored.links.forEach { links[linkKey(it.projectId, it.repositoryId)] = it }
        }.recoverCatching {
            val legacy = mapper.readValue(Files.readString(storagePath), object : TypeReference<List<com.ragekhab.repository.Repository>>() {})
            legacy.forEach { repositories[it.id] = it }
        }
    }

    private fun persist() {
        Files.createDirectories(storagePath.parent)
        val stored = StoredRepositoryCatalog(
            repositories = repositories.values.sortedBy { it.name.lowercase() },
            links = links.values.sortedWith(compareBy<ProjectRepository> { it.projectId }.thenBy { it.repositoryId }),
        )
        Files.writeString(storagePath, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(stored))
    }

    private fun linkKey(projectId: UUID, repositoryId: UUID): String = "$projectId:$repositoryId"

    companion object {
        fun stableRepositoryId(name: String, path: String): UUID =
            UUID.nameUUIDFromBytes("${name.trim().lowercase()}:${path.trim()}".toByteArray(StandardCharsets.UTF_8))
    }
}

private data class StoredRepositoryCatalog(
    val repositories: List<com.ragekhab.repository.Repository> = emptyList(),
    val links: List<ProjectRepository> = emptyList(),
)
