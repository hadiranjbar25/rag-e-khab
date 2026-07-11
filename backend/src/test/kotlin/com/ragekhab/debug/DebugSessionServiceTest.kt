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
        assertTrue(response.sanitizedText.contains("Called EMAIL_001 about retry"))
        assertFalse(response.sanitizedText.contains("jane@example.com"))
        assertFalse(response.sanitizedText.contains("Jane Doe"))
        assertFalse(response.sanitizedText.contains("sk_test_1234567890abcdef"))
    }

    @Test
    fun `csv sanitizer preserves quoted commas with real csv parser`() {
        val session = service.create("quoted csv sanitizer")

        val response = service.sanitize(
            session.id,
            SanitizeDebugRequest(
                inputType = DebugInputType.csv,
                sourceName = "visits",
                rawText = "user_id,location,note\n42,\"Berlin, Germany\",\"some text\"",
            ),
        )

        assertTrue(response.sanitizedText.contains("USER_001"))
        assertTrue(response.sanitizedText.contains("\"Berlin, Germany\""))
        assertTrue(response.sanitizedText.contains("some text"))
        assertFalse(response.sanitizedText.contains("\",\"Germany"))
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

    @Test
    fun `debug artifact comparison uses sanitized lines only`() {
        val session = service.create("artifact compare")
        val first = service.sanitize(
            session.id,
            SanitizeDebugRequest(
                inputType = DebugInputType.log,
                sourceName = "before.log",
                rawText = "INFO ok for jane@example.com\nERROR payment failed for jane@example.com",
            ),
        ).artifact
        val second = service.sanitize(
            session.id,
            SanitizeDebugRequest(
                inputType = DebugInputType.log,
                sourceName = "after.log",
                rawText = "INFO ok for jane@example.com\nERROR payment retried for jane@example.com\nWARN retry limit reached",
            ),
        ).artifact

        val comparison = service.compareArtifacts(session.id, first.id, second.id)
        val comparedText = (comparison.addedLines + comparison.removedLines).joinToString("\n") { it.text }

        assertTrue(comparison.totalChangedLines >= 2)
        assertContains(comparedText, "EMAIL_001")
        assertFalse(comparedText.contains("jane@example.com"))
    }

    @Test
    fun `project profile can keep safe custom fields and tokenize custom sensitive fields`() {
        val session = service.create("custom profile")
        val profile = SanitizationProfile(
            id = "project-commerce",
            name = "Commerce project",
            scope = SanitizationProfileScope.project,
            rules = listOf(
                SanitizationRule(
                    id = "project/internal-reference",
                    fieldPattern = "internal_customer_reference",
                    action = SanitizationAction.keep,
                    priority = 950,
                ),
                SanitizationRule(
                    id = "project/visit-motive",
                    fieldPattern = "visit_motive_id",
                    action = SanitizationAction.tokenize,
                    tokenType = "VISIT_MOTIVE",
                    priority = 950,
                ),
            ),
        )

        val response = service.sanitize(
            session.id,
            SanitizeDebugRequest(
                inputType = DebugInputType.csv,
                sourceName = "visits",
                rawText = "internal_customer_reference,visit_motive_id\nSAFE-REF,42",
                projectProfile = profile,
            ),
        )

        assertContains(response.sanitizedText, "SAFE-REF")
        assertContains(response.sanitizedText, "VISIT_MOTIVE_001")
        assertTrue(response.artifact.audit.any { it.field == "visit_motive_id" && it.matchedRule == "project/visit-motive" })
    }

    @Test
    fun `hard blocked secrets cannot be exposed by artifact override or mcp`() {
        val session = service.create("hard blocked")
        val unsafeOverride = SanitizationProfile(
            id = "artifact-unsafe",
            name = "Unsafe artifact",
            scope = SanitizationProfileScope.session,
            rules = listOf(
                SanitizationRule(
                    id = "artifact/keep-password",
                    fieldPattern = "password",
                    action = SanitizationAction.keep,
                    priority = 20_000,
                ),
                SanitizationRule(
                    id = "artifact/keep-cvv",
                    fieldPattern = "cvv",
                    action = SanitizationAction.keep,
                    priority = 20_000,
                ),
            ),
        )

        val response = service.sanitize(
            session.id,
            SanitizeDebugRequest(
                inputType = DebugInputType.csv,
                sourceName = "payments",
                rawText = "password,access_token,private_key,cvv,status\nsecret-pass,token-12345678901234567890,-----BEGIN PRIVATE KEY-----,123,failed",
                artifactProfile = unsafeOverride,
            ),
        )
        val mcpArtifact = service.contextForMcp(session.id).artifacts.first { it.id == response.artifact.id }

        assertFalse(response.sanitizedText.contains("secret-pass"))
        assertFalse(response.sanitizedText.contains("token-12345678901234567890"))
        assertFalse(response.sanitizedText.contains("PRIVATE KEY"))
        assertFalse(response.sanitizedText.contains("123"))
        assertFalse(mcpArtifact.sanitizedContent.contains("secret-pass"))
        assertTrue(response.artifact.audit.any { it.blocking && it.matchedRule.startsWith("built-in/hard-block") })
    }

    @Test
    fun `mcp artifact exposes sanitized summary without raw values`() {
        val session = service.create("mcp summary")
        val response = service.sanitize(
            session.id,
            SanitizeDebugRequest(
                inputType = DebugInputType.csv,
                sourceName = "users",
                rawText = "id,email,status\n2,jane@example.com,active",
            ),
        )

        val artifact = service.contextForMcp(session.id).artifacts.first { it.id == response.artifact.id }

        assertEquals("Balanced", artifact.profileName)
        assertTrue(artifact.summary.tokenized >= 1)
        assertContains(artifact.sanitizedContent, "USER_001")
        assertFalse(artifact.sanitizedContent.contains("jane@example.com"))
        assertFalse(artifact.audit.any { it.result == "jane@example.com" })
    }
}
