package com.ragekhab.repository

import org.springframework.stereotype.Component
import org.treesitter.TSLanguage
import org.treesitter.TSNode
import org.treesitter.TSParser
import java.nio.charset.StandardCharsets

@Component
class SourceSymbolExtractor {
    fun extract(language: String, source: String): SourceSymbols {
        val parsed = parse(language, source)
        return if (parsed != null) {
            val declarations = mutableListOf<SourceDeclaration>()
            collectDeclarations(parsed.root, parsed.sourceBytes, declarations)
            val primary = declarations.firstOrNull { it.kind == SourceDeclarationKind.TYPE }
                ?: declarations.firstOrNull { it.kind == SourceDeclarationKind.FUNCTION }
            SourceSymbols(
                primaryDeclaration = primary?.name,
                publicMethods = declarations
                    .filter { it.kind == SourceDeclarationKind.FUNCTION }
                    .map { it.name }
                    .filterNot { it in ignoredMethodNames || it in languageKeywords }
                    .distinct()
                    .take(20),
                declarations = declarations.distinctBy { "${it.kind}:${it.name}:${it.startLine}" },
            )
        } else {
            regexSymbols(source)
        }
    }

    fun methodRange(language: String, source: String, method: String): Pair<Int, Int>? {
        val parsed = parse(language, source) ?: return regexMethodRange(source.lines(), method)
        val sourceBytes = parsed.sourceBytes
        return parsed.root.walk()
            .filter { it.type in functionNodeTypes }
            .firstOrNull { node -> node.nameText(sourceBytes) == method || node.firstIdentifierText(sourceBytes) == method }
            ?.let { node -> node.getStartPoint().getRow() + 1 to node.getEndPoint().getRow() + 1 }
            ?: regexMethodRange(source.lines(), method)
    }

    private fun parse(language: String, source: String): ParsedSource? =
        runCatching {
            val treeSitterLanguage = languageFactory(language)?.invoke() ?: return null
            val parser = TSParser()
            parser.setLanguage(treeSitterLanguage)
            val tree = parser.parseString(null, source) ?: return null
            ParsedSource(tree.getRootNode(), source.toByteArray(StandardCharsets.UTF_8))
        }.getOrNull()

    private fun collectDeclarations(node: TSNode, sourceBytes: ByteArray, output: MutableList<SourceDeclaration>) {
        val type = node.getType()
        when {
            type in typeNodeTypes -> node.nameText(sourceBytes)?.let { name ->
                output += SourceDeclaration(
                    name = name,
                    kind = SourceDeclarationKind.TYPE,
                    startLine = node.getStartPoint().getRow() + 1,
                    endLine = node.getEndPoint().getRow() + 1,
                )
            }
            type in functionNodeTypes -> node.nameText(sourceBytes)?.let { name ->
                output += SourceDeclaration(
                    name = name,
                    kind = SourceDeclarationKind.FUNCTION,
                    startLine = node.getStartPoint().getRow() + 1,
                    endLine = node.getEndPoint().getRow() + 1,
                )
            }
        }
        repeat(node.getNamedChildCount()) { index ->
            collectDeclarations(node.getNamedChild(index), sourceBytes, output)
        }
    }

    private fun TSNode.nameText(sourceBytes: ByteArray): String? {
        val byField = listOf("name", "declarator", "declaration")
            .asSequence()
            .mapNotNull { field -> getChildByFieldName(field).takeUnless { it.isNull() } }
            .mapNotNull { child -> child.identifierText(sourceBytes) }
            .firstOrNull()
        return byField ?: firstIdentifierText(sourceBytes)
    }

    private fun TSNode.identifierText(sourceBytes: ByteArray): String? =
        when (getType()) {
            in identifierNodeTypes -> text(sourceBytes).cleanSymbol()
            else -> firstIdentifierText(sourceBytes)
        }

    private fun TSNode.firstIdentifierText(sourceBytes: ByteArray): String? {
        if (getType() in identifierNodeTypes) return text(sourceBytes).cleanSymbol()
        repeat(getNamedChildCount()) { index ->
            val found = getNamedChild(index).firstIdentifierText(sourceBytes)
            if (found != null) return found
        }
        return null
    }

    private fun TSNode.text(sourceBytes: ByteArray): String {
        val start = getStartByte().coerceIn(0, sourceBytes.size)
        val end = getEndByte().coerceIn(start, sourceBytes.size)
        return String(sourceBytes, start, end - start, StandardCharsets.UTF_8)
    }

    private fun TSNode.walk(): Sequence<TSNode> = sequence {
        yield(this@walk)
        repeat(getNamedChildCount()) { index ->
            yieldAll(getNamedChild(index).walk())
        }
    }

    private fun languageFactory(language: String): (() -> TSLanguage)? =
        when (language.lowercase()) {
            "c" -> grammar("org.treesitter.TreeSitterC")
            "csharp" -> grammar("org.treesitter.TreeSitterCSharp")
            "cpp" -> grammar("org.treesitter.TreeSitterCpp")
            "go" -> grammar("org.treesitter.TreeSitterGo")
            "java" -> grammar("org.treesitter.TreeSitterJava")
            "javascript" -> grammar("org.treesitter.TreeSitterJavascript")
            "kotlin" -> grammar("org.treesitter.TreeSitterKotlin")
            "php" -> grammar("org.treesitter.TreeSitterPhp")
            "python" -> grammar("org.treesitter.TreeSitterPython")
            "ruby" -> grammar("org.treesitter.TreeSitterRuby")
            "rust" -> grammar("org.treesitter.TreeSitterRust")
            "scala" -> grammar("org.treesitter.TreeSitterScala")
            "swift" -> grammar("org.treesitter.TreeSitterSwift")
            "typescript" -> grammar("org.treesitter.TreeSitterTypescript")
            else -> null
        }

    private fun grammar(className: String): () -> TSLanguage = {
        Class.forName(className).getDeclaredConstructor().newInstance() as TSLanguage
    }

    private fun regexSymbols(source: String): SourceSymbols {
        val declarations = mutableListOf<SourceDeclaration>()
        declarationRegexes.asSequence()
            .mapNotNull { regex -> regex.find(source)?.groupValues?.get(1) }
            .firstOrNull()
            ?.let { declarations += SourceDeclaration(it, SourceDeclarationKind.TYPE, 1, 1) }
        val methods = methodRegexes.asSequence()
            .flatMap { regex -> regex.findAll(source).map { it.groupValues[1] } }
            .filterNot { it in ignoredMethodNames || it in languageKeywords }
            .distinct()
            .take(20)
            .toList()
        declarations += methods.map { SourceDeclaration(it, SourceDeclarationKind.FUNCTION, 1, 1) }
        return SourceSymbols(declarations.firstOrNull()?.name, methods, declarations)
    }

    private fun regexMethodRange(lines: List<String>, method: String): Pair<Int, Int>? {
        val startIndex = lines.indexOfFirst { Regex("""\b${Regex.escape(method)}\s*\(""").containsMatchIn(it) }
            .takeIf { it >= 0 }
            ?: return null
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

    private fun String.cleanSymbol(): String? =
        trim()
            .substringAfterLast("::")
            .substringAfterLast(".")
            .replace(Regex("""[^A-Za-z0-9_]"""), "")
            .takeIf { it.isNotBlank() && it.first().isLetter() || it.firstOrNull() == '_' }

    private data class ParsedSource(
        val root: TSNode,
        val sourceBytes: ByteArray,
    )

    private companion object {
        val typeNodeTypes = setOf(
            "class_declaration", "interface_declaration", "enum_declaration", "record_declaration",
            "object_declaration", "struct_declaration", "trait_declaration", "type_declaration",
            "class_definition", "module", "singleton_class",
        )
        val functionNodeTypes = setOf(
            "method_declaration", "function_declaration", "function_definition", "method_definition",
            "function_item", "function_declarator", "method", "constructor_declaration",
            "arrow_function", "lambda_expression",
        )
        val identifierNodeTypes = setOf(
            "identifier", "type_identifier", "field_identifier", "property_identifier", "constant",
            "simple_identifier", "name", "variable_name",
        )
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
        val ignoredMethodNames = setOf("equals", "hashCode", "toString")
        val languageKeywords = setOf(
            "if", "for", "while", "switch", "catch", "return", "new", "class", "interface", "constructor",
        )
    }
}

data class SourceSymbols(
    val primaryDeclaration: String?,
    val publicMethods: List<String>,
    val declarations: List<SourceDeclaration>,
)

data class SourceDeclaration(
    val name: String,
    val kind: SourceDeclarationKind,
    val startLine: Int,
    val endLine: Int,
)

enum class SourceDeclarationKind {
    TYPE,
    FUNCTION,
}
