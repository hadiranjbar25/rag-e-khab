package com.ragekhab.repository

import org.springframework.stereotype.Component

@Component
class SourceSnippetCompressor {
    fun compress(source: String): String =
        source.lines()
            .filterNot { it.trim().startsWith("import ") }
            .joinToString("\n")
            .replace(blockCommentRegex, "")
            .lines()
            .filterNot { it.trim().startsWith("//") }
            .filterNot { simpleGetterSetterRegex.containsMatchIn(it.trim()) }
            .joinToString("\n")
            .replace(Regex("""\n{3,}"""), "\n\n")
            .trim()

    private companion object {
        val blockCommentRegex = Regex("""(?s)/\*.*?\*/""")
        val simpleGetterSetterRegex = Regex("""^(?:public\s+)?[A-Za-z0-9_<>, ?\[\].]+\s+(?:get|set|is)[A-Z][A-Za-z0-9_]*\s*\([^)]*\)\s*\{?\s*(?:return\s+[^;]+;?)?\s*}?\s*$""")
    }
}
