# 0002 - Compact Repository Context Instead of Raw Source Dumps

## Status

Accepted

## Context

Coding agents need repository context, but sending whole source trees wastes tokens and can expose unnecessary private code. The useful context for a task is usually a small combination of project structure, conventions, relevant classes, dependency chains, tests, and carefully selected snippets.

## Decision

The repository agent uses one focused sync strategy. It sends repository maps, module summaries, selected documentation, build configuration, source declarations, imports, and bounded implementation excerpts around detected declarations.

The synced context includes repository maps, module summaries, source declarations, selected docs, and build/test configuration. Exact raw source should be read locally by the coding agent when an edit requires it.

The backend also exposes context package APIs that default to summaries and only return raw snippets when explicitly requested.

Repository scans index common source and config formats across Kotlin, Java, JavaScript, TypeScript, Python, Go, Rust, Ruby, PHP, C#, C/C++, Swift, Scala, SQL, YAML, JSON, XML, and Markdown. Context packages use Tree-sitter parsers for supported source languages to extract class/function summaries and source-snippet ranges. Lightweight text patterns remain as a fallback when a parser is unavailable or cannot load.

## Consequences

- Agent prompts stay smaller and cheaper.
- Indexed knowledge is better suited for task routing and orientation.
- Exact implementation edits still require local file reads.
- Polyglot repositories get useful symbol-level orientation, while exact edits still depend on local source reads or explicit snippets.
- The CLI and UI do not expose sync profiles.
- Focused source artifacts preserve line breaks and include small declarations intact.
- Large declarations keep bounded opening and closing implementation context instead of uploading the entire source file.
- Retrieval still returns only task-relevant chunks within the requested token budget.
