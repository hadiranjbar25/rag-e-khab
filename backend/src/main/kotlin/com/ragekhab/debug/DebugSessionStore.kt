package com.ragekhab.debug

import com.fasterxml.jackson.databind.ObjectMapper
import com.ragekhab.config.RagEKhabProperties
import org.springframework.stereotype.Repository
import java.nio.file.Files
import java.nio.file.Path
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Repository
class DebugSessionStore(
    private val properties: RagEKhabProperties,
    private val mapper: ObjectMapper,
) {
    private val sessions = ConcurrentHashMap<UUID, DebugSession>()
    private val mappings = ConcurrentHashMap<String, DebugTokenMapping>()
    private val artifacts = ConcurrentHashMap<UUID, DebugArtifact>()
    private val dataRequests = ConcurrentHashMap<UUID, DebugDataRequest>()
    private val notes = ConcurrentHashMap<UUID, DebugNote>()
    private val auditEvents = ConcurrentHashMap<UUID, DebugAuditEvent>()
    private val storagePath: Path = Path.of(properties.storageDir).resolve("safe-debug-sessions.json")

    init {
        load()
    }

    @Synchronized
    fun saveSession(session: DebugSession): DebugSession {
        sessions[session.id] = session
        persist()
        return session
    }

    fun listSessions(): List<DebugSession> =
        sessions.values.sortedByDescending { it.updatedAt }

    fun getSession(id: UUID): DebugSession? = sessions[id]

    @Synchronized
    fun saveMapping(mapping: DebugTokenMapping): DebugTokenMapping {
        mappings[mappingKey(mapping.sessionId, mapping.token)] = mapping
        persist()
        return mapping
    }

    fun mappingsFor(sessionId: UUID): List<DebugTokenMapping> =
        mappings.values
            .filter { it.sessionId == sessionId }
            .sortedWith(compareBy<DebugTokenMapping> { it.entityType }.thenBy { it.token })

    @Synchronized
    fun saveArtifact(artifact: DebugArtifact): DebugArtifact {
        artifacts[artifact.id] = artifact
        persist()
        return artifact
    }

    fun artifactsFor(sessionId: UUID): List<DebugArtifact> =
        artifacts.values.filter { it.sessionId == sessionId }.sortedByDescending { it.createdAt }

    @Synchronized
    fun saveDataRequest(request: DebugDataRequest): DebugDataRequest {
        dataRequests[request.id] = request
        persist()
        return request
    }

    fun dataRequestsFor(sessionId: UUID): List<DebugDataRequest> =
        dataRequests.values.filter { it.sessionId == sessionId }.sortedByDescending { it.createdAt }

    fun getDataRequest(id: UUID): DebugDataRequest? = dataRequests[id]

    @Synchronized
    fun saveNote(note: DebugNote): DebugNote {
        notes[note.id] = note
        persist()
        return note
    }

    fun notesFor(sessionId: UUID): List<DebugNote> =
        notes.values.filter { it.sessionId == sessionId }.sortedByDescending { it.createdAt }

    @Synchronized
    fun saveAuditEvent(event: DebugAuditEvent): DebugAuditEvent {
        auditEvents[event.id] = event
        persist()
        return event
    }

    fun auditEventsFor(sessionId: UUID): List<DebugAuditEvent> =
        auditEvents.values.filter { it.sessionId == sessionId }.sortedByDescending { it.createdAt }

    private fun load() {
        if (!Files.exists(storagePath)) return
        runCatching {
            val stored = mapper.readValue(Files.readString(storagePath), StoredDebugSessions::class.java)
            stored.sessions.forEach { sessions[it.id] = it }
            stored.mappings.forEach { mappings[mappingKey(it.sessionId, it.token)] = it }
            stored.artifacts.forEach { artifacts[it.id] = it }
            stored.dataRequests.forEach { dataRequests[it.id] = it }
            stored.notes.forEach { notes[it.id] = it }
            stored.auditEvents.forEach { auditEvents[it.id] = it }
        }
    }

    private fun persist() {
        Files.createDirectories(storagePath.parent)
        val stored = StoredDebugSessions(
            sessions = sessions.values.sortedByDescending { it.updatedAt },
            mappings = mappings.values.sortedWith(compareBy<DebugTokenMapping> { it.sessionId }.thenBy { it.token }),
            artifacts = artifacts.values.sortedWith(compareBy<DebugArtifact> { it.sessionId }.thenByDescending { it.createdAt }),
            dataRequests = dataRequests.values.sortedWith(compareBy<DebugDataRequest> { it.sessionId }.thenByDescending { it.createdAt }),
            notes = notes.values.sortedWith(compareBy<DebugNote> { it.sessionId }.thenByDescending { it.createdAt }),
            auditEvents = auditEvents.values.sortedWith(compareBy<DebugAuditEvent> { it.sessionId }.thenByDescending { it.createdAt }),
        )
        Files.writeString(storagePath, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(stored))
    }

    private fun mappingKey(sessionId: UUID, token: String): String = "$sessionId:$token"
}

private data class StoredDebugSessions(
    val sessions: List<DebugSession> = emptyList(),
    val mappings: List<DebugTokenMapping> = emptyList(),
    val artifacts: List<DebugArtifact> = emptyList(),
    val dataRequests: List<DebugDataRequest> = emptyList(),
    val notes: List<DebugNote> = emptyList(),
    val auditEvents: List<DebugAuditEvent> = emptyList(),
)
