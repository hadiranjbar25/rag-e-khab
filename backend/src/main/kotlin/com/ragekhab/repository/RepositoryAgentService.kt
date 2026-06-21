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
    fun sync(request: RepositorySyncRequest): RepositoryScanResult {
        val startedAt = Instant.now()
        val repositoryName = request.repository.trim().takeIf { it.isNotBlank() }
            ?: error("Repository name is required.")
        val root = request.repositoryRoot?.trim()?.takeIf { it.isNotBlank() } ?: "agent:$repositoryName"
        val project = projectService.findOrCreate(repositoryName, "Repository Agent index pushed from agent JAR.")
        val indexed = mutableListOf<RepositoryFileMetadata>()
        var unchanged = 0
        var skipped = 0

        request.files.forEach { file ->
            val relativePath = normalizeRelativePath(file.path)
            if (relativePath.isBlank() || file.content.isBlank()) {
                skipped += 1
                return@forEach
            }
            val documentId = stableDocumentId(repositoryName, relativePath)
            val previous = metadataStore.get(documentId)
            if (previous != null && !previous.deleted && previous.contentHash == file.contentHash) {
                unchanged += 1
                return@forEach
            }

            val language = file.language?.takeIf { it.isNotBlank() } ?: languageFor(Path.of(relativePath))
            val metadata = indexText(
                repositoryName = repositoryName,
                repositoryRoot = root,
                relativePath = relativePath,
                documentId = documentId,
                module = file.module?.takeIf { it.isNotBlank() } ?: moduleFor(relativePath),
                language = language,
                contentType = if (language == "markdown") "text/markdown" else "text/plain",
                lastModifiedAt = file.lastModifiedAt,
                sizeBytes = file.sizeBytes,
                contentHash = file.contentHash,
                text = file.content,
                projectId = project.id,
                projectName = project.name,
            )
            if (metadata == null) {
                skipped += 1
            } else {
                indexed += metadata
            }
        }

        val deleted = if (request.full && request.complete) {
            val activePaths = request.allPaths.map(::normalizeRelativePath).toSet()
            metadataStore.activeForRepository(repositoryName, root)
                .filter { it.filePath !in activePaths }
                .map { deleteIndexedFile(it) }
        } else {
            emptyList()
        }

        return RepositoryScanResult(
            repository = repositoryName,
            repositoryRoot = root,
            scannedFiles = if (request.complete && request.allPaths.isNotEmpty()) request.allPaths.size else request.files.size,
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

    fun scan(request: RepositoryScanRequest = RepositoryScanRequest()): RepositoryScanResult {
        val startedAt = Instant.now()
        val root = resolveRoot(request.path)
        val repositoryName = resolveRepositoryName(request, root)
        val project = projectService.findOrCreate(
            repositoryName,
            "Repository Agent index for ${root.invariantSeparatorsPathString}",
        )
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

            val metadata = indexText(
                repositoryName = repositoryName,
                repositoryRoot = root.invariantSeparatorsPathString,
                relativePath = candidate.relativePath,
                documentId = candidate.documentId,
                module = candidate.module,
                language = candidate.language,
                contentType = candidate.contentType,
                lastModifiedAt = candidate.lastModifiedAt,
                sizeBytes = candidate.sizeBytes,
                contentHash = candidate.contentHash,
                text = text,
                projectId = project.id,
                projectName = project.name,
            )
            if (metadata == null) {
                skipped += 1
                return@forEach
            }
            indexed += metadata
        }

        val deleted = metadataStore.activeForRoot(root.invariantSeparatorsPathString)
            .filter { it.documentId !in discoveredIds }
            .map(::deleteIndexedFile)

        return RepositoryScanResult(
            repository = repositoryName,
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

    fun status(repository: String? = null): RepositoryAgentStatus {
        val requestedRepository = repository?.trim()?.takeIf { it.isNotBlank() }
        val files = metadataStore.list()
            .filter {
                requestedRepository == null ||
                    effectiveRepositoryName(it).equals(requestedRepository, ignoreCase = true)
            }
        val repositories = files
            .groupBy { effectiveRepositoryName(it) to it.repositoryRoot }
            .map { (key, items) ->
                RepositoryAgentRepositoryStatus(
                    repository = key.first,
                    repositoryRoot = key.second,
                    trackedFiles = items.count { !it.deleted },
                    deletedFiles = items.count { it.deleted },
                    lastIndexedAt = items.maxOfOrNull { it.indexedAt },
                )
            }
            .sortedWith(compareBy<RepositoryAgentRepositoryStatus> { it.repository.lowercase() }.thenBy { it.repositoryRoot })
        return RepositoryAgentStatus(
            configuredPath = settingsService.current().repositoryAgent.path.takeIf { it.isNotBlank() },
            trackedFiles = files.count { !it.deleted },
            deletedFiles = files.count { it.deleted },
            lastIndexedAt = files.maxOfOrNull { it.indexedAt },
            repositories = repositories,
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

    private fun resolveRepositoryName(request: RepositoryScanRequest, root: Path): String =
        listOf(request.repository, request.name)
            .firstNotNullOfOrNull { it?.trim()?.takeIf(String::isNotBlank) }
            ?: repositoryNameFromRoot(root.invariantSeparatorsPathString)

    private fun repositoryNameFromRoot(root: String): String =
        Path.of(root).fileName?.toString()?.takeIf { it.isNotBlank() } ?: "repository"

    private fun effectiveRepositoryName(metadata: RepositoryFileMetadata): String =
        metadata.repository.ifBlank { repositoryNameFromRoot(metadata.repositoryRoot) }

    private fun normalizeRelativePath(path: String): String =
        path.replace('\\', '/')
            .trim()
            .removePrefix("./")
            .trim('/')

    private fun indexText(
        repositoryName: String,
        repositoryRoot: String,
        relativePath: String,
        documentId: UUID,
        module: String,
        language: String,
        contentType: String,
        lastModifiedAt: Instant,
        sizeBytes: Long,
        contentHash: String,
        text: String,
        projectId: UUID,
        projectName: String,
    ): RepositoryFileMetadata? {
        val displayName = "$repositoryName/$relativePath"
        val chunks = chunker.chunk(
            projectId,
            projectName,
            documentId,
            displayName,
            listOf(ParsedPage(null, text)),
        )
        if (chunks.isEmpty()) return null

        vectorIndex.deleteDocument(documentId)
        val document = KnowledgeDocument(
            id = documentId,
            projectId = projectId,
            projectName = projectName,
            name = displayName,
            format = if (language == "markdown") DocumentFormat.MARKDOWN else DocumentFormat.TEXT,
            contentType = contentType,
            sizeBytes = sizeBytes,
            createdAt = Instant.now(),
            chunkCount = chunks.size,
        )
        documentRepository.save(document, chunks)
        vectorIndex.upsert(chunks)

        val metadata = RepositoryFileMetadata(
            documentId = documentId,
            repository = repositoryName,
            repositoryRoot = repositoryRoot,
            filePath = relativePath,
            module = module,
            language = language,
            lastModifiedAt = lastModifiedAt,
            sizeBytes = sizeBytes,
            contentHash = contentHash,
            indexedAt = Instant.now(),
        )
        return metadataStore.save(metadata)
    }

    private fun deleteIndexedFile(metadata: RepositoryFileMetadata): RepositoryFileMetadata {
        vectorIndex.deleteDocument(metadata.documentId)
        documentRepository.delete(metadata.documentId)
        return metadataStore.save(metadata.copy(deleted = true, indexedAt = Instant.now()))
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

    private fun stableDocumentId(repository: String, relativePath: String): UUID =
        UUID.nameUUIDFromBytes("$repository:$relativePath".toByteArray(StandardCharsets.UTF_8))

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
