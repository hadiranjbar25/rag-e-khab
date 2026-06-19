package com.ragekhab.repository

import com.ragekhab.config.RuntimeSettingsService
import com.ragekhab.document.Chunker
import com.ragekhab.document.DocumentFormat
import com.ragekhab.document.DocumentRepository
import com.ragekhab.document.KnowledgeDocument
import com.ragekhab.document.ParsedPage
import com.ragekhab.project.ProjectService
import com.ragekhab.search.VectorIndex
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.nio.charset.CharacterCodingException
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.security.MessageDigest
import java.time.Instant
import java.util.UUID
import kotlin.io.path.extension
import kotlin.io.path.invariantSeparatorsPathString
import kotlin.io.path.isRegularFile
import kotlin.io.path.name

@Service
class RepositoryAgentService(
    private val settingsService: RuntimeSettingsService,
    private val metadataStore: RepositoryMetadataStore,
    private val chunker: Chunker,
    private val documentRepository: DocumentRepository,
    private val vectorIndex: VectorIndex,
    private val projectService: ProjectService,
) {
    fun scan(request: RepositoryScanRequest = RepositoryScanRequest()): RepositoryScanResult {
        val startedAt = Instant.now()
        val root = resolveRoot(request.path)
        val project = projectService.defaultProject()
        val discovered = discoverFiles(root)
        val discoveredIds = discovered.map { it.documentId }.toSet()
        val indexed = mutableListOf<RepositoryFileMetadata>()
        var unchanged = 0
        var skipped = 0

        discovered.forEach { candidate ->
            val previous = metadataStore.get(candidate.documentId)
            if (!request.full && previous != null && !previous.deleted && previous.contentHash == candidate.contentHash) {
                unchanged += 1
                return@forEach
            }

            val text = readText(candidate.absolutePath)
            if (text.isNullOrBlank()) {
                skipped += 1
                return@forEach
            }

            val displayName = candidate.relativePath
            val chunks = chunker.chunk(
                project.id,
                project.name,
                candidate.documentId,
                displayName,
                listOf(ParsedPage(null, text)),
            )
            if (chunks.isEmpty()) {
                skipped += 1
                return@forEach
            }

            vectorIndex.deleteDocument(candidate.documentId)
            val document = KnowledgeDocument(
                id = candidate.documentId,
                projectId = project.id,
                projectName = project.name,
                name = displayName,
                format = if (candidate.language == "markdown") DocumentFormat.MARKDOWN else DocumentFormat.TEXT,
                contentType = candidate.contentType,
                sizeBytes = candidate.sizeBytes,
                createdAt = Instant.now(),
                chunkCount = chunks.size,
            )
            documentRepository.save(document, chunks)
            vectorIndex.upsert(chunks)

            val metadata = RepositoryFileMetadata(
                documentId = candidate.documentId,
                repositoryRoot = root.invariantSeparatorsPathString,
                filePath = candidate.relativePath,
                module = candidate.module,
                language = candidate.language,
                lastModifiedAt = candidate.lastModifiedAt,
                sizeBytes = candidate.sizeBytes,
                contentHash = candidate.contentHash,
                indexedAt = Instant.now(),
            )
            metadataStore.save(metadata)
            indexed += metadata
        }

        val deleted = metadataStore.activeForRoot(root.invariantSeparatorsPathString)
            .filter { it.documentId !in discoveredIds }
            .map { metadata ->
                vectorIndex.deleteDocument(metadata.documentId)
                documentRepository.delete(metadata.documentId)
                metadataStore.save(metadata.copy(deleted = true, indexedAt = Instant.now()))
            }

        return RepositoryScanResult(
            repositoryRoot = root.invariantSeparatorsPathString,
            scannedFiles = discovered.size,
            indexedFiles = indexed.size,
            unchangedFiles = unchanged,
            deletedFiles = deleted.size,
            skippedFiles = skipped,
            startedAt = startedAt,
            finishedAt = Instant.now(),
            indexed = indexed,
            deleted = deleted,
        )
    }

    fun status(): RepositoryAgentStatus {
        val files = metadataStore.list()
        return RepositoryAgentStatus(
            configuredPath = settingsService.current().repositoryAgent.path.takeIf { it.isNotBlank() },
            trackedFiles = files.count { !it.deleted },
            deletedFiles = files.count { it.deleted },
            lastIndexedAt = files.maxOfOrNull { it.indexedAt },
            files = files,
        )
    }

    @Scheduled(fixedDelayString = "\${ragekhab.repository-agent.interval-ms:300000}")
    fun scheduledScan() {
        val settings = settingsService.current().repositoryAgent
        if (settings.scheduled && settings.path.isNotBlank()) {
            runCatching { scan(RepositoryScanRequest(full = false)) }
        }
    }

    private fun resolveRoot(path: String?): Path {
        val configured = path?.takeIf { it.isNotBlank() } ?: settingsService.current().repositoryAgent.path
        require(configured.isNotBlank()) { "Repository path is not configured." }
        val root = Path.of(configured).toAbsolutePath().normalize()
        require(Files.isDirectory(root)) { "Repository path does not exist or is not a directory: $root" }
        return root
    }

    private fun discoverFiles(root: Path): List<FileCandidate> =
        Files.walk(root).use { stream ->
            stream
                .filter { it.isRegularFile() }
                .filter { path -> !isIgnored(root.relativize(path)) }
                .filter { path -> isIndexable(path) }
                .map { path -> toCandidate(root, path) }
                .toList()
        }

    private fun toCandidate(root: Path, path: Path): FileCandidate {
        val relative = root.relativize(path).invariantSeparatorsPathString
        val bytes = Files.readAllBytes(path)
        return FileCandidate(
            absolutePath = path,
            relativePath = relative,
            documentId = stableDocumentId(root, relative),
            module = moduleFor(relative),
            language = languageFor(path),
            contentType = contentTypeFor(path),
            lastModifiedAt = Files.getLastModifiedTime(path).toInstant(),
            sizeBytes = bytes.size.toLong(),
            contentHash = sha256(bytes),
        )
    }

    private fun readText(path: Path): String? =
        try {
            StandardCharsets.UTF_8.newDecoder().decode(java.nio.ByteBuffer.wrap(Files.readAllBytes(path))).toString()
        } catch (_: CharacterCodingException) {
            null
        }

    private fun isIgnored(relative: Path): Boolean {
        val parts = relative.iterator().asSequence().map { it.toString() }.toSet()
        return parts.any { it in ignoredDirectories }
    }

    private fun isIndexable(path: Path): Boolean {
        val filename = path.name
        if (isSpecialFile(filename)) return true
        val extension = path.extension.lowercase()
        return extension in sourceExtensions || extension in markdownExtensions
    }

    private fun languageFor(path: Path): String {
        val filename = path.name
        if (isSpecialFile(filename)) return "markdown"
        return when (val extension = path.extension.lowercase()) {
            "kt", "kts" -> "kotlin"
            "java" -> "java"
            "js", "jsx" -> "javascript"
            "ts", "tsx" -> "typescript"
            "py" -> "python"
            "go" -> "go"
            "rs" -> "rust"
            "rb" -> "ruby"
            "php" -> "php"
            "cs" -> "csharp"
            "cpp", "cc", "cxx", "hpp", "h" -> "cpp"
            "c" -> "c"
            "swift" -> "swift"
            "scala" -> "scala"
            "sql" -> "sql"
            "yaml", "yml" -> "yaml"
            "json" -> "json"
            "xml" -> "xml"
            "md", "markdown" -> "markdown"
            else -> extension.ifBlank { "text" }
        }
    }

    private fun contentTypeFor(path: Path): String =
        if (languageFor(path) == "markdown") "text/markdown" else "text/plain"

    private fun isSpecialFile(filename: String): Boolean =
        specialFiles.any { it.equals(filename, ignoreCase = true) }

    private fun moduleFor(relativePath: String): String {
        val parts = relativePath.split('/').filter { it.isNotBlank() }
        return when {
            parts.isEmpty() -> "root"
            parts.size == 1 -> "root"
            parts.first() in moduleDirectories -> parts.first()
            else -> parts.first()
        }
    }

    private fun stableDocumentId(root: Path, relativePath: String): UUID =
        UUID.nameUUIDFromBytes("${root.invariantSeparatorsPathString}:$relativePath".toByteArray(StandardCharsets.UTF_8))

    private fun sha256(bytes: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        return digest.joinToString("") { "%02x".format(it.toInt() and 0xff) }
    }

    private data class FileCandidate(
        val absolutePath: Path,
        val relativePath: String,
        val documentId: UUID,
        val module: String,
        val language: String,
        val contentType: String,
        val lastModifiedAt: Instant,
        val sizeBytes: Long,
        val contentHash: String,
    )

    private companion object {
        val specialFiles = setOf("README.md", "AGENTS.md", "CLAUDE.md")
        val markdownExtensions = setOf("md", "markdown")
        val sourceExtensions = setOf(
            "kt", "kts", "java", "js", "jsx", "ts", "tsx", "py", "go", "rs", "rb", "php", "cs",
            "cpp", "cc", "cxx", "hpp", "h", "c", "swift", "scala", "sql", "yaml", "yml", "json", "xml",
        )
        val ignoredDirectories = setOf(
            ".git", ".gradle", ".idea", ".vscode", "build", "dist", "node_modules", "target", "out",
            ".next", ".nuxt", "coverage", ".cache",
        )
        val moduleDirectories = setOf("backend", "frontend", "app", "server", "client", "api", "docs", "docker")
    }
}
