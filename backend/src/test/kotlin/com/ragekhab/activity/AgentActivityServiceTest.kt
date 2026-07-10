package com.ragekhab.activity

import com.ragekhab.testStateStore
import kotlin.test.Test
import kotlin.test.assertEquals

class AgentActivityServiceTest {
    @Test
    fun `activity list returns newest first with limit`() {
        val service = AgentActivityService(AgentActivityStore(testStateStore()))

        service.record(RecordActivityRequest(type = "mcp_tool", action = "recall_memory", detail = "first"))
        service.record(RecordActivityRequest(type = "mcp_tool", action = "optimize_context", detail = "second"))

        val activities = service.list(limit = 1)

        assertEquals(1, activities.size)
        assertEquals("optimize_context", activities.single().action)
        assertEquals(ActivityStatus.success, activities.single().status)
    }
}
