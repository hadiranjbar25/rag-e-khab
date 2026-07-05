package com.ragekhab.debug

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
class DebugSessionServiceTest {
    @Autowired
    private lateinit var service: DebugSessionService

    @Test
    fun `balanced log sanitizer masks secrets and labelled pii while preserving structure`() {
        val session = service.create("balanced sanitizer")

        val response = service.sanitize(
            session.id,
            SanitizeDebugRequest(
                inputType = DebugInputType.log,
                sourceName = "custom",
                mode = DebugSanitizerMode.balanced,
                rawText = "name=Jane Doe email jane@example.com ssn 123-45-6789 api_key=sk_test_1234567890abcdef at 42 Main Street",
            ),
        )

        assertTrue(response.sanitizedText.contains("name=PERSON_001"))
        assertTrue(response.sanitizedText.contains("EMAIL_001"))
        assertTrue(response.sanitizedText.contains("SSN_001"))
        assertTrue(response.sanitizedText.contains("api_key=SECRET_001"))
        assertTrue(response.sanitizedText.contains("ADDRESS_001"))
        assertFalse(response.sanitizedText.contains("Jane Doe"))
        assertFalse(response.sanitizedText.contains("jane@example.com"))
        assertFalse(response.sanitizedText.contains("123-45-6789"))
        assertFalse(response.sanitizedText.contains("sk_test_1234567890abcdef"))
        assertFalse(response.sanitizedText.contains("42 Main Street"))
    }

    @Test
    fun `permissive log sanitizer keeps low confidence names and addresses but warns`() {
        val session = service.create("permissive sanitizer")

        val response = service.sanitize(
            session.id,
            SanitizeDebugRequest(
                inputType = DebugInputType.log,
                sourceName = "custom",
                mode = DebugSanitizerMode.permissive,
                rawText = "customer=Jane Doe visited 42 Main Street and emailed jane@example.com",
            ),
        )

        assertTrue(response.sanitizedText.contains("Jane Doe"))
        assertTrue(response.sanitizedText.contains("42 Main Street"))
        assertTrue(response.sanitizedText.contains("EMAIL_001"))
        assertTrue(response.warnings.any { it.type == DebugWarningType.person_name })
        assertTrue(response.warnings.any { it.type == DebugWarningType.address })
    }

    @Test
    fun `csv sanitizer infers fuzzy field names and sanitizes pii inside notes`() {
        val session = service.create("fuzzy csv sanitizer")

        val response = service.sanitize(
            session.id,
            SanitizeDebugRequest(
                inputType = DebugInputType.csv,
                sourceName = "custom",
                rawText = "customerEmail,fullName,apiToken,note\njane@example.com,Jane Doe,sk_test_1234567890abcdef,\"Called jane@example.com about retry\"",
            ),
        )

        assertTrue(response.sanitizedText.contains("EMAIL_001"))
        assertTrue(response.sanitizedText.contains("PERSON_001"))
        assertTrue(response.sanitizedText.contains("SECRET_001"))
        assertTrue(response.sanitizedText.contains("Called EMAIL_001 about retry"))
        assertFalse(response.sanitizedText.contains("jane@example.com"))
        assertFalse(response.sanitizedText.contains("Jane Doe"))
        assertFalse(response.sanitizedText.contains("sk_test_1234567890abcdef"))
    }
}
