package com.ragekhab.agent

import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.awt.BorderLayout
import java.awt.Dimension
import java.awt.GridBagConstraints
import java.awt.GridBagLayout
import java.awt.Insets
import java.nio.ByteBuffer
import java.nio.charset.CharacterCodingException
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.security.MessageDigest
import java.time.Instant
import java.util.prefs.Preferences
import javax.swing.BorderFactory
import javax.swing.JButton
import javax.swing.JComboBox
import javax.swing.JFileChooser
import javax.swing.JFrame
import javax.swing.JLabel
import javax.swing.JOptionPane
import javax.swing.JPanel
import javax.swing.JScrollPane
import javax.swing.JTextArea
import javax.swing.JTextField
import javax.swing.SwingUtilities
import javax.swing.SwingWorker
import javax.swing.WindowConstants
import kotlin.io.path.extension
import kotlin.io.path.invariantSeparatorsPathString
import kotlin.io.path.isRegularFile
import kotlin.io.path.name

fun main(args: Array<String>) {
    if (args.isEmpty() || args.any { it == "--ui" }) {
        SwingUtilities.invokeLater { RepositoryAgentUi().isVisible = true }
        return
    }

    val options = CliOptions.parse(args)
    if (options.help) {
        println(usage())
        return
    }

    runRepositoryAgent(options) { println(it) }
}

private fun runRepositoryAgent(options: CliOptions, log: (String) -> Unit) {
    val root = options.path.toAbsolutePath().normalize()
    require(Files.isDirectory(root)) { "Repository path does not exist or is not a directory: $root" }

    val repository = root.fileName?.toString()?.takeIf { it.isNotBlank() }
        ?: error("Repository path must have a folder name.")
    val discovered = discoverFiles(root, options.maxFileBytes)
    val files = buildFocusedAgentContext(repository, root, discovered)
    log("RAG-e Khab agent scanning $repository at $root")
    log("Discovered ${discovered.size} indexable file(s)")
    log("Focused sync will send ${files.size} context artifact(s)")

    if (options.dryRun) {
        files.take(40).forEach { log("${it.path} (${it.language}, ${it.sizeBytes} bytes)") }
        if (files.size > 40) log("... ${files.size - 40} more")
        return
    }

    val client = HttpClient.newHttpClient()
    var indexed = 0
    var unchanged = 0
    var skipped = 0
    var deleted = 0
    var batchNumber = 1

    files.chunkByBytes(options.maxBatchBytes).forEach { batch ->
        val response = postSync(
            client = client,
            server = options.server,
            payload = syncPayload(
                repository = repository,
                repositoryRoot = root.invariantSeparatorsPathString,
                full = false,
                complete = false,
                allPaths = emptyList(),
                files = batch,
            ),
        )
        indexed += response.intField("indexedFiles")
        unchanged += response.intField("unchangedFiles")
        skipped += response.intField("skippedFiles")
        deleted += response.intField("deletedFiles")
        log("Batch ${batchNumber++}: ${batch.size} file(s), ${response.compact()}")
    }

    if (options.full) {
        val response = postSync(
            client = client,
            server = options.server,
            payload = syncPayload(
                repository = repository,
                repositoryRoot = root.invariantSeparatorsPathString,
                full = true,
                complete = true,
                allPaths = files.map { it.path },
                files = emptyList(),
            ),
        )
        deleted += response.intField("deletedFiles")
        log("Full-sync cleanup: ${response.compact()}")
    }

    log("Done. indexed=$indexed unchanged=$unchanged deleted=$deleted skipped=$skipped")
}

private data class CliOptions(
    val server: String = System.getenv("RAGEKHAB_URL") ?: "http://localhost:8060",
    val path: Path = Path.of("."),
    val full: Boolean = true,
    val dryRun: Boolean = false,
    val maxBatchBytes: Int = 4_000_000,
    val maxFileBytes: Long = 1_000_000,
    val help: Boolean = false,
) {
    companion object {
        fun parse(args: Array<String>): CliOptions {
            var options = CliOptions()
            var index = 0
            while (index < args.size) {
                val arg = args[index]
                fun value(): String {
                    require(index + 1 < args.size) { "Missing value for $arg" }
                    index += 1
                    return args[index]
                }
                options = when (arg) {
                    "--server" -> options.copy(server = value().trimEnd('/'))
                    "--path" -> options.copy(path = Path.of(value()))
                    "--full" -> options.copy(full = value().toBooleanStrictOrNull() ?: error("--full must be true or false"))
                    "--dry-run" -> options.copy(dryRun = true)
                    "--max-batch-bytes" -> options.copy(maxBatchBytes = value().toInt().coerceAtLeast(250_000))
                    "--max-file-bytes" -> options.copy(maxFileBytes = value().toLong().coerceAtLeast(10_000))
                    "--help", "-h" -> options.copy(help = true)
                    else -> error("Unknown argument: $arg")
                }
                index += 1
            }
            return options.copy(server = options.server.trimEnd('/'))
        }
    }
}

private class RepositoryAgentUi : JFrame("RAG-e Khab Repository Agent") {
    private val preferences = Preferences.userNodeForPackage(RepositoryAgentUi::class.java)
    private val serverField = JTextField(preferences.get("server", System.getenv("RAGEKHAB_URL") ?: "http://localhost:8060"))
    private val pathBox = JComboBox(recentPaths().toTypedArray()).apply {
        isEditable = true
        selectedItem = Path.of(".").toAbsolutePath().normalize().toString()
    }
    private val runButton = JButton("Run sync")
    private val output = JTextArea().apply {
        isEditable = false
        lineWrap = true
        wrapStyleWord = true
        rows = 12
    }

    init {
        defaultCloseOperation = WindowConstants.EXIT_ON_CLOSE
        minimumSize = Dimension(620, 430)
        contentPane = JPanel(BorderLayout(12, 12)).apply {
            border = BorderFactory.createEmptyBorder(14, 14, 14, 14)
            add(formPanel(), BorderLayout.NORTH)
            add(JScrollPane(output), BorderLayout.CENTER)
        }
        runButton.addActionListener { runSync() }
        pack()
        setLocationRelativeTo(null)
    }

    private fun formPanel(): JPanel {
        val panel = JPanel(GridBagLayout())
        var row = 0
        panel.addRow(row++, "Server", serverField)
        panel.addPathRow(row++)
        panel.addRunRow(row)
        return panel
    }

    private fun JPanel.addPathRow(row: Int) {
        add(JLabel("Repository path"), labelConstraints(row))
        add(pathBox, fieldConstraints(row, weightX = 1.0))
        add(JButton("Browse").apply {
            addActionListener { choosePath() }
        }, GridBagConstraints().apply {
            gridx = 2
            gridy = row
            insets = Insets(4, 6, 4, 0)
            fill = GridBagConstraints.HORIZONTAL
        })
    }

    private fun JPanel.addRunRow(row: Int) {
        add(runButton, fieldConstraints(row, gridWidth = 2, weightX = 1.0))
    }

    private fun JPanel.addRow(row: Int, label: String, field: java.awt.Component) {
        add(JLabel(label), labelConstraints(row))
        add(field, fieldConstraints(row, gridWidth = 2, weightX = 1.0))
    }

    private fun labelConstraints(row: Int): GridBagConstraints =
        GridBagConstraints().apply {
            gridx = 0
            gridy = row
            anchor = GridBagConstraints.WEST
            insets = Insets(4, 0, 4, 8)
        }

    private fun fieldConstraints(row: Int, gridWidth: Int = 1, weightX: Double = 0.0): GridBagConstraints =
        GridBagConstraints().apply {
            gridx = 1
            gridy = row
            gridwidth = gridWidth
            this.weightx = weightX
            fill = GridBagConstraints.HORIZONTAL
            insets = Insets(4, 0, 4, 0)
        }

    private fun choosePath() {
        val chooser = JFileChooser((pathBox.selectedItem as? String)?.takeIf { it.isNotBlank() } ?: ".")
        chooser.fileSelectionMode = JFileChooser.DIRECTORIES_ONLY
        if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
            pathBox.selectedItem = chooser.selectedFile.toPath().toAbsolutePath().normalize().toString()
        }
    }

    private fun runSync() {
        val path = (pathBox.selectedItem as? String)?.trim().orEmpty()
        val server = serverField.text.trim().trimEnd('/')
        if (path.isBlank() || server.isBlank()) {
            JOptionPane.showMessageDialog(this, "Server and repository path are required.", "Missing settings", JOptionPane.WARNING_MESSAGE)
            return
        }
        val options = CliOptions(
            server = server,
            path = Path.of(path),
        )
        remember(server, path)
        output.text = ""
        runButton.isEnabled = false
        object : SwingWorker<Unit, String>() {
            override fun doInBackground() {
                runRepositoryAgent(options) { publish(it) }
            }

            override fun process(chunks: MutableList<String>) {
                chunks.forEach { line ->
                    output.append(line)
                    output.append(System.lineSeparator())
                }
                output.caretPosition = output.document.length
            }

            override fun done() {
                runButton.isEnabled = true
                runCatching { get() }.onFailure { error ->
                    output.append("Error: ${error.cause?.message ?: error.message ?: "Sync failed"}${System.lineSeparator()}")
                    output.caretPosition = output.document.length
                }
            }
        }.execute()
    }

    private fun recentPaths(): List<String> {
        val stored = preferences.get("recentPaths", "").split('|').filter { it.isNotBlank() }
        val current = Path.of(".").toAbsolutePath().normalize().toString()
        return (listOf(current) + stored).distinct().take(8)
    }

    private fun remember(server: String, path: String) {
        preferences.put("server", server)
        val paths = (listOf(path) + recentPaths()).distinct().take(8)
        preferences.put("recentPaths", paths.joinToString("|"))
    }
}

private data class AgentFile(
    val path: String,
    val module: String,
    val language: String,
    val lastModifiedAt: Instant,
    val sizeBytes: Long,
    val contentHash: String,
    val content: String,
)

private fun discoverFiles(root: Path, maxFileBytes: Long): List<AgentFile> =
    Files.walk(root).use { stream ->
        stream
            .filter { it.isRegularFile() }
            .filter { path -> !isIgnored(root.relativize(path)) }
            .filter { path -> isIndexable(path) }
            .map { path -> toAgentFile(root, path, maxFileBytes) }
            .filter { it != null }
            .map { it!! }
            .toList()
    }

private fun toAgentFile(root: Path, path: Path, maxFileBytes: Long): AgentFile? {
    val size = Files.size(path)
    if (size > maxFileBytes) return null
    val bytes = Files.readAllBytes(path)
    val content = readUtf8(bytes) ?: return null
    val relative = root.relativize(path).invariantSeparatorsPathString
    return AgentFile(
        path = relative,
        module = moduleFor(relative),
        language = languageFor(path),
        lastModifiedAt = Files.getLastModifiedTime(path).toInstant(),
        sizeBytes = size,
        contentHash = sha256(bytes),
        content = content,
    )
}

private fun buildFocusedAgentContext(repository: String, root: Path, files: List<AgentFile>): List<AgentFile> {
    val artifacts = mutableListOf<AgentFile>()
    artifacts += virtualFile(
        path = ".ragekhab/repository-map.md",
        content = repositoryMap(repository, root, files),
    )
    artifacts += virtualFile(
        path = ".ragekhab/source-index.md",
        content = sourceIndex(files),
    )
    files.groupBy { it.module }
        .toSortedMap()
        .forEach { (module, moduleFiles) ->
            artifacts += virtualFile(
                path = ".ragekhab/modules/${module.sanitizePathSegment()}.md",
                content = moduleSummary(module, moduleFiles),
            )
        }
    artifacts += files
        .filter {
            !it.isLockFile() &&
                (it.isKnowledgeFile() || it.isBuildConfigFile() || (it.isBestPracticeFile() && !it.isSourceFile()))
        }
        .sortedWith(compareBy<AgentFile> { it.path.depth() }.thenBy { it.path })
        .take(40)
        .map { it.copy(path = ".ragekhab/selected/${it.path}") }
    artifacts += files
        .filter { it.isSourceFile() && !it.isLockFile() }
        .sortedBy { it.path }
        .map { file ->
            virtualFile(
                path = ".ragekhab/source/${file.path}.md",
                content = focusedSourceContext(file),
            ).copy(module = file.module, language = file.language)
        }
    return artifacts.distinctBy { it.path }
}

private fun focusedSourceContext(file: AgentFile): String = buildString {
    val lines = file.content.lines()
    val declarations = lines.mapIndexedNotNull { index, line ->
        file.declarationLabel(line)?.let { index to it }
    }.distinctBy { it.first }
    val structuralLines = lines
        .filter { line ->
            val trimmed = line.trim()
            trimmed.startsWith("package ") ||
                trimmed.startsWith("import ") ||
                trimmed.startsWith("from ") ||
                trimmed.startsWith("#include ") ||
                "require(" in trimmed
        }
        .take(30)

    appendLine("# Focused Source: ${file.path}")
    appendLine()
    appendLine("- Language: ${file.language}")
    appendLine("- Module: ${file.module}")
    appendLine("- Original bytes: ${file.sizeBytes}")
    appendLine("- Context format: $CONTEXT_FORMAT_VERSION")
    appendLine()
    if (structuralLines.isNotEmpty()) {
        appendLine("## Package and imports")
        appendLine()
        appendLine("```${file.language}")
        structuralLines.forEach(::appendLine)
        appendLine("```")
        appendLine()
    }
    appendLine("## Symbols")
    appendLine()
    if (declarations.isEmpty()) {
        appendLine("No declarations detected. Open the original file for implementation details.")
    } else {
        appendLine("```${file.language}")
        declarations.take(MAX_FOCUSED_DECLARATIONS).forEach { (start, label) ->
            appendLine("// $label")
            declarationSignature(file, lines, start).forEach(::appendLine)
        }
        appendLine("```")
        if (declarations.size > MAX_FOCUSED_DECLARATIONS) {
            appendLine()
            appendLine("${declarations.size - MAX_FOCUSED_DECLARATIONS} additional declarations omitted.")
        }
    }
}

private fun declarationSignature(file: AgentFile, lines: List<String>, start: Int): List<String> {
    val signature = mutableListOf<String>()
    for (line in lines.drop(start).take(MAX_SIGNATURE_LINES)) {
        val trimmed = line.trim()
        if (trimmed.isBlank() && signature.isNotEmpty()) break
        val expressionBody = file.language == "kotlin" && Regex("""\)\s*(?::[^=]+)?=""").containsMatchIn(trimmed)
        val compact = when {
            file.language in setOf("typescript", "javascript") && "=>" in trimmed -> trimmed.substringBefore("=>").trimEnd() + " =>"
            "{" in trimmed -> trimmed.substringBefore("{").trimEnd()
            expressionBody -> trimmed.substringBefore("=").trimEnd()
            else -> trimmed
        }
        if (compact.isNotBlank()) signature += compact.take(MAX_SIGNATURE_CHARACTERS)
        if ("{" in trimmed || expressionBody || ";" in trimmed) break
    }
    return signature.ifEmpty { listOf(lines[start].trim().take(MAX_SIGNATURE_CHARACTERS)) }
}

private fun repositoryMap(repository: String, root: Path, files: List<AgentFile>): String = buildString {
    appendLine("# Repository Context: $repository")
    appendLine()
    appendLine("Generated by RAG-e Khab Repository Agent for coding assistants.")
    appendLine()
    appendLine("## Purpose")
    appendLine()
    appendLine("Use this as repository orientation before reading source files. It preserves structure, key conventions, and implementation landmarks without indexing the full codebase.")
    appendLine()
    appendLine("## Repository")
    appendLine()
    appendLine("- Root: `${root.invariantSeparatorsPathString}`")
    appendLine("- Indexable files discovered: ${files.size}")
    appendLine("- Modules: ${files.map { it.module }.distinct().sorted().joinToString(", ")}")
    appendLine()
    appendLine("## Languages")
    appendLine()
    files.groupingBy { it.language }.eachCount().toList()
        .sortedWith(compareByDescending<Pair<String, Int>> { it.second }.thenBy { it.first })
        .forEach { (language, count) -> appendLine("- $language: $count file(s)") }
    appendLine()
    appendLine("## Build And Test Hints")
    appendLine()
    inferCommands(files).forEach { appendLine("- `$it`") }
    appendLine()
    appendLine("## Key Files")
    appendLine()
    files.filter { it.isKnowledgeFile() || it.isBestPracticeFile() || it.isBuildConfigFile() }
        .sortedWith(compareBy<AgentFile> { it.path.depth() }.thenBy { it.path })
        .take(80)
        .forEach { appendLine("- `${it.path}` (${it.language})") }
    appendLine()
    appendLine("## Directory Structure")
    appendLine()
    appendLine("```text")
    directoryTree(files).forEach { appendLine(it) }
    appendLine("```")
    appendLine()
    appendLine("## Coding Agent Usage")
    appendLine()
    appendLine("- Start with `.ragekhab/repository-map.md` and `.ragekhab/source-index.md`.")
    appendLine("- Use `.ragekhab/modules/*.md` to choose the smallest set of source files to inspect.")
    appendLine("- Prefer AGENTS.md, README files, build configs, and docs before source exploration.")
    appendLine("- Do not assume full source is indexed; use local file reads for exact implementation edits.")
}

private fun sourceIndex(files: List<AgentFile>): String = buildString {
    appendLine("# Source Index")
    appendLine()
    appendLine("This is a compact map of source files and top-level declarations. It is optimized for routing coding agents to the right files.")
    files.filter { it.isSourceFile() }
        .groupBy { it.module }
        .toSortedMap()
        .forEach { (module, moduleFiles) ->
            appendLine()
            appendLine("## $module")
            moduleFiles.sortedBy { it.path }.forEach { file ->
                val declarations = file.declarations().take(12)
                if (declarations.isEmpty()) {
                    appendLine("- `${file.path}`")
                } else {
                    appendLine("- `${file.path}`: ${declarations.joinToString(", ")}")
                }
            }
        }
}

private fun moduleSummary(module: String, files: List<AgentFile>): String = buildString {
    appendLine("# Module: $module")
    appendLine()
    appendLine("## Files")
    files.groupingBy { it.language }.eachCount().toList()
        .sortedWith(compareByDescending<Pair<String, Int>> { it.second }.thenBy { it.first })
        .forEach { (language, count) -> appendLine("- $language: $count") }
    appendLine()
    appendLine("## Important Files")
    files.filter { it.isKnowledgeFile() || it.isBestPracticeFile() || it.isBuildConfigFile() }
        .sortedBy { it.path }
        .take(30)
        .forEach { appendLine("- `${it.path}`") }
    appendLine()
    appendLine("## Source Landmarks")
    files.filter { it.isSourceFile() }
        .sortedBy { it.path }
        .take(120)
        .forEach { file ->
            val declarations = file.declarations().take(10)
            if (declarations.isEmpty()) {
                appendLine("- `${file.path}`")
            } else {
                appendLine("- `${file.path}`: ${declarations.joinToString(", ")}")
            }
        }
}

private fun readUtf8(bytes: ByteArray): String? =
    try {
        StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes)).toString()
    } catch (_: CharacterCodingException) {
        null
    }

private fun List<AgentFile>.chunkByBytes(maxBatchBytes: Int): List<List<AgentFile>> {
    val batches = mutableListOf<List<AgentFile>>()
    var current = mutableListOf<AgentFile>()
    var currentBytes = 0
    forEach { file ->
        val fileBytes = file.content.length + file.path.length + 300
        if (current.isNotEmpty() && currentBytes + fileBytes > maxBatchBytes) {
            batches += current
            current = mutableListOf()
            currentBytes = 0
        }
        current += file
        currentBytes += fileBytes
    }
    if (current.isNotEmpty()) batches += current
    return batches
}

private fun postSync(client: HttpClient, server: String, payload: String): String {
    val request = HttpRequest.newBuilder()
        .uri(URI.create("$server/api/repository-agent/sync"))
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(payload))
        .build()
    val response = client.send(request, HttpResponse.BodyHandlers.ofString())
    require(response.statusCode() in 200..299) {
        "Sync failed with HTTP ${response.statusCode()}: ${response.body()}"
    }
    return response.body()
}

private fun syncPayload(
    repository: String,
    repositoryRoot: String,
    full: Boolean,
    complete: Boolean,
    allPaths: List<String>,
    files: List<AgentFile>,
): String = buildString {
    append('{')
    appendJsonField("repository", repository)
    append(',')
    appendJsonField("repositoryRoot", repositoryRoot)
    append(",\"full\":").append(full)
    append(",\"complete\":").append(complete)
    append(",\"allPaths\":[")
    allPaths.forEachIndexed { index, path ->
        if (index > 0) append(',')
        appendJsonString(path)
    }
    append(']')
    append(",\"files\":[")
    files.forEachIndexed { index, file ->
        if (index > 0) append(',')
        append('{')
        appendJsonField("path", file.path)
        append(',')
        appendJsonField("module", file.module)
        append(',')
        appendJsonField("language", file.language)
        append(',')
        appendJsonField("lastModifiedAt", file.lastModifiedAt.toString())
        append(",\"sizeBytes\":").append(file.sizeBytes)
        append(',')
        appendJsonField("contentHash", file.contentHash)
        append(',')
        appendJsonField("content", file.content)
        append('}')
    }
    append(']')
    append('}')
}

private fun StringBuilder.appendJsonField(name: String, value: String) {
    appendJsonString(name)
    append(':')
    appendJsonString(value)
}

private fun StringBuilder.appendJsonString(value: String) {
    append('"')
    value.forEach { char ->
        when (char) {
            '\\' -> append("\\\\")
            '"' -> append("\\\"")
            '\b' -> append("\\b")
            '\u000C' -> append("\\f")
            '\n' -> append("\\n")
            '\r' -> append("\\r")
            '\t' -> append("\\t")
            else -> if (char.code < 0x20) append("\\u%04x".format(char.code)) else append(char)
        }
    }
    append('"')
}

private fun String.intField(name: String): Int {
    val match = Regex("\"$name\"\\s*:\\s*(\\d+)").find(this) ?: return 0
    return match.groupValues[1].toIntOrNull() ?: 0
}

private fun String.compact(): String =
    replace(Regex("\\s+"), " ").take(240)

private fun virtualFile(path: String, content: String): AgentFile {
    val versionedContent = "<!-- RAG-e Khab context: $CONTEXT_FORMAT_VERSION -->\n$content"
    val bytes = versionedContent.toByteArray(StandardCharsets.UTF_8)
    return AgentFile(
        path = path,
        module = ".ragekhab",
        language = "markdown",
        lastModifiedAt = Instant.now(),
        sizeBytes = bytes.size.toLong(),
        contentHash = sha256(bytes),
        content = versionedContent,
    )
}

private fun AgentFile.isSourceFile(): Boolean =
    language in sourceLanguages

private fun AgentFile.isKnowledgeFile(): Boolean {
    val filename = path.substringAfterLast('/')
    return isSpecialFile(filename) ||
        path.startsWith("docs/", ignoreCase = true) && language == "markdown" ||
        path.endsWith(".md", ignoreCase = true) && path.depth() <= 2
}

private fun AgentFile.isBestPracticeFile(): Boolean {
    val normalized = path.lowercase()
    return listOf(
        "agent", "claude", "contributing", "convention", "architecture", "decision",
        "adr", "style", "standard", "guideline", "readme",
    ).any { it in normalized }
}

private fun AgentFile.isBuildConfigFile(): Boolean {
    val filename = path.substringAfterLast('/').lowercase()
    return filename in buildConfigFiles ||
        filename.startsWith("dockerfile") ||
        path.lowercase().startsWith(".github/workflows/")
}

private fun AgentFile.isLockFile(): Boolean {
    val filename = path.substringAfterLast('/').lowercase()
    return filename in setOf("package-lock.json", "pnpm-lock.yaml", "yarn.lock", "gradle.lockfile")
}

private fun AgentFile.declarationLabel(line: String): String? =
    when (language) {
        "kotlin" ->
            Regex("""^\s*(?:(?:public|private|protected|internal|expect|actual|final|open|abstract|sealed|const|external|override|lateinit|tailrec|vararg|suspend|inner|enum|annotation|companion|inline|value|infix|operator|data)\s+)*(data\s+class|class|object|interface|enum\s+class|fun)\s+(?:<[^>]+>\s*)?([A-Za-z_][A-Za-z0-9_]*)""")
                .find(line)
                ?.let { match -> "${match.groupValues[1].replace(Regex("\\s+"), " ")} ${match.groupValues[2]}" }
        "java", "csharp", "cpp", "c", "swift", "scala" ->
            Regex("""^\s*(?:public|private|protected|internal|final|sealed|abstract|static|\s)*\s*(class|interface|enum|record|struct|fun)\s+([A-Za-z_][A-Za-z0-9_]*)""")
                .find(line)
                ?.let { match -> "${match.groupValues[1]} ${match.groupValues[2]}" }
                ?: Regex("""^\s*(?:public|private|protected|internal|static|final|suspend|override|\s)+[\w<>,?.\[\] ]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(""")
                    .find(line)
                    ?.let { match -> "method ${match.groupValues[1]}" }
        "typescript", "javascript" ->
            Regex("""^\s*(?:export\s+)?(?:default\s+)?(class|interface|type|function|const|let)\s+([A-Za-z_][A-Za-z0-9_]*)""")
                .find(line)
                ?.let { match -> "${match.groupValues[1]} ${match.groupValues[2]}" }
        "python" ->
            Regex("""^\s*(class|def)\s+([A-Za-z_][A-Za-z0-9_]*)""")
                .find(line)
                ?.let { match -> "${match.groupValues[1]} ${match.groupValues[2]}" }
        "go" ->
            Regex("""^\s*(func|type)\s+([A-Za-z_][A-Za-z0-9_]*)""")
                .find(line)
                ?.let { match -> "${match.groupValues[1]} ${match.groupValues[2]}" }
        "rust" ->
            Regex("""^\s*(?:pub\s+)?(struct|enum|trait|fn|impl)\s+([A-Za-z_][A-Za-z0-9_]*)""")
                .find(line)
                ?.let { match -> "${match.groupValues[1]} ${match.groupValues[2]}" }
        else -> null
    }

private fun AgentFile.declarations(): List<String> =
    content.lines().mapNotNull { declarationLabel(it) }.distinct()

private fun inferCommands(files: List<AgentFile>): List<String> {
    val paths = files.map { it.path }.toSet()
    val commands = mutableListOf<String>()
    if ("gradlew" in paths || "gradlew.bat" in paths) {
        commands += "./gradlew build"
        commands += "./gradlew test"
    } else if (paths.any { it.endsWith("build.gradle.kts") || it.endsWith("build.gradle") }) {
        commands += "gradle build"
        commands += "gradle test"
    }
    if (paths.any { it.endsWith("package.json") }) {
        commands += "npm install"
        commands += "npm run build"
        commands += "npm test"
    }
    if (paths.any { it.endsWith("docker-compose.yml") || it.endsWith("compose.yml") }) {
        commands += "docker compose up --build"
    }
    return commands.ifEmpty { listOf("Inspect project build files before running commands.") }
}

private fun directoryTree(files: List<AgentFile>): List<String> {
    val entries = sortedSetOf<String>()
    files.forEach { file ->
        val parts = file.path.split('/').filter { it.isNotBlank() }
        parts.take(4).runningFold("") { prefix, part ->
            if (prefix.isBlank()) part else "$prefix/$part"
        }.drop(1).forEach(entries::add)
    }
    return entries.take(260).map { entry ->
        val depth = entry.count { it == '/' }
        "${"  ".repeat(depth)}- ${entry.substringAfterLast('/')}"
    } + if (entries.size > 260) listOf("... ${entries.size - 260} more") else emptyList()
}

private fun String.depth(): Int =
    count { it == '/' }

private fun String.sanitizePathSegment(): String =
    lowercase().replace(Regex("[^a-z0-9._-]+"), "-").trim('-').ifBlank { "root" }

private fun isIgnored(relative: Path): Boolean {
    val parts = relative.iterator().asSequence().map { it.toString() }.toSet()
    return parts.any { it in ignoredDirectories }
}

private fun isIndexable(path: Path): Boolean {
    val filename = path.name
    if (isSpecialFile(filename)) return true
    if (filename.lowercase() in buildConfigFiles || filename.lowercase().startsWith("dockerfile")) return true
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

private fun sha256(bytes: ByteArray): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
    return digest.joinToString("") { "%02x".format(it.toInt() and 0xff) }
}

private fun usage(): String =
    """
    RAG-e Khab Repository Agent

    Usage:
      java -jar ragekhab-agent.jar
      java -jar ragekhab-agent.jar --server http://localhost:8060 --path .

    Options:
      --ui                      Open the desktop repository-agent UI
      --server URL              RAG-e Khab backend URL. Default: RAGEKHAB_URL or http://localhost:8060
      --path PATH               Repository path to scan. Default: current directory
      --full true|false         Send full-sync cleanup marker. Default: true
      --max-batch-bytes N       Approximate sync batch size. Default: 4000000
      --max-file-bytes N        Skip files larger than N bytes. Default: 1000000
      --dry-run                 Show discovered files without sending them
      --help                    Show this help
    """.trimIndent()

private val specialFiles = setOf("README.md", "AGENTS.md", "CLAUDE.md")
private val buildConfigFiles = setOf(
    "build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts", "gradle.properties",
    "pom.xml", "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
    "docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml",
    "application.yml", "application.yaml", "application.properties", "vite.config.ts", "vite.config.js",
    "tsconfig.json", "eslint.config.js", ".gitignore", ".dockerignore", "gradlew", "gradlew.bat",
)
private val markdownExtensions = setOf("md", "markdown")
private val sourceExtensions = setOf(
    "kt", "kts", "java", "js", "jsx", "ts", "tsx", "py", "go", "rs", "rb", "php", "cs",
    "cpp", "cc", "cxx", "hpp", "h", "c", "swift", "scala", "sql", "yaml", "yml", "json", "xml",
)
private val sourceLanguages = setOf(
    "kotlin", "java", "javascript", "typescript", "python", "go", "rust", "ruby", "php", "csharp",
    "cpp", "c", "swift", "scala", "sql",
)
private const val MAX_FOCUSED_DECLARATIONS = 60
private const val CONTEXT_FORMAT_VERSION = "symbol-map-v3"
private const val MAX_SIGNATURE_LINES = 6
private const val MAX_SIGNATURE_CHARACTERS = 240
private val ignoredDirectories = setOf(
    ".git", ".gradle", ".idea", ".vscode", "build", "dist", "node_modules", "target", "out",
    ".next", ".nuxt", "coverage", ".cache",
)
private val moduleDirectories = setOf("backend", "frontend", "app", "server", "client", "api", "docs", "docker")
