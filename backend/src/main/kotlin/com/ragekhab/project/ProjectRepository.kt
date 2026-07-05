package com.ragekhab.project

import com.ragekhab.storage.AppStateStore
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

@Repository
class ProjectRepository(
    private val state: AppStateStore,
) {
    fun save(project: Project): Project {
        return state.put(STORE, project.id, project)
    }

    fun list(): List<Project> = state.list(STORE, Project::class.java).sortedBy { it.name.lowercase() }

    fun get(id: UUID): Project? = state.get(STORE, id, Project::class.java)

    fun delete(id: UUID): Boolean = state.delete(STORE, id)

    fun ensureDefault(): Project {
        val existing = list().firstOrNull { it.name == DEFAULT_PROJECT_NAME }
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
        private const val STORE = "projects"
        val DEFAULT_PROJECT_ID: UUID = UUID.fromString("00000000-0000-0000-0000-000000000001")
        const val DEFAULT_PROJECT_NAME = "General"
    }
}
