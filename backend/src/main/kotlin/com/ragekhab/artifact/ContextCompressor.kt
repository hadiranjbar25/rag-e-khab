package com.ragekhab.artifact

import com.ragekhab.document.ArtifactKind
import org.springframework.stereotype.Component

interface ContextCompressor {
    fun supports(kind: ArtifactKind): Boolean
    fun compress(input: CompressionInput): CompressedArtifact
}

abstract class HeuristicContextCompressor(
    private val supportedKind: ArtifactKind,
) : ContextCompressor {
    override fun supports(kind: ArtifactKind): Boolean = kind == supportedKind

    override fun compress(input: CompressionInput): CompressedArtifact {
        val rawTokens = estimateTokens(input.content)
        val compressed = compressLines(input.title, input.content.lineSequence().toList()).trim()
        val fallback = compressed.takeIf { it.isNotBlank() } ?: input.content.take(4_000)
        val compressedTokens = estimateTokens(fallback)
        return CompressedArtifact(
            kind = input.kind,
            title = input.title,
            text = fallback,
            metrics = ArtifactCompressionMetrics(
                rawTokenEstimate = rawTokens,
                compressedTokenEstimate = compressedTokens,
                reductionPercent = reductionPercent(rawTokens, compressedTokens),
            ),
        )
    }

    protected abstract fun compressLines(title: String, lines: List<String>): String

    protected fun estimateTokens(text: String): Int =
        maxOf(1, text.length / 4)

    protected fun normalizeLine(line: String): String =
        line
            .replace(Regex("""\u001B\[[;\d]*m"""), "")
            .replace(Regex("""\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?"""), "<timestamp>")
            .replace(Regex("""\[\s*[=>#.-]{8,}\s*]\s*\d+%?"""), "<progress>")
            .trimEnd()

    protected fun dedupeKeepingOrder(lines: List<String>, maxRepeats: Int = 1): List<String> {
        val seen = linkedMapOf<String, Int>()
        val output = mutableListOf<String>()
        lines.forEach { line ->
            val normalized = normalizeLine(line)
            if (normalized.isBlank()) return@forEach
            val count = seen.getOrDefault(normalized, 0)
            if (count < maxRepeats) output += normalized
            seen[normalized] = count + 1
        }
        return output
    }

    protected fun important(line: String): Boolean {
        val value = line.lowercase()
        if (Regex("""^\s*at\s+[\w.$]+\(.*:\d+\)""").containsMatchIn(line)) return true
        return listOf(
            "error",
            "failed",
            "failure",
            "exception",
            "caused by",
            "assert",
            "expected",
            "actual",
            " at ",
            ".java:",
            ".kt:",
            ".js:",
            ".ts:",
            ".tsx:",
            ".sql:",
            "fatal:",
            "warning:",
            "modified:",
            "deleted:",
            "renamed:",
            "new file:",
            "untracked",
        ).any { it in value }
    }

    protected fun header(title: String, kind: ArtifactKind): String =
        "Compressed ${kind.name.lowercase().replace('_', ' ')}: $title"

    private fun reductionPercent(rawTokens: Int, compressedTokens: Int): Int =
        if (rawTokens <= 0) 0 else (((rawTokens - compressedTokens).coerceAtLeast(0) * 100.0) / rawTokens).toInt()
}

@Component
class TestOutputCompressor : HeuristicContextCompressor(ArtifactKind.TEST_OUTPUT) {
    override fun compressLines(title: String, lines: List<String>): String {
        val normalized = lines.map(::normalizeLine)
        val selected = normalized.filter { line ->
            important(line) ||
                Regex("""\bTests run:\s*\d+""").containsMatchIn(line) ||
                Regex("""\b\d+\s+tests? completed""", RegexOption.IGNORE_CASE).containsMatchIn(line) ||
                line.contains("BUILD FAILED", ignoreCase = true)
        }
        return buildString {
            appendLine(header(title, ArtifactKind.TEST_OUTPUT))
            appendLine("Focus: failed tests, assertions, exception summaries, and build result.")
            appendLines(dedupeKeepingOrder(selected).take(160))
        }
    }
}

@Component
class StackTraceCompressor : HeuristicContextCompressor(ArtifactKind.STACK_TRACE) {
    override fun compressLines(title: String, lines: List<String>): String {
        val selected = mutableListOf<String>()
        var frames = 0
        lines.map(::normalizeLine).forEach { line ->
            when {
                line.contains("Exception") || line.contains("Error") || line.startsWith("Caused by:") -> {
                    selected += line
                    frames = 0
                }
                Regex("""^\s*at\s+[\w.$]+\(.*:\d+\)""").containsMatchIn(line) && frames < 12 -> {
                    selected += line.trim()
                    frames += 1
                }
                line.contains("Suppressed:") -> selected += line
            }
        }
        return buildString {
            appendLine(header(title, ArtifactKind.STACK_TRACE))
            appendLine("Focus: exception class, causes, and top relevant frames.")
            appendLines(dedupeKeepingOrder(selected).take(120))
        }
    }
}

@Component
class GitDiffCompressor : HeuristicContextCompressor(ArtifactKind.GIT_DIFF) {
    override fun compressLines(title: String, lines: List<String>): String {
        val selected = lines.map(::normalizeLine).filter { line ->
            line.startsWith("diff --git ") ||
                line.startsWith("+++ ") ||
                line.startsWith("--- ") ||
                line.startsWith("@@") ||
                line.startsWith("+") && !line.startsWith("+++") ||
                line.startsWith("-") && !line.startsWith("---")
        }
        return buildString {
            appendLine(header(title, ArtifactKind.GIT_DIFF))
            appendLine("Focus: changed files, hunks, and changed lines. Large unchanged context omitted.")
            appendLines(selected.take(260))
            if (selected.size > 260) appendLine("... ${selected.size - 260} changed diff lines omitted")
        }
    }
}

@Component
class GitStatusCompressor : HeuristicContextCompressor(ArtifactKind.GIT_STATUS) {
    override fun compressLines(title: String, lines: List<String>): String {
        val selected = lines.map(::normalizeLine).filter { it.isNotBlank() && !it.startsWith("On branch") }
        return buildString {
            appendLine(header(title, ArtifactKind.GIT_STATUS))
            appendLine("Focus: branch state and changed/untracked files.")
            appendLines(dedupeKeepingOrder(selected).take(120))
        }
    }
}

@Component
class LogCompressor : HeuristicContextCompressor(ArtifactKind.LOG) {
    override fun compressLines(title: String, lines: List<String>): String {
        val normalized = lines.map(::normalizeLine)
        val selected = normalized.filter(::important)
        val fallbackTail = normalized.takeLast(40)
        return buildString {
            appendLine(header(title, ArtifactKind.LOG))
            appendLine("Focus: errors, warnings, exceptions, IDs, paths, and final log tail.")
            appendLines(dedupeKeepingOrder(selected + fallbackTail).take(180))
        }
    }
}

@Component
class DirectoryTreeCompressor : HeuristicContextCompressor(ArtifactKind.DIRECTORY_TREE) {
    override fun compressLines(title: String, lines: List<String>): String {
        val selected = lines.map(::normalizeLine).filter { line ->
            val depth = line.takeWhile { it == ' ' || it == '|' || it == '-' || it == '+' || it == '`' }.length
            depth <= 10 || important(line)
        }
        return buildString {
            appendLine(header(title, ArtifactKind.DIRECTORY_TREE))
            appendLine("Focus: top-level structure and recognizable source/config/test paths.")
            appendLines(dedupeKeepingOrder(selected).take(220))
            if (selected.size > 220) appendLine("... ${selected.size - 220} tree lines omitted")
        }
    }
}

@Component
class QueryResultCompressor : HeuristicContextCompressor(ArtifactKind.QUERY_RESULT) {
    override fun compressLines(title: String, lines: List<String>): String {
        if (lines.isEmpty()) return header(title, ArtifactKind.QUERY_RESULT)
        val headerLine = normalizeLine(lines.first())
        val rows = lines.drop(1).map(::normalizeLine).filter { it.isNotBlank() }
        val selectedRows = rows.filter(::important).ifEmpty { rows.take(25) }
        return buildString {
            appendLine(header(title, ArtifactKind.QUERY_RESULT))
            appendLine("Focus: header, sanitized IDs, error-like rows, and representative sample.")
            appendLine(headerLine)
            appendLines(dedupeKeepingOrder(selectedRows).take(80))
            if (rows.size > selectedRows.take(80).size) appendLine("... ${rows.size - selectedRows.take(80).size} rows omitted")
        }
    }
}

@Component
class TextArtifactCompressor : HeuristicContextCompressor(ArtifactKind.TEXT) {
    override fun compressLines(title: String, lines: List<String>): String {
        val normalized = lines.map(::normalizeLine)
        val selected = normalized.filter(::important).ifEmpty { normalized.take(120) }
        return buildString {
            appendLine(header(title, ArtifactKind.TEXT))
            appendLine("Focus: important lines and representative content.")
            appendLines(dedupeKeepingOrder(selected).take(180))
        }
    }
}

private fun StringBuilder.appendLines(lines: List<String>) {
    lines.forEach { appendLine(it) }
}
