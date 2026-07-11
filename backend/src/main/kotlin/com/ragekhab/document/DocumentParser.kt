package com.ragekhab.document

import org.apache.pdfbox.Loader
import org.apache.pdfbox.text.PDFTextStripper
import org.apache.tika.Tika
import org.apache.tika.exception.TikaException
import org.apache.tika.metadata.Metadata
import org.apache.tika.metadata.TikaCoreProperties
import org.apache.tika.parser.AutoDetectParser
import org.apache.tika.parser.ParseContext
import org.apache.tika.sax.BodyContentHandler
import org.springframework.stereotype.Component
import org.springframework.web.multipart.MultipartFile
import org.xml.sax.SAXException
import java.io.ByteArrayInputStream

data class ParsedPage(val pageNumber: Int?, val text: String)

@Component
class DocumentParser {
    private val detector = Tika()
    private val tikaParser = AutoDetectParser()

    fun detectFormat(file: MultipartFile): DocumentFormat {
        val name = file.originalFilename?.lowercase().orEmpty()
        val mediaType = runCatching { detector.detect(file.bytes, file.originalFilename) }
            .getOrElse { file.contentType.orEmpty() }
            .lowercase()
        return formatFor(name, mediaType)
    }

    fun parse(file: MultipartFile, format: DocumentFormat): List<ParsedPage> =
        when (format) {
            DocumentFormat.PDF -> parsePdf(file.bytes)
            DocumentFormat.MARKDOWN, DocumentFormat.TEXT -> listOf(ParsedPage(null, file.bytes.toString(Charsets.UTF_8)))
            DocumentFormat.WORD,
            DocumentFormat.PRESENTATION,
            DocumentFormat.SPREADSHEET,
            DocumentFormat.HTML,
            DocumentFormat.OTHER,
            -> parseWithTika(file)
        }

    private fun formatFor(name: String, mediaType: String): DocumentFormat =
        when {
            name.endsWith(".pdf") || mediaType == "application/pdf" -> DocumentFormat.PDF
            name.endsWith(".md") || name.endsWith(".markdown") || mediaType == "text/markdown" -> DocumentFormat.MARKDOWN
            name.endsWith(".txt") || mediaType.startsWith("text/plain") -> DocumentFormat.TEXT
            name.endsWith(".html") || name.endsWith(".htm") || mediaType.startsWith("text/html") -> DocumentFormat.HTML
            wordExtensions.any { name.endsWith(it) } || mediaType in wordMediaTypes -> DocumentFormat.WORD
            presentationExtensions.any { name.endsWith(it) } || mediaType in presentationMediaTypes -> DocumentFormat.PRESENTATION
            spreadsheetExtensions.any { name.endsWith(it) } || mediaType in spreadsheetMediaTypes -> DocumentFormat.SPREADSHEET
            mediaType.isNotBlank() && mediaType != "application/octet-stream" -> DocumentFormat.OTHER
            else -> error("Unsupported document format. Supported formats: PDF, Word, PowerPoint, spreadsheet, HTML, Markdown, and text.")
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

    private fun parseWithTika(file: MultipartFile): List<ParsedPage> {
        val handler = BodyContentHandler(-1)
        val metadata = Metadata().apply {
            file.originalFilename?.takeIf { it.isNotBlank() }?.let { set(TikaCoreProperties.RESOURCE_NAME_KEY, it) }
            file.contentType?.takeIf { it.isNotBlank() }?.let { set(Metadata.CONTENT_TYPE, it) }
        }
        try {
            ByteArrayInputStream(file.bytes).use { input ->
                tikaParser.parse(input, handler, metadata, ParseContext())
            }
        } catch (error: TikaException) {
            throw IllegalArgumentException("Could not extract text from '${file.originalFilename ?: "uploaded file"}'.", error)
        } catch (error: SAXException) {
            throw IllegalArgumentException("Could not extract text from '${file.originalFilename ?: "uploaded file"}'.", error)
        }
        return listOf(ParsedPage(null, handler.toString().trim()))
            .filter { it.text.isNotBlank() }
    }

    private companion object {
        val wordExtensions = setOf(".doc", ".docx", ".odt", ".rtf")
        val presentationExtensions = setOf(".ppt", ".pptx", ".odp")
        val spreadsheetExtensions = setOf(".xls", ".xlsx", ".ods", ".csv", ".tsv")
        val wordMediaTypes = setOf(
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.oasis.opendocument.text",
            "application/rtf",
            "text/rtf",
        )
        val presentationMediaTypes = setOf(
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/vnd.oasis.opendocument.presentation",
        )
        val spreadsheetMediaTypes = setOf(
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.oasis.opendocument.spreadsheet",
            "text/csv",
            "text/tab-separated-values",
        )
    }
}
