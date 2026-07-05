package com.ragekhab.memory

import com.ragekhab.storage.AppStateStore
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class MemoryRepository(
    private val state: AppStateStore,
) {
    fun save(memory: AgentMemory): AgentMemory = state.put(STORE, memory.id, memory)

    fun list(): List<AgentMemory> =
        state.list(STORE, AgentMemory::class.java)
            .sortedWith(compareByDescending<AgentMemory> { it.createdAt }.thenBy { it.type.name })

    fun get(id: UUID): AgentMemory? = state.get(STORE, id, AgentMemory::class.java)

    fun delete(id: UUID): Boolean = state.delete(STORE, id)

    fun replaceAll(items: List<AgentMemory>) {
        state.deleteStore(STORE)
        items.forEach { save(it) }
    }

    private companion object {
        const val STORE = "memories"
    }
}
