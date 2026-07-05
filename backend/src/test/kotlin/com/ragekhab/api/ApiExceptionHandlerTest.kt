package com.ragekhab.api

import kotlin.test.Test
import kotlin.test.assertEquals

class ApiExceptionHandlerTest {
    @Test
    fun `illegal argument returns readable bad request body`() {
        val response = ApiExceptionHandler().illegalArgument(IllegalArgumentException("projectId must be a valid UUID."))

        assertEquals(400, response.statusCode.value())
        assertEquals(400, response.body?.status)
        assertEquals("Bad Request", response.body?.error)
        assertEquals("projectId must be a valid UUID.", response.body?.message)
    }
}
