package com.ragekhab.document

import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ChunkerTest {
    @Test
    fun `generic chunks split oversized line-oriented sections`() {
        val chunks = Chunker().chunk(
            projectId = UUID.randomUUID(),
            projectName = "test",
            documentId = UUID.randomUUID(),
            documentName = "source-index.md",
            pages = listOf(ParsedPage(null, (1..300).joinToString("\n") { "- indexed/source/file-$it.kt" })),
        )

        assertTrue(chunks.size > 1)
        assertTrue(chunks.all { it.text.length <= 1_200 })
    }

    @Test
    fun `source chunks preserve code line breaks`() {
        val documentId = UUID.randomUUID()
        val source = """
            class ProjectService {
                fun list() {
                    return repository.list()
                }
            }
        """.trimIndent()

        val chunks = Chunker().chunkSource(
            projectId = UUID.randomUUID(),
            projectName = "RAG-E-Khab",
            documentId = documentId,
            documentName = "RAGEKHAB/ProjectService.kt",
            text = source,
        )

        assertEquals(1, chunks.size)
        assertEquals(source, chunks.single().text)
        assertTrue("\n    fun list()" in chunks.single().text)
    }
}
