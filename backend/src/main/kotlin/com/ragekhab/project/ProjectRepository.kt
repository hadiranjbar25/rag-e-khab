package com.ragekhab.project

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.ragekhab.config.RagEKhabProperties
import org.springframework.stereotype.Repository
import java.nio.file.Files
import java.nio.file.Path
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Repository
class ProjectRepository(
    private val properties: RagEKhabProperties,
    private val mapper: ObjectMapper,
) {
    private val projects = ConcurrentHashMap<UUID, Project>()
    private val storagePath: Path = Path.of(properties.storageDir).resolve("projects.json")

    init {
        load()
    }

    fun save(project: Project): Project {
        projects[project.id] = project
        persist()
        return project
    }

    fun list(): List<Project> = projects.values.sortedBy { it.name.lowercase() }

    fun get(id: UUID): Project? = projects[id]

    fun delete(id: UUID): Boolean {
        val removed = projects.remove(id) != null
        if (removed) persist()
        return removed
    }

    fun ensureDefault(): Project {
        val existing = projects.values.firstOrNull { it.name == DEFAULT_PROJECT_NAME }
        if (existing != null) return existing
        return save(
            Project(
                id = DEFAULT_PROJECT_ID,
                name = DEFAULT_PROJECT_NAME,
                description = "Default project for ungrouped documents.",
                createdAt = Instant.now(),
            ),
        )
    }

    private fun load() {
        if (!Files.exists(storagePath)) return
        runCatching {
            val items = mapper.readValue(Files.readString(storagePath), object : TypeReference<List<Project>>() {})
            items.forEach { projects[it.id] = it }
        }
    }

    private fun persist() {
        Files.createDirectories(storagePath.parent)
        Files.writeString(
            storagePath,
            mapper.writerWithDefaultPrettyPrinter().writeValueAsString(projects.values.sortedBy { it.name.lowercase() }),
        )
    }

    companion object {
        val DEFAULT_PROJECT_ID: UUID = UUID.fromString("00000000-0000-0000-0000-000000000001")
        const val DEFAULT_PROJECT_NAME = "General"
    }
}
