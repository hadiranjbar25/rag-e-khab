package com.ragekhab.artifact

import com.ragekhab.document.ArtifactKind
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ContextCompressorTest {
    @Test
    fun `test output compression preserves failed test and assertion details`() {
        val raw = """
            Downloading https://repo.maven.apache.org/maven2/org/example/noise.jar
            com.acme.SupplierServiceTest > createsSupplier PASSED
            com.acme.SupplierServiceTest > rejectsInvalidTaxId FAILED
                org.opentest4j.AssertionFailedError: expected: <VALID> but was: <INVALID>
                    at com.acme.SupplierServiceTest.rejectsInvalidTaxId(SupplierServiceTest.java:42)
            27 tests completed, 1 failed
            BUILD FAILED in 12s
        """.trimIndent()

        val compressed = TestOutputCompressor().compress(CompressionInput("gradle test", ArtifactKind.TEST_OUTPUT, raw))

        assertContains(compressed.text, "rejectsInvalidTaxId FAILED")
        assertContains(compressed.text, "AssertionFailedError")
        assertContains(compressed.text, "SupplierServiceTest.java:42")
        assertContains(compressed.text, "1 failed")
        assertFalse(compressed.text.contains("Downloading https://repo.maven.apache.org"))
        assertTrue(compressed.metrics.compressedTokenEstimate < compressed.metrics.rawTokenEstimate)
    }

    @Test
    fun `stack trace compression preserves exception class cause and top frames`() {
        val raw = """
            java.lang.IllegalStateException: Cannot onboard supplier
                at com.acme.SupplierService.createSupplier(SupplierService.java:88)
                at com.acme.SupplierController.create(SupplierController.java:31)
                at java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:103)
            Caused by: java.lang.IllegalArgumentException: taxId is invalid
                at com.acme.SupplierValidator.validateTaxId(SupplierValidator.java:17)
                at com.acme.SupplierService.createSupplier(SupplierService.java:82)
        """.trimIndent()

        val compressed = StackTraceCompressor().compress(CompressionInput("stack trace", ArtifactKind.STACK_TRACE, raw))

        assertContains(compressed.text, "IllegalStateException")
        assertContains(compressed.text, "Caused by: java.lang.IllegalArgumentException")
        assertContains(compressed.text, "SupplierService.java:88")
        assertContains(compressed.text, "SupplierValidator.java:17")
    }

    @Test
    fun `git diff compression keeps changed files and changed lines without unchanged body`() {
        val raw = """
            diff --git a/src/SupplierService.java b/src/SupplierService.java
            index 111..222 100644
            --- a/src/SupplierService.java
            +++ b/src/SupplierService.java
            @@ -10,7 +10,8 @@ class SupplierService {
                 void createSupplier(Request request) {
                     audit(request);
            -        repository.save(request);
            +        validator.validateTaxId(request.taxId());
            +        repository.save(request);
                 }
            }
        """.trimIndent()

        val compressed = GitDiffCompressor().compress(CompressionInput("diff", ArtifactKind.GIT_DIFF, raw))

        assertContains(compressed.text, "diff --git a/src/SupplierService.java b/src/SupplierService.java")
        assertContains(compressed.text, "+        validator.validateTaxId(request.taxId());")
        assertFalse(compressed.text.contains("audit(request);"))
    }
}
