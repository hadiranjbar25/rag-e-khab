package com.ragekhab.project

import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Repository
class ProjectRepository {
    private val projects = ConcurrentHashMap<UUID, Project>()

    fun save(project: Project): Project {
        projects[project.id] = project
        return project
    }

    fun list(): List<Project> = projects.values.sortedBy { it.name.lowercase() }

    fun get(id: UUID): Project? = projects[id]

    fun delete(id: UUID): Boolean = projects.remove(id) != null

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

    companion object {
        val DEFAULT_PROJECT_ID: UUID = UUID.fromString("00000000-0000-0000-0000-000000000001")
        const val DEFAULT_PROJECT_NAME = "General"
    }
}
