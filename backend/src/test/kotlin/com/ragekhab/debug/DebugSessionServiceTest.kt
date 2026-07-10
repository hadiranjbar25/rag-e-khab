package com.ragekhab.debug

import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
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

    @Test
    fun `debug session compacts sanitized logs for agent context and keeps sanitized raw slices`() {
        val session = service.create("compact logs")
        val raw = buildString {
            repeat(40) { appendLine("2026-07-10T10:15:00Z INFO health check ok user jane@example.com") }
            appendLine("2026-07-10T10:16:00Z ERROR Failed payment for user jane@example.com orderId=ORDER_123")
            appendLine("java.lang.IllegalStateException: payment stuck")
            appendLine("    at com.acme.PaymentService.capture(PaymentService.java:77)")
            appendLine("2026-07-10T10:17:00Z INFO health check ok")
        }

        val response = service.sanitize(
            session.id,
            SanitizeDebugRequest(
                inputType = DebugInputType.log,
                sourceName = "backend.log",
                rawText = raw,
            ),
        )
        val mcpContext = service.contextForMcp(session.id)
        val compactArtifact = mcpContext.artifacts.first { it.id == response.artifact.id }
        val slice = service.artifactSlice(session.id, response.artifact.id, beforeLine = 41, afterLine = 43)

        assertFalse(response.artifact.sanitizedText.contains("jane@example.com"))
        assertContains(response.artifact.sanitizedText, "EMAIL_001")
        assertContains(compactArtifact.sanitizedText, "Failed payment")
        assertContains(compactArtifact.sanitizedText, "PaymentService.java:77")
        assertTrue(compactArtifact.sanitizedText.length < response.artifact.sanitizedText.length)
        assertEquals(response.artifact.compactText, compactArtifact.sanitizedText)
        assertContains(slice.text, "EMAIL_001")
        assertContains(slice.text, "IllegalStateException")
        assertFalse(slice.text.contains("jane@example.com"))
    }

    @Test
    fun `debug session suggests sanitized reusable memory lessons`() {
        val session = service.create("memory suggestions")

        service.recordAgentRequest(session.id, "Payment failed after ORDER_001 was archived")

        val detail = service.detail(session.id)
        val suggestion = detail.memorySuggestions.first()

        assertTrue(detail.memorySuggestions.isNotEmpty())
        assertContains(suggestion.content, "affected entity")
        assertFalse(suggestion.content.contains("ORDER_001"))
    }
}
