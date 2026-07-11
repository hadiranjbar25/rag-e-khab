package com.ragekhab.document

import org.springframework.mock.web.MockMultipartFile
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class DocumentParserTest {
    private val parser = DocumentParser()

    @Test
    fun `detects and extracts html with tika`() {
        val file = MockMultipartFile(
            "file",
            "notes.html",
            "text/html",
            """
                <html>
                  <body>
                    <h1>Supplier onboarding</h1>
                    <p>Tax ID validation rules live in the service layer.</p>
                  </body>
                </html>
            """.trimIndent().toByteArray(),
        )

        val format = parser.detectFormat(file)
        val pages = parser.parse(file, format)

        assertEquals(DocumentFormat.HTML, format)
        assertEquals(1, pages.size)
        assertTrue("Supplier onboarding" in pages.single().text)
        assertTrue("Tax ID validation" in pages.single().text)
    }

    @Test
    fun `detects csv as spreadsheet content`() {
        val file = MockMultipartFile(
            "file",
            "suppliers.csv",
            "text/csv",
            "id,name\n1,Acme".toByteArray(),
        )

        assertEquals(DocumentFormat.SPREADSHEET, parser.detectFormat(file))
    }

    @Test
    fun `keeps plain text as direct utf8 text`() {
        val file = MockMultipartFile(
            "file",
            "runbook.txt",
            "text/plain",
            "Restart workers after updating queue config.".toByteArray(),
        )

        val format = parser.detectFormat(file)
        val pages = parser.parse(file, format)

        assertEquals(DocumentFormat.TEXT, format)
        assertEquals("Restart workers after updating queue config.", pages.single().text)
    }
}
