package com.ragekhab.project

import com.ragekhab.document.DocumentRepository
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

@Service
class ProjectService(
    private val projectRepository: ProjectRepository,
    private val documentRepository: DocumentRepository,
) {
    fun create(request: CreateProjectRequest): Project {
        val name = request.name.trim()
        require(name.isNotBlank()) { "Project name must not be blank." }
        return projectRepository.save(
            Project(
                id = UUID.randomUUID(),
                name = name,
                description = request.description?.trim()?.takeIf { it.isNotBlank() },
                createdAt = Instant.now(),
            ),
        )
    }

    fun list(): List<Project> {
        projectRepository.ensureDefault()
        val counts = documentRepository.list()
            .groupingBy { it.projectId }
            .eachCount()
        return projectRepository.list().map { project ->
            project.copy(documentCount = counts[project.id] ?: 0)
        }
    }

    fun get(id: UUID): Project? {
        projectRepository.ensureDefault()
        val project = projectRepository.get(id) ?: return null
        val count = documentRepository.list(project.id).size
        return project.copy(documentCount = count)
    }

    fun requireProject(id: UUID): Project =
        get(id) ?: error("Project not found")

    fun defaultProject(): Project = projectRepository.ensureDefault()
}
