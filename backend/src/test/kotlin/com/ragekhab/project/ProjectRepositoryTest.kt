package com.ragekhab.project

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.ragekhab.config.RagEKhabProperties
import java.nio.file.Files
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class ProjectRepositoryTest {
    @Test
    fun `projects reload from storage`() {
        val storageDir = Files.createTempDirectory("ragekhab-projects")
        val properties = RagEKhabProperties(storageDir = storageDir.toString())
        val project = Project(
            id = UUID.randomUUID(),
            name = "Billing",
            description = "Billing service knowledge",
            createdAt = Instant.parse("2026-06-21T10:15:30Z"),
        )

        ProjectRepository(properties, mapper()).save(project)

        assertEquals(listOf(project), ProjectRepository(properties, mapper()).list())
    }

    @Test
    fun `deleted projects stay deleted after reload`() {
        val storageDir = Files.createTempDirectory("ragekhab-projects")
        val properties = RagEKhabProperties(storageDir = storageDir.toString())
        val project = Project(
            id = UUID.randomUUID(),
            name = "Billing",
            description = null,
            createdAt = Instant.parse("2026-06-21T10:15:30Z"),
        )
        val repository = ProjectRepository(properties, mapper())

        repository.save(project)
        repository.delete(project.id)

        assertNull(ProjectRepository(properties, mapper()).get(project.id))
    }

    private fun mapper(): ObjectMapper =
        ObjectMapper()
            .registerModule(JavaTimeModule())
            .findAndRegisterModules()
}
