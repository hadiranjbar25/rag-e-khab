package com.ragekhab.api

import com.ragekhab.project.CreateProjectRequest
import com.ragekhab.project.Project
import com.ragekhab.project.ProjectService
import org.springframework.http.HttpStatus
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
class ProjectController(private val projectService: ProjectService) {
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@RequestBody request: CreateProjectRequest): Project = projectService.create(request)

    @GetMapping
    fun list(): List<Project> = projectService.list()

    @GetMapping("/{id}")
    fun get(@PathVariable id: UUID): Project =
        projectService.get(id) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
}
