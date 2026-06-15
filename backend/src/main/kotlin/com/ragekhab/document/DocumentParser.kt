package com.ragekhab.document

import org.apache.pdfbox.Loader
import org.apache.pdfbox.text.PDFTextStripper
import org.springframework.stereotype.Component
import org.springframework.web.multipart.MultipartFile

data class ParsedPage(val pageNumber: Int?, val text: String)

@Component
class DocumentParser {
    fun detectFormat(file: MultipartFile): DocumentFormat {
        val name = file.originalFilename?.lowercase().orEmpty()
        return when {
            name.endsWith(".pdf") -> DocumentFormat.PDF
            name.endsWith(".md") || name.endsWith(".markdown") -> DocumentFormat.MARKDOWN
            name.endsWith(".txt") || file.contentType?.startsWith("text/") == true -> DocumentFormat.TEXT
            else -> error("Unsupported document format. Supported formats: PDF, Markdown, Text.")
        }
    }

    fun parse(file: MultipartFile, format: DocumentFormat): List<ParsedPage> =
        when (format) {
            DocumentFormat.PDF -> parsePdf(file.bytes)
            DocumentFormat.MARKDOWN, DocumentFormat.TEXT -> listOf(ParsedPage(null, file.bytes.toString(Charsets.UTF_8)))
        }

    private fun parsePdf(bytes: ByteArray): List<ParsedPage> {
        Loader.loadPDF(bytes).use { document ->
            val stripper = PDFTextStripper()
            return (1..document.numberOfPages).map { page ->
                stripper.startPage = page
                stripper.endPage = page
                ParsedPage(page, stripper.getText(document).trim())
            }.filter { it.text.isNotBlank() }
        }
    }
}
