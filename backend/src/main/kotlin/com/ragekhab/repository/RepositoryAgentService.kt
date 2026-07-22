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
    private val repositoryCatalog: RepositoryCatalogStore,
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
        val project = resolveProject(request.projectId, repositoryName, root)
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
            val previousProjectId = previous?.let { documentRepository.get(it.documentId)?.document?.projectId }
            if (previous != null && !previous.deleted && previous.contentHash == file.contentHash && previousProjectId == project.id) {
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
            metadataStore.activeForRoot(root)
                .filter {
                    !it.repository.equals(repositoryName, ignoreCase = true) ||
                        it.filePath !in activePaths
                }
                .map { deleteIndexedFile(it) }
        } else {
            emptyList()
        }
        val finishedAt = Instant.now()
        val repository = repositoryCatalog.upsert(
            name = repositoryName,
            path = root,
            language = primaryLanguage((indexed + metadataStore.activeForRepository(repositoryName, root)).map { it.language }),
            syncedAt = finishedAt,
        )
        repositoryCatalog.link(project.id, repository.id)

        return RepositoryScanResult(
            repositoryId = repository.id,
            repository = repositoryName,
            repositoryRoot = root,
            scannedFiles = if (request.complete && request.allPaths.isNotEmpty()) request.allPaths.size else request.files.size,
            indexedFiles = indexed.size,
            unchangedFiles = unchanged,
            deletedFiles = deleted.size,
            skippedFiles = skipped,
            startedAt = startedAt,
            finishedAt = finishedAt,
            indexed = indexed,
            deleted = deleted,
        )
    }

    fun scan(request: RepositoryScanRequest = RepositoryScanRequest()): RepositoryScanResult {
        val startedAt = Instant.now()
        val root = resolveRoot(request.path)
        val repositoryName = resolveRepositoryName(request, root)
        val project = resolveProject(request.projectId, repositoryName, root.invariantSeparatorsPathString)
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
        val finishedAt = Instant.now()
        val repository = repositoryCatalog.upsert(
            name = repositoryName,
            path = root.invariantSeparatorsPathString,
            language = primaryLanguage(discovered.map { it.language } + metadataStore.activeForRepository(repositoryName, root.invariantSeparatorsPathString).map { it.language }),
            syncedAt = finishedAt,
        )
        repositoryCatalog.link(project.id, repository.id)

        return RepositoryScanResult(
            repositoryId = repository.id,
            repository = repositoryName,
            repositoryRoot = root.invariantSeparatorsPathString,
            scannedFiles = discovered.size,
            indexedFiles = indexed.size,
            unchangedFiles = unchanged,
            deletedFiles = deleted.size,
            skippedFiles = skipped,
            startedAt = startedAt,
            finishedAt = finishedAt,
            indexed = indexed,
            deleted = deleted,
        )
    }

    fun status(repository: String? = null): RepositoryAgentStatus {
        purgeDeletedRepositories()
        val requestedRepository = repository?.trim()?.takeIf { it.isNotBlank() }
        val documentIds = documentRepository.ids()
        metadataStore.deleteUnavailable(documentIds)
        val files = metadataStore.list()
            .filter {
                requestedRepository == null ||
                    effectiveRepositoryName(it).equals(requestedRepository, ignoreCase = true)
            }
        backfillRepositoryCatalog(files)
        val catalogRepositories = repositoryCatalog.list()
            .filter {
                requestedRepository == null ||
                    it.name.equals(requestedRepository, ignoreCase = true)
            }
        val repositories = if (repositoryCatalog.hasAny()) {
            catalogRepositories.map { catalogRepository ->
                val items = files.filter { effectiveRepositoryName(it).equals(catalogRepository.name, ignoreCase = true) }
                RepositoryAgentRepositoryStatus(
                    repositoryId = catalogRepository.id,
                    repository = catalogRepository.name,
                    repositoryRoot = catalogRepository.path,
                    language = catalogRepository.language,
                    status = catalogRepository.status,
                    trackedFiles = items.size,
                    deletedFiles = 0,
                    lastIndexedAt = catalogRepository.lastSyncedAt ?: items.maxOfOrNull { it.indexedAt },
                    projectIds = repositoryCatalog.linksForRepository(catalogRepository.id).map { it.projectId },
                )
            }
        } else {
            files
                .groupBy { effectiveRepositoryName(it) to it.repositoryRoot }
                .map { (key, items) ->
                    val repositoryId = RepositoryCatalogStore.stableRepositoryId(key.first, key.second)
                    RepositoryAgentRepositoryStatus(
                        repositoryId = repositoryId,
                        repository = key.first,
                        repositoryRoot = key.second,
                        language = primaryLanguage(items.map { it.language }),
                        status = "synced",
                        trackedFiles = items.size,
                        deletedFiles = 0,
                        lastIndexedAt = items.maxOfOrNull { it.indexedAt },
                        projectIds = emptyList(),
                    )
                }
        }
            .sortedWith(compareBy<RepositoryAgentRepositoryStatus> { it.repository.lowercase() }.thenBy { it.repositoryRoot })
        return RepositoryAgentStatus(
            configuredPath = settingsService.current().repositoryAgent.path.takeIf { it.isNotBlank() },
            trackedFiles = files.size,
            deletedFiles = 0,
            lastIndexedAt = files.maxOfOrNull { it.indexedAt },
            repositories = repositories,
            files = files,
        )
    }

    fun deleteRepository(repositoryId: UUID): RepositoryDeleteResult {
        backfillRepositoryCatalog(metadataStore.list())
        val repository = repositoryCatalog.get(repositoryId) ?: legacyRepository(repositoryId)
            ?: error("Repository not found.")
        val deletedIndexedKnowledge = deleteRepositoryKnowledge(repository)
        repositoryCatalog.deleteRepository(repositoryId)
        return RepositoryDeleteResult(
            deleted = true,
            repositoryId = repositoryId,
            repositoryName = repository.name,
            deletedIndexedKnowledge = deletedIndexedKnowledge,
        )
    }

    private fun purgeDeletedRepositories() {
        val activeRoots = repositoryCatalog.list().map { it.path }.filter { it.isNotBlank() }.toSet()
        repositoryCatalog.listDeleted().forEach { repository ->
            if (repository.path !in activeRoots) {
                deleteRepositoryKnowledge(repository)
            }
            repositoryCatalog.deleteRepository(repository.id)
        }
    }

    private fun deleteRepositoryKnowledge(repository: Repository): Int {
        val metadata = metadataStore.listRepository(repository.name, repository.path)
        val documentIds = metadata.map { it.documentId }
        vectorIndex.deleteDocuments(documentIds)
        documentRepository.deleteAll(documentIds)
        return metadataStore.deleteRepository(repository.name, repository.path)
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

    private fun backfillRepositoryCatalog(files: List<RepositoryFileMetadata>) {
        files
            .groupBy { effectiveRepositoryName(it) to it.repositoryRoot }
            .forEach { (key, items) ->
                val id = RepositoryCatalogStore.stableRepositoryId(key.first, key.second)
                val existing = repositoryCatalog.get(id)
                if (existing == null) {
                    val activeItems = items.filter { !it.deleted }
                    val repository = repositoryCatalog.upsert(
                        name = key.first,
                        path = key.second,
                        language = primaryLanguage(activeItems.ifEmpty { items }.map { it.language }),
                        syncedAt = items.maxOfOrNull { it.indexedAt } ?: Instant.now(),
                        status = if (activeItems.isNotEmpty()) "synced" else "deleted",
                    )
                    repositoryCatalog.link(projectService.defaultProject().id, repository.id)
                } else if (existing.status != "deleted" && repositoryCatalog.linksForRepository(existing.id).isEmpty()) {
                    repositoryCatalog.link(projectService.defaultProject().id, existing.id)
                }
            }
    }

    private fun legacyRepository(repositoryId: UUID): Repository? =
        metadataStore.list()
            .groupBy { effectiveRepositoryName(it) to it.repositoryRoot }
            .mapNotNull { (key, items) ->
                val id = RepositoryCatalogStore.stableRepositoryId(key.first, key.second)
                if (id != repositoryId) return@mapNotNull null
                repositoryCatalog.upsert(
                    name = key.first,
                    path = key.second,
                    language = primaryLanguage(items.filter { !it.deleted }.ifEmpty { items }.map { it.language }),
                    syncedAt = items.maxOfOrNull { it.indexedAt } ?: Instant.now(),
                    status = if (items.any { !it.deleted }) "synced" else "deleted",
                )
            }
            .firstOrNull()

    private fun primaryLanguage(languages: List<String>): String =
        languages
            .filter { it.isNotBlank() }
            .groupingBy { it }
            .eachCount()
            .maxByOrNull { it.value }
            ?.key
            ?: "mixed"

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
        val chunks = if (language in sourceLanguages) {
            chunker.chunkSource(projectId, projectName, documentId, displayName, text)
        } else {
            chunker.chunk(projectId, projectName, documentId, displayName, listOf(ParsedPage(null, text)))
        }
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
        metadataStore.delete(metadata.documentId)
        return metadata.copy(deleted = true, indexedAt = Instant.now())
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

    private fun resolveProject(explicitProjectId: UUID?, repositoryName: String, repositoryRoot: String): com.ragekhab.project.Project {
        explicitProjectId?.let { return projectService.requireProject(it) }

        val repositoryId = RepositoryCatalogStore.stableRepositoryId(repositoryName, repositoryRoot)
        repositoryCatalog.linksForRepository(repositoryId)
            .asSequence()
            .mapNotNull { projectService.get(it.projectId) }
            .firstOrNull { it.id != com.ragekhab.project.ProjectRepository.DEFAULT_PROJECT_ID }
            ?.let { return it }

        val normalizedRepository = repositoryName.normalizedIdentity()
        return projectService.list()
            .firstOrNull {
                it.id != com.ragekhab.project.ProjectRepository.DEFAULT_PROJECT_ID &&
                    it.name.normalizedIdentity() == normalizedRepository
            }
            ?: projectService.defaultProject()
    }

    private fun String.normalizedIdentity(): String =
        lowercase().filter(Char::isLetterOrDigit)

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
        val sourceLanguages = setOf(
            "kotlin", "java", "javascript", "typescript", "python", "go", "rust", "ruby", "php",
            "csharp", "cpp", "c", "swift", "scala", "sql",
        )
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
