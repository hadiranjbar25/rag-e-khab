package com.ragekhab.document

import org.springframework.stereotype.Component
import java.util.UUID

@Component
class Chunker {
    fun chunk(projectId: UUID, projectName: String, documentId: UUID, documentName: String, pages: List<ParsedPage>): List<DocumentChunk> {
        var sequence = 0
        return pages.flatMap { page ->
            page.text
                .split(Regex("(?<=\\.)\\s+|\\n{2,}"))
                .flatMap { splitOversized(it.trim(), GENERIC_CHUNK_SIZE) }
                .fold(mutableListOf<String>()) { acc, part ->
                    val normalized = part.trim()
                    if (normalized.isBlank()) return@fold acc
                    val last = acc.lastOrNull()
                    if (last == null || last.length + normalized.length > GENERIC_CHUNK_SIZE) acc.add(normalized) else acc[acc.lastIndex] = "$last $normalized"
                    acc
                }
                .map { text ->
                    sequence += 1
                    DocumentChunk(
                        id = "$documentId:$sequence",
                        projectId = projectId,
                        projectName = projectName,
                        documentId = documentId,
                        documentName = documentName,
                        pageNumber = page.pageNumber,
                        text = text,
                    )
                }
        }
    }

    private fun splitOversized(text: String, limit: Int): List<String> {
        if (text.length <= limit) return listOf(text)
        val chunks = mutableListOf<String>()
        val current = StringBuilder()
        text.lineSequence().forEach { line ->
            if (line.length > limit) {
                if (current.isNotEmpty()) {
                    chunks += current.toString().trimEnd()
                    current.clear()
                }
                line.chunked(limit).forEach(chunks::add)
            } else {
                if (current.isNotEmpty() && current.length + line.length + 1 > limit) {
                    chunks += current.toString().trimEnd()
                    current.clear()
                }
                current.appendLine(line)
            }
        }
        if (current.isNotBlank()) chunks += current.toString().trimEnd()
        return chunks
    }

    fun chunkSource(
        projectId: UUID,
        projectName: String,
        documentId: UUID,
        documentName: String,
        text: String,
    ): List<DocumentChunk> {
        val parts = mutableListOf<String>()
        val current = StringBuilder()
        text.lineSequence().forEach { line ->
            if (current.isNotEmpty() && current.length + line.length + 1 > SOURCE_CHUNK_SIZE) {
                parts += current.toString().trimEnd()
                current.clear()
            }
            current.appendLine(line)
        }
        if (current.isNotBlank()) parts += current.toString().trimEnd()
        return parts.filter(String::isNotBlank).mapIndexed { index, source ->
            DocumentChunk(
                id = "$documentId:${index + 1}",
                projectId = projectId,
                projectName = projectName,
                documentId = documentId,
                documentName = documentName,
                pageNumber = null,
                text = source,
            )
        }
    }

    private companion object {
        const val GENERIC_CHUNK_SIZE = 1_200
        const val SOURCE_CHUNK_SIZE = 1_200
    }
}
