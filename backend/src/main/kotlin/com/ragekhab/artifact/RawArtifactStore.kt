package com.ragekhab.artifact

import com.ragekhab.storage.AppStateStore
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class RawArtifactStore(
    private val state: AppStateStore,
) {
    fun save(artifact: RawArtifact): RawArtifact = state.put(STORE, artifact.id, artifact)

    fun get(id: UUID): RawArtifact? = state.get(STORE, id, RawArtifact::class.java)

    fun findByCompressedDocumentId(documentId: UUID): RawArtifact? =
        state.list(STORE, RawArtifact::class.java).firstOrNull { it.compressedDocumentId == documentId }

    private companion object {
        const val STORE = "raw-artifacts"
    }
}
