package com.ragekhab.repository

import com.ragekhab.storage.AppStateStore
import org.springframework.stereotype.Repository as SpringRepository
import java.util.UUID

@SpringRepository
class RepositoryMetadataStore(
    private val state: AppStateStore,
) {
    fun save(metadata: RepositoryFileMetadata): RepositoryFileMetadata = state.put(STORE, metadata.documentId, metadata)

    fun get(documentId: UUID): RepositoryFileMetadata? = state.get(STORE, documentId, RepositoryFileMetadata::class.java)

    fun delete(documentId: UUID): Boolean = state.delete(STORE, documentId)

    fun deleteUnavailable(documentIds: Set<UUID>): Int {
        val unavailable = all().filter { it.deleted || it.documentId !in documentIds }
        unavailable.forEach { state.delete(STORE, it.documentId) }
        return unavailable.size
    }

    fun activeForRoot(root: String): List<RepositoryFileMetadata> =
        all().filter { it.repositoryRoot == root && !it.deleted }

    fun activeForRepository(repository: String, root: String): List<RepositoryFileMetadata> =
        all().filter {
            it.repository.equals(repository, ignoreCase = true) &&
                it.repositoryRoot == root &&
                !it.deleted
        }

    fun list(): List<RepositoryFileMetadata> =
        all().filterNot { it.deleted }.sortedWith(compareBy<RepositoryFileMetadata> { it.repositoryRoot }.thenBy { it.filePath })

    fun listRepository(repository: String): List<RepositoryFileMetadata> {
        val normalized = repository.trim()
        if (normalized.isBlank()) return emptyList()
        return all()
            .filter { it.repository.equals(normalized, ignoreCase = true) }
            .sortedWith(compareBy<RepositoryFileMetadata> { it.repositoryRoot }.thenBy { it.filePath })
    }

    fun deleteRepository(repository: String): Int {
        val normalized = repository.trim()
        if (normalized.isBlank()) return 0
        val ids = all()
            .filter { it.repository.equals(normalized, ignoreCase = true) }
            .map { it.documentId }
        return state.deleteAll(STORE, ids)
    }

    private fun all(): List<RepositoryFileMetadata> = state.list(STORE, RepositoryFileMetadata::class.java)

    private companion object {
        const val STORE = "repository-files"
    }
}
