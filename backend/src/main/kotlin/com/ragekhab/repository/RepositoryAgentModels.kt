package com.ragekhab.repository

import java.time.Instant
import java.util.UUID

data class RepositoryScanRequest(
    val path: String? = null,
    val full: Boolean = false,
)

data class RepositoryFileMetadata(
    val documentId: UUID,
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

data class RepositoryAgentStatus(
    val configuredPath: String?,
    val trackedFiles: Int,
    val deletedFiles: Int,
    val lastIndexedAt: Instant?,
    val files: List<RepositoryFileMetadata>,
)
