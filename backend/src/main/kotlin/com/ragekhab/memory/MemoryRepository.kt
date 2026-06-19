package com.ragekhab.memory

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.ragekhab.config.RagEKhabProperties
import org.springframework.stereotype.Repository
import java.nio.file.Files
import java.nio.file.Path
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Repository
class MemoryRepository(
    private val properties: RagEKhabProperties,
    private val mapper: ObjectMapper,
) {
    private val memories = ConcurrentHashMap<UUID, AgentMemory>()
    private val storagePath: Path = Path.of(properties.storageDir).resolve("agent-memories.json")

    init {
        load()
    }

    fun save(memory: AgentMemory): AgentMemory {
        memories[memory.id] = memory
        persist()
        return memory
    }

    fun list(): List<AgentMemory> =
        memories.values.sortedWith(compareByDescending<AgentMemory> { it.createdAt }.thenBy { it.type.name })

    fun get(id: UUID): AgentMemory? = memories[id]

    fun delete(id: UUID): Boolean {
        val removed = memories.remove(id) != null
        if (removed) persist()
        return removed
    }

    fun replaceAll(items: List<AgentMemory>) {
        memories.clear()
        items.forEach { memories[it.id] = it }
        persist()
    }

    private fun load() {
        if (!Files.exists(storagePath)) return
        runCatching {
            val items = mapper.readValue(Files.readString(storagePath), object : TypeReference<List<AgentMemory>>() {})
            items.forEach { memories[it.id] = it }
        }
    }

    private fun persist() {
        Files.createDirectories(storagePath.parent)
        Files.writeString(storagePath, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(list()))
    }
}
