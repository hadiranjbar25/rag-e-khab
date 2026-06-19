package com.ragekhab.repository

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.ragekhab.config.RagEKhabProperties
import org.springframework.stereotype.Repository
import java.nio.file.Files
import java.nio.file.Path
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Repository
class RepositoryMetadataStore(
    private val properties: RagEKhabProperties,
    private val mapper: ObjectMapper,
) {
    private val files = ConcurrentHashMap<UUID, RepositoryFileMetadata>()
    private val storagePath: Path = Path.of(properties.storageDir).resolve("repository-agent-files.json")

    init {
        load()
    }

    fun save(metadata: RepositoryFileMetadata): RepositoryFileMetadata {
        files[metadata.documentId] = metadata
        persist()
        return metadata
    }

    fun get(documentId: UUID): RepositoryFileMetadata? = files[documentId]

    fun activeForRoot(root: String): List<RepositoryFileMetadata> =
        files.values.filter { it.repositoryRoot == root && !it.deleted }

    fun list(): List<RepositoryFileMetadata> =
        files.values.sortedWith(compareBy<RepositoryFileMetadata> { it.repositoryRoot }.thenBy { it.filePath })

    private fun load() {
        if (!Files.exists(storagePath)) return
        runCatching {
            val items = mapper.readValue(Files.readString(storagePath), object : TypeReference<List<RepositoryFileMetadata>>() {})
            items.forEach { files[it.documentId] = it }
        }
    }

    private fun persist() {
        Files.createDirectories(storagePath.parent)
        Files.writeString(storagePath, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(list()))
    }
}
