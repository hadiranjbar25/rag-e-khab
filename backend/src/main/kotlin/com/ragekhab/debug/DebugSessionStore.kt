package com.ragekhab.debug

import com.ragekhab.storage.AppStateStore
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class DebugSessionStore(
    private val state: AppStateStore,
) {
    @Synchronized
    fun saveSession(session: DebugSession): DebugSession = state.put(SESSIONS_STORE, session.id, session)

    fun listSessions(): List<DebugSession> =
        state.list(SESSIONS_STORE, DebugSession::class.java).sortedByDescending { it.updatedAt }

    fun getSession(id: UUID): DebugSession? = state.get(SESSIONS_STORE, id, DebugSession::class.java)

    @Synchronized
    fun saveMapping(mapping: DebugTokenMapping): DebugTokenMapping =
        state.put(MAPPINGS_STORE, mappingKey(mapping.sessionId, mapping.token), mapping)

    fun mappingsFor(sessionId: UUID): List<DebugTokenMapping> =
        state.list(MAPPINGS_STORE, DebugTokenMapping::class.java)
            .filter { it.sessionId == sessionId }
            .sortedWith(compareBy<DebugTokenMapping> { it.entityType }.thenBy { it.token })

    @Synchronized
    fun saveArtifact(artifact: DebugArtifact): DebugArtifact = state.put(ARTIFACTS_STORE, artifact.id, artifact)

    fun getArtifact(id: UUID): DebugArtifact? = state.get(ARTIFACTS_STORE, id, DebugArtifact::class.java)

    fun artifactsFor(sessionId: UUID): List<DebugArtifact> =
        state.list(ARTIFACTS_STORE, DebugArtifact::class.java)
            .filter { it.sessionId == sessionId }
            .sortedByDescending { it.createdAt }

    @Synchronized
    fun saveDataRequest(request: DebugDataRequest): DebugDataRequest = state.put(DATA_REQUESTS_STORE, request.id, request)

    fun dataRequestsFor(sessionId: UUID): List<DebugDataRequest> =
        state.list(DATA_REQUESTS_STORE, DebugDataRequest::class.java)
            .filter { it.sessionId == sessionId }
            .sortedByDescending { it.createdAt }

    fun getDataRequest(id: UUID): DebugDataRequest? = state.get(DATA_REQUESTS_STORE, id, DebugDataRequest::class.java)

    @Synchronized
    fun saveNote(note: DebugNote): DebugNote = state.put(NOTES_STORE, note.id, note)

    fun notesFor(sessionId: UUID): List<DebugNote> =
        state.list(NOTES_STORE, DebugNote::class.java)
            .filter { it.sessionId == sessionId }
            .sortedByDescending { it.createdAt }

    @Synchronized
    fun saveAuditEvent(event: DebugAuditEvent): DebugAuditEvent = state.put(AUDIT_EVENTS_STORE, event.id, event)

    fun auditEventsFor(sessionId: UUID): List<DebugAuditEvent> =
        state.list(AUDIT_EVENTS_STORE, DebugAuditEvent::class.java)
            .filter { it.sessionId == sessionId }
            .sortedByDescending { it.createdAt }

    private fun mappingKey(sessionId: UUID, token: String): String = "$sessionId:$token"

    private companion object {
        const val SESSIONS_STORE = "debug-sessions"
        const val MAPPINGS_STORE = "debug-token-mappings"
        const val ARTIFACTS_STORE = "debug-artifacts"
        const val DATA_REQUESTS_STORE = "debug-data-requests"
        const val NOTES_STORE = "debug-notes"
        const val AUDIT_EVENTS_STORE = "debug-audit-events"
    }
}
