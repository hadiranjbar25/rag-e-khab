package com.ragekhab.repository

import com.fasterxml.jackson.annotation.JsonProperty
import java.time.Instant
import java.util.UUID

data class Repository(
    val id: UUID,
    val name: String,
    val path: String,
    val language: String,
    val lastSyncedAt: Instant?,
    val status: String,
)

data class ProjectRepository(
    val projectId: UUID,
    val repositoryId: UUID,
)

data class LinkRepositoryRequest(
    val repositoryId: UUID,
)

data class RepositoryDeleteResult(
    val deleted: Boolean,
    val repositoryId: UUID,
    val repositoryName: String,
    val deletedIndexedKnowledge: Int,
)

data class RepositoryScanRequest(
    val repository: String? = null,
    val name: String? = null,
    val path: String? = null,
    val full: Boolean = false,
    val projectId: UUID? = null,
)

data class RepositorySyncFile(
    val path: String,
    val module: String? = null,
    val language: String? = null,
    val lastModifiedAt: Instant,
    val sizeBytes: Long,
    val contentHash: String,
    val content: String,
)

data class RepositorySyncRequest(
    val repository: String,
    val repositoryRoot: String? = null,
    val full: Boolean = false,
    val complete: Boolean = false,
    val projectId: UUID? = null,
    val allPaths: List<String> = emptyList(),
    val files: List<RepositorySyncFile> = emptyList(),
)

data class RepositoryFileMetadata(
    val documentId: UUID,
    val repository: String = "",
    val repositoryRoot: String,
    val filePath: String,
    val module: String,
    val language: String,
    val lastModifiedAt: Instant,
    val sizeBytes: Long,
    val contentHash: String,
    val indexedAt: Instant,
    val deleted: Boolean = false,
)

data class RepositoryScanResult(
    val repositoryId: UUID,
    val repository: String,
    val repositoryRoot: String,
    val scannedFiles: Int,
    val indexedFiles: Int,
    val unchangedFiles: Int,
    val deletedFiles: Int,
    val skippedFiles: Int,
    val startedAt: Instant,
    val finishedAt: Instant,
    val indexed: List<RepositoryFileMetadata>,
    val deleted: List<RepositoryFileMetadata>,
)

data class RepositoryAgentRepositoryStatus(
    val repositoryId: UUID,
    val repository: String,
    val repositoryRoot: String,
    val language: String,
    val status: String,
    val trackedFiles: Int,
    val deletedFiles: Int,
    val lastIndexedAt: Instant?,
    val projectIds: List<UUID> = emptyList(),
)

data class RepositoryAgentStatus(
    val configuredPath: String?,
    val trackedFiles: Int,
    val deletedFiles: Int,
    val lastIndexedAt: Instant?,
    val repositories: List<RepositoryAgentRepositoryStatus>,
    val files: List<RepositoryFileMetadata>,
)

enum class ContextLevel {
    repo_overview,
    module_overview,
    package_overview,
    class_summary,
    method_detail,
    dependency_chain,
    related_tests,
    source_snippet,
}

data class SourceSnippetRequest(
    val filePath: String? = null,
    @param:JsonProperty("class")
    @get:JsonProperty("class")
    val className: String? = null,
    val method: String? = null,
    val startLine: Int? = null,
    val endLine: Int? = null,
)

data class ContextRequest(
    val repoId: String? = null,
    val repository: String? = null,
    val task: String,
    val maxTokens: Int = 6_000,
    val includeTests: Boolean = true,
    val includeRawSource: Boolean = false,
    val levels: List<ContextLevel> = emptyList(),
    val sourceSnippet: SourceSnippetRequest? = null,
    val filePath: String? = null,
    @param:JsonProperty("class")
    @get:JsonProperty("class")
    val className: String? = null,
    val method: String? = null,
    val startLine: Int? = null,
    val endLine: Int? = null,
)

data class CompactClassSummary(
    @param:JsonProperty("class")
    @get:JsonProperty("class")
    val className: String,
    val role: String,
    val path: String,
    val purpose: String,
    val publicMethods: List<String>,
    val dependsOn: List<String>,
    val usedBy: List<String>,
    val relatedTests: List<String>,
)

data class RelatedTestSummary(
    val name: String,
    val path: String,
    val covers: List<String>,
)

data class RelatedTestContext(
    @param:JsonProperty("class")
    @get:JsonProperty("class")
    val className: String,
    val tests: List<RelatedTestSummary>,
)

data class SourceSnippet(
    val filePath: String,
    val startLine: Int,
    val endLine: Int,
    val text: String,
)

data class ContextDebugSelection(
    val file: String,
    val reason: String,
    val score: Double,
)

data class ContextPackage(
    val summary: String,
    val estimatedTokens: Int,
    val repoOverview: String? = null,
    val relevantClasses: List<CompactClassSummary> = emptyList(),
    val dependencyChains: List<String> = emptyList(),
    val relatedTests: List<RelatedTestContext> = emptyList(),
    val projectConventions: List<String> = emptyList(),
    val sourceSnippets: List<SourceSnippet> = emptyList(),
    val debug: List<ContextDebugSelection> = emptyList(),
)

data class RepositoryMemory(
    val repository: String,
    val conventions: List<String>,
    val updatedAt: Instant,
)
