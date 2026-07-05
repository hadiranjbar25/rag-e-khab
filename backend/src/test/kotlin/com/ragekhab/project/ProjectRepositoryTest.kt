package com.ragekhab.project

import com.ragekhab.testStateStore
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class ProjectRepositoryTest {
    @Test
    fun `projects reload from storage`() {
        val state = testStateStore()
        val project = Project(
            id = UUID.randomUUID(),
            name = "Billing",
            description = "Billing service knowledge",
            createdAt = Instant.parse("2026-06-21T10:15:30Z"),
        )

        ProjectRepository(state).save(project)

        assertEquals(listOf(project), ProjectRepository(state).list())
    }

    @Test
    fun `deleted projects stay deleted after reload`() {
        val state = testStateStore()
        val project = Project(
            id = UUID.randomUUID(),
            name = "Billing",
            description = null,
            createdAt = Instant.parse("2026-06-21T10:15:30Z"),
        )
        val repository = ProjectRepository(state)

        repository.save(project)
        repository.delete(project.id)

        assertNull(ProjectRepository(state).get(project.id))
    }
}
