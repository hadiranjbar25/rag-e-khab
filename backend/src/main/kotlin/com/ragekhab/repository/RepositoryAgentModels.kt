package com.ragekhab.repository

import java.time.Instant
import java.util.UUID

data class RepositoryScanRequest(
    val repository: String? = null,
    val name: String? = null,
    val path: String? = null,
    val full: Boolean = false,
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
    val repository: String,
    val repositoryRoot: String,
    val trackedFiles: Int,
    val deletedFiles: Int,
    val lastIndexedAt: Instant?,
)

data class RepositoryAgentStatus(
    val configuredPath: String?,
    val trackedFiles: Int,
    val deletedFiles: Int,
    val lastIndexedAt: Instant?,
    val repositories: List<RepositoryAgentRepositoryStatus>,
    val files: List<RepositoryFileMetadata>,
)
