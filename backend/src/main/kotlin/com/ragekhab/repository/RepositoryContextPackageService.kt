package com.ragekhab.repository

import com.ragekhab.document.DocumentRepository
import org.springframework.stereotype.Service
import java.nio.file.Files
import java.nio.file.Path
import java.time.Instant
import kotlin.io.path.invariantSeparatorsPathString
import kotlin.math.ceil

@Service
class RepositoryContextPackageService(
    private val metadataStore: RepositoryMetadataStore,
    private val documentRepository: DocumentRepository,
    private val memoryStore: RepositoryMemoryStore,
) {
    fun buildContextPackage(request: ContextRequest): ContextPackage {
        val repository = request.repositoryName()
        val levels = request.levels.ifEmpty {
            listOf(
                ContextLevel.repo_overview,
                ContextLevel.class_summary,
                ContextLevel.dependency_chain,
                ContextLevel.related_tests,
            )
        }.toSet()
        val maxTokens = request.maxTokens.coerceAtLeast(500)
        val files = metadataStore.list()
            .filter { !it.deleted }
            .filter { repository == null || it.repository.equals(repository, ignoreCase = true) }
        require(files.isNotEmpty()) { "No indexed repository files found${repository?.let { " for '$it'" } ?: ""}." }

        val sources = files.associateWith(::sourceFor)
        val classInfos = files.map { file -> classInfo(file, sources[file].orEmpty()) }
        val productionClasses = classInfos.filterNot { it.isTest }
        val testClasses = classInfos.filter { it.isTest }
        val enriched = attachRelationships(productionClasses, testClasses)
        val ranked = rank(enriched, request.task)

        val conventions = extractAndStoreConventions(repository ?: "all", classInfos)
        val snippetsRequested = request.includeRawSource ||
            ContextLevel.source_snippet in levels ||
            request.sourceSnippet != null ||
            request.filePath != null ||
            request.className != null ||
            request.method != null

        var remaining = maxTokens
        val repoOverview = if (ContextLevel.repo_overview in levels) {
            val overview = repoOverview(repository, files, classInfos)
            val cost = estimateTokens(overview)
            if (remaining - cost >= 0) {
                remaining -= cost
                overview
            } else {
                null
            }
        } else {
            null
        }

        val selectedClasses = mutableListOf<ClassInfo>()
        if (ContextLevel.class_summary in levels || ContextLevel.method_detail in levels) {
            ranked.forEach { candidate ->
                val cost = candidate.summaryTokenCost()
                if (remaining - cost >= 0) {
                    selectedClasses += candidate
                    remaining -= cost
                }
            }
        }
        if (selectedClasses.isEmpty()) selectedClasses += ranked.take(1)

        val chains = if (ContextLevel.dependency_chain in levels) {
            selectedClasses.flatMap { dependencyChains(it) }
                .distinct()
                .takeWhileBudget(::estimateTokens, remaining)
                .also { remaining -= estimateTokens(it.joinToString("\n")) }
        } else {
            emptyList()
        }

        val relatedTests = if (request.includeTests && ContextLevel.related_tests in levels) {
            selectedClasses.mapNotNull { classInfo ->
                val tests = classInfo.relatedTests.map { test ->
                    RelatedTestSummary(
                        name = test.className,
                        path = test.metadata.filePath,
                        covers = coveredMethods(classInfo, test.source),
                    )
                }
                if (tests.isEmpty()) null else RelatedTestContext(classInfo.className, tests)
            }.takeWhileBudget({ estimateTokens(it.toString()) }, remaining)
                .also { remaining -= estimateTokens(it.toString()) }
        } else {
            emptyList()
        }

        val selectedConventions = conventions
            .filter { convention -> convention.relevantTo(request.task) || selectedClasses.any { it.role in convention } }
            .ifEmpty { conventions.take(3) }
            .takeWhileBudget(::estimateTokens, remaining)
            .also { remaining -= estimateTokens(it.joinToString("\n")) }

        val snippets = if (snippetsRequested) {
            buildSnippets(request, selectedClasses, classInfos, files, sources)
                .takeWhileBudget({ estimateTokens(it.text) }, remaining)
        } else {
            emptyList()
        }

        val selectedFiles = (selectedClasses.map { it.metadata.filePath } + snippets.map { it.filePath }).toSet()
        val debug = ranked
            .filter { it.metadata.filePath in selectedFiles || selectedClasses.any { selected -> selected.metadata.filePath == it.metadata.filePath } }
            .map { ContextDebugSelection(it.metadata.filePath, it.selectionReason(), it.score) }

        val response = ContextPackage(
            summary = "Relevant context for ${request.task}",
            estimatedTokens = 0,
            repoOverview = repoOverview,
            relevantClasses = selectedClasses.map { it.toSummary() },
            dependencyChains = chains,
            relatedTests = relatedTests,
            projectConventions = selectedConventions,
            sourceSnippets = snippets,
            debug = debug,
        )
        return response.copy(estimatedTokens = estimateTokens(response.toString()))
    }

    private fun ContextRequest.repositoryName(): String? =
        listOf(repoId, repository).firstNotNullOfOrNull { it?.trim()?.takeIf(String::isNotBlank) }

    private fun sourceFor(metadata: RepositoryFileMetadata): String {
        val local = runCatching {
            val root = metadata.repositoryRoot.takeUnless { it.startsWith("agent:") } ?: return@runCatching null
            val path = Path.of(root).resolve(metadata.filePath).normalize()
            if (Files.isRegularFile(path)) Files.readString(path) else null
        }.getOrNull()
        if (!local.isNullOrBlank()) return local
        return documentRepository.get(metadata.documentId)?.chunks?.joinToString("\n\n") { it.text }.orEmpty()
    }

    private fun classInfo(metadata: RepositoryFileMetadata, source: String): ClassInfo {
        val fileName = metadata.filePath.substringAfterLast('/').substringBeforeLast('.')
        val className = declarationName(source) ?: fileName
        val packageName = packageRegex.find(source)?.groupValues?.get(1)
            ?: metadata.filePath.substringBeforeLast('/', "").replace('/', '.')
        return ClassInfo(
            metadata = metadata,
            source = source,
            className = className,
            packageName = packageName,
            role = roleFor(className, source, metadata.filePath),
            publicMethods = publicMethods(source),
            imports = importRegex.findAll(source).map { it.groupValues[1].substringAfterLast('.') }.toSet(),
            isTest = className.endsWith("Test") || "/test/" in metadata.filePath || metadata.filePath.contains("src/test"),
        )
    }

    private fun attachRelationships(production: List<ClassInfo>, tests: List<ClassInfo>): List<ClassInfo> {
        val names = production.map { it.className }.toSet()
        val withDepends = production.map { info ->
            val depends = names
                .filter { it != info.className }
                .filter { dependency -> dependency in info.imports || Regex("""\b${Regex.escape(dependency)}\b""").containsMatchIn(info.source) }
                .sorted()
            info.copy(dependsOn = depends)
        }
        return withDepends.map { info ->
            val usedBy = withDepends.filter { info.className in it.dependsOn }.map { it.className }.sorted()
            val relatedTests = tests.filter { test ->
                test.className.contains(info.className) || Regex("""\b${Regex.escape(info.className)}\b""").containsMatchIn(test.source)
            }
            info.copy(usedBy = usedBy, relatedTests = relatedTests)
        }
    }

    private fun rank(classes: List<ClassInfo>, task: String): List<ClassInfo> {
        val terms = task.normalizedTerms()
        return classes
            .map { info ->
                var score = 0.0
                val haystack = "${info.className} ${info.metadata.filePath} ${info.packageName} ${info.metadata.module}".lowercase()
                terms.forEach { term ->
                    if (info.className.lowercase().contains(term)) score += 8.0
                    if (info.packageName.lowercase().contains(term)) score += 4.0
                    if (haystack.contains(term)) score += 2.0
                    if (info.source.lowercase().contains(term)) score += 1.0
                }
                if (info.role.lowercase() in terms) score += 5.0
                if (info.relatedTests.isNotEmpty()) score += 2.0
                if (info.usedBy.isNotEmpty()) score += 1.5
                score += recencyBoost(info.metadata.indexedAt)
                info.copy(score = score)
            }
            .sortedWith(compareByDescending<ClassInfo> { it.score }.thenBy { it.metadata.filePath })
    }

    private fun recencyBoost(indexedAt: Instant): Double {
        val ageSeconds = (Instant.now().epochSecond - indexedAt.epochSecond).coerceAtLeast(0)
        return when {
            ageSeconds < 86_400 -> 1.0
            ageSeconds < 604_800 -> 0.5
            else -> 0.0
        }
    }

    private fun repoOverview(repository: String?, files: List<RepositoryFileMetadata>, classes: List<ClassInfo>): String {
        val language = files.groupingBy { it.language }.eachCount().maxByOrNull { it.value }?.key ?: "mixed"
        val roles = classes.groupingBy { it.role }.eachCount().entries.sortedByDescending { it.value }
            .joinToString(", ") { "${it.key.lowercase()}=${it.value}" }
        return "Repository ${repository ?: "selection"} has ${files.size} tracked files. Primary language: $language. Roles: $roles."
    }

    private fun dependencyChains(info: ClassInfo): List<String> {
        val outward = info.dependsOn.take(4).map { "${info.className} -> $it" }
        val inward = info.usedBy.take(3).map { "$it -> ${info.className}${info.dependsOn.firstOrNull()?.let { dep -> " -> $dep" } ?: ""}" }
        return outward + inward
    }

    private fun buildSnippets(
        request: ContextRequest,
        selectedClasses: List<ClassInfo>,
        classInfos: List<ClassInfo>,
        files: List<RepositoryFileMetadata>,
        sources: Map<RepositoryFileMetadata, String>,
    ): List<SourceSnippet> {
        val spec = request.sourceSnippet ?: SourceSnippetRequest(
            filePath = request.filePath,
            className = request.className,
            method = request.method,
            startLine = request.startLine,
            endLine = request.endLine,
        )
        val targets = when {
            spec.filePath != null -> files.filter { it.filePath.endsWith(spec.filePath) || it.filePath == spec.filePath }
            spec.className != null -> {
                val bySymbol = classInfos
                    .filter { it.className == spec.className }
                    .map { it.metadata }
                bySymbol.ifEmpty {
                    files.filter { it.filePath.substringAfterLast('/').substringBeforeLast('.') == spec.className }
                }
            }
            else -> selectedClasses.take(2).map { it.metadata }
        }
        return targets.mapNotNull { metadata ->
            val source = sources[metadata].orEmpty()
            if (source.isBlank()) return@mapNotNull null
            snippetFor(metadata.filePath, source, spec)
        }
    }

    private fun snippetFor(path: String, source: String, spec: SourceSnippetRequest): SourceSnippet {
        val lines = source.lines()
        val range = if (spec.method != null) {
            methodRange(lines, spec.method)
        } else {
            val start = (spec.startLine ?: 1).coerceIn(1, lines.size.coerceAtLeast(1))
            val end = (spec.endLine ?: (start + 40)).coerceIn(start, lines.size.coerceAtLeast(start))
            start to end
        }
        val text = lines.subList(range.first - 1, range.second).joinToString("\n").compressSource()
        return SourceSnippet(path, range.first, range.second, text)
    }

    private fun methodRange(lines: List<String>, method: String): Pair<Int, Int> {
        val startIndex = lines.indexOfFirst { Regex("""\b${Regex.escape(method)}\s*\(""").containsMatchIn(it) }
            .takeIf { it >= 0 }
            ?: 0
        var balance = 0
        var seenBrace = false
        for (index in startIndex until lines.size) {
            val line = lines[index]
            balance += line.count { it == '{' }
            if ('{' in line) seenBrace = true
            balance -= line.count { it == '}' }
            if (seenBrace && balance <= 0) return startIndex + 1 to index + 1
            if (!seenBrace && index > startIndex && methodStartRegex.containsMatchIn(line)) return startIndex + 1 to index
        }
        return startIndex + 1 to minOf(lines.size, startIndex + 40)
    }

    private fun publicMethods(source: String): List<String> {
        return methodRegexes.asSequence()
            .flatMap { regex -> regex.findAll(source).map { it.groupValues[1] } }
            .filterNot { it in ignoredMethodNames }
            .filterNot { it in languageKeywords }
            .distinct()
            .take(20)
            .toList()
    }

    private fun declarationName(source: String): String? =
        declarationRegexes.asSequence()
            .mapNotNull { regex -> regex.find(source)?.groupValues?.get(1) }
            .firstOrNull()

    private fun roleFor(className: String, source: String, path: String): String =
        when {
            "@RestController" in source || "@Controller" in source || className.endsWith("Controller") -> "CONTROLLER"
            "@Service" in source || className.endsWith("Service") -> "SERVICE"
            "@Repository" in source || className.endsWith("Repository") -> "REPOSITORY"
            "@Configuration" in source || className.endsWith("Config") || className.endsWith("Configuration") -> "CONFIGURATION"
            "@Entity" in source || className.endsWith("Entity") -> "ENTITY"
            className.endsWith("Validator") -> "VALIDATOR"
            className.endsWith("Test") || path.contains("src/test") -> "TEST"
            className.endsWith("Dto") || className.endsWith("DTO") || className.endsWith("Request") || className.endsWith("Response") -> "DTO"
            else -> "CLASS"
        }

    private fun coveredMethods(production: ClassInfo, testSource: String): List<String> =
        production.publicMethods.filter { Regex("""\b${Regex.escape(it)}\b""").containsMatchIn(testSource) }

    private fun extractAndStoreConventions(repository: String, classes: List<ClassInfo>): List<String> {
        val source = classes.joinToString("\n") { it.source }
        val conventions = buildList {
            if (classes.any { it.role == "CONTROLLER" } && classes.any { it.role == "SERVICE" }) {
                add("Architecture style: controllers delegate to services; services own business logic.")
            }
            if (classes.any { it.role == "REPOSITORY" }) add("Persistence style: repository classes abstract data access.")
            if (classes.any { it.className.endsWith("Request") || it.className.endsWith("Response") || it.className.endsWith("Dto") }) {
                add("DTO naming: request/response/DTO classes are named by API boundary role.")
            }
            if (classes.any { it.isTest }) add("Testing style: related tests use production class names with a Test suffix.")
            if ("@ControllerAdvice" in source || "ExceptionHandler" in source) add("Error handling style: centralized exception handling is used.")
            if ("db/migration" in classes.joinToString(" ") { it.metadata.filePath } || classes.any { it.metadata.language == "sql" }) {
                add("Database migration style: SQL/migration files are indexed as repository knowledge.")
            }
            val packages = classes.map { it.packageName }.filter { it.isNotBlank() }.distinct().take(6)
            if (packages.isNotEmpty()) add("Package conventions: ${packages.joinToString(", ")}.")
        }.distinct()
        memoryStore.save(RepositoryMemory(repository, conventions, Instant.now()))
        return conventions
    }

    private fun ClassInfo.toSummary(): CompactClassSummary =
        CompactClassSummary(
            className = className,
            role = role,
            path = metadata.filePath,
            purpose = purpose(),
            publicMethods = publicMethods,
            dependsOn = dependsOn,
            usedBy = usedBy,
            relatedTests = relatedTests.map { it.className },
        )

    private fun ClassInfo.purpose(): String =
        when (role) {
            "CONTROLLER" -> "$className exposes API/controller behavior and delegates to dependencies."
            "SERVICE" -> "$className contains application/business logic."
            "REPOSITORY" -> "$className provides persistence access."
            "VALIDATOR" -> "$className validates domain/input rules."
            "TEST" -> "$className verifies related production behavior."
            else -> "$className is a ${role.lowercase()} in ${metadata.module}."
        }

    private fun ClassInfo.selectionReason(): String {
        val reasons = mutableListOf<String>()
        if (score > 0) reasons += "task relevance"
        if (usedBy.isNotEmpty()) reasons += "used by ${usedBy.take(2).joinToString()}"
        if (dependsOn.isNotEmpty()) reasons += "depends on ${dependsOn.take(2).joinToString()}"
        if (relatedTests.isNotEmpty()) reasons += "has related test"
        return reasons.ifEmpty { listOf("ranked repository class") }.joinToString(" + ")
    }

    private fun ClassInfo.summaryTokenCost(): Int = estimateTokens(toSummary().toString())

    private fun String.normalizedTerms(): Set<String> =
        lowercase()
            .split(Regex("""[^a-z0-9]+"""))
            .map { it.trim() }
            .filter { it.length >= 3 && it !in stopWords }
            .toSet()

    private fun String.relevantTo(task: String): Boolean {
        val terms = task.normalizedTerms()
        return terms.any { lowercase().contains(it) }
    }

    private fun String.compressSource(): String =
        lines()
            .filterNot { it.trim().startsWith("import ") }
            .joinToString("\n")
            .replace(blockCommentRegex, "")
            .lines()
            .filterNot { it.trim().startsWith("//") }
            .filterNot { simpleGetterSetterRegex.containsMatchIn(it.trim()) }
            .joinToString("\n")
            .replace(Regex("""\n{3,}"""), "\n\n")
            .trim()

    private fun <T> List<T>.takeWhileBudget(cost: (T) -> Int, budget: Int): List<T> {
        var remaining = budget
        val output = mutableListOf<T>()
        for (item in this) {
            val itemCost = cost(item)
            if (remaining - itemCost < 0) break
            output += item
            remaining -= itemCost
        }
        return output
    }

    private fun estimateTokens(value: String): Int = ceil(value.length / 4.0).toInt().coerceAtLeast(1)

    private data class ClassInfo(
        val metadata: RepositoryFileMetadata,
        val source: String,
        val className: String,
        val packageName: String,
        val role: String,
        val publicMethods: List<String>,
        val imports: Set<String>,
        val isTest: Boolean,
        val dependsOn: List<String> = emptyList(),
        val usedBy: List<String> = emptyList(),
        val relatedTests: List<ClassInfo> = emptyList(),
        val score: Double = 0.0,
    )

    private companion object {
        val packageRegex = Regex("""(?m)^\s*package\s+([A-Za-z0-9_.]+)""")
        val importRegex = Regex("""(?m)^\s*import\s+([A-Za-z0-9_.*]+)""")
        val declarationRegexes = listOf(
            Regex("""(?m)^\s*(?:export\s+|public\s+|internal\s+|private\s+|protected\s+|abstract\s+|data\s+|sealed\s+|final\s+|open\s+)*(?:class|interface|enum|object|record|struct|trait|type)\s+([A-Za-z_][A-Za-z0-9_]*)"""),
            Regex("""(?m)^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\("""),
            Regex("""(?m)^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_][A-Za-z0-9_]*)\s*=>"""),
            Regex("""(?m)^\s*(?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\("""),
            Regex("""(?m)^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*\("""),
            Regex("""(?m)^\s*(?:pub\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\("""),
            Regex("""(?m)^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)\b"""),
        )
        val methodRegexes = listOf(
            Regex("""(?m)^\s*(?:public|protected)\s+(?:static\s+)?[A-Za-z0-9_<>, ?\[\].]+\s+([a-zA-Z_][A-Za-z0-9_]*)\s*\("""),
            Regex("""(?m)^\s*(?:public\s+|private\s+|protected\s+|internal\s+|override\s+|suspend\s+|inline\s+|operator\s+)*fun\s+([a-zA-Z_][A-Za-z0-9_]*)\s*\("""),
            Regex("""(?m)^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\("""),
            Regex("""(?m)^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_][A-Za-z0-9_]*)\s*=>"""),
            Regex("""(?m)^\s*(?:public|private|protected|static|async|readonly|\s)+([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*(?::\s*[A-Za-z0-9_<>, \[\]|.?]+)?\s*\{"""),
            Regex("""(?m)^\s{2,}([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*(?::\s*[A-Za-z0-9_<>, \[\]|.?]+)?\s*\{"""),
            Regex("""(?m)^\s*(?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\("""),
            Regex("""(?m)^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*\("""),
            Regex("""(?m)^\s*(?:pub\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\("""),
            Regex("""(?m)^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)\b"""),
            Regex("""(?m)^\s*(?:public|protected|private|static|async|override|virtual|sealed|extern|\s)+[A-Za-z0-9_<>, ?\[\].*&:]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*\("""),
            Regex("""(?m)^\s*(?:func|mutating\s+func|static\s+func)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\("""),
        )
        val methodStartRegex = Regex("""^\s*(?:public|protected|private|internal|override|static|async|function|const|let|var|fun|def|func|pub\s+fn|fn)\b""")
        val blockCommentRegex = Regex("""(?s)/\*.*?\*/""")
        val simpleGetterSetterRegex = Regex("""^(?:public\s+)?[A-Za-z0-9_<>, ?\[\].]+\s+(?:get|set|is)[A-Z][A-Za-z0-9_]*\s*\([^)]*\)\s*\{?\s*(?:return\s+[^;]+;?)?\s*}?\s*$""")
        val ignoredMethodNames = setOf("equals", "hashCode", "toString")
        val languageKeywords = setOf(
            "if", "for", "while", "switch", "catch", "return", "new", "class", "interface", "constructor",
        )
        val stopWords = setOf("add", "the", "and", "for", "with", "from", "this", "that", "into", "validation")
    }
}
