package com.ragekhab.repository

import com.ragekhab.storage.AppStateStore
import org.springframework.stereotype.Repository

@Repository
class RepositoryMemoryStore(
    private val state: AppStateStore,
) {
    fun save(memory: RepositoryMemory): RepositoryMemory =
        state.put(STORE, memory.repository.lowercase(), memory)

    fun get(repository: String): RepositoryMemory? =
        state.get(STORE, repository.lowercase(), RepositoryMemory::class.java)

    private companion object {
        const val STORE = "repository-memory"
    }
}
