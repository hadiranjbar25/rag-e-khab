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
                .fold(mutableListOf<String>()) { acc, part ->
                    val normalized = part.trim()
                    if (normalized.isBlank()) return@fold acc
                    val last = acc.lastOrNull()
                    if (last == null || last.length + normalized.length > 1_200) acc.add(normalized) else acc[acc.lastIndex] = "$last $normalized"
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
}
