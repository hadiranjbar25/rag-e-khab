package com.ragekhab.activity

import com.ragekhab.storage.AppStateStore
import org.springframework.stereotype.Repository

@Repository
class AgentActivityStore(
    private val state: AppStateStore,
) {
    fun save(activity: AgentActivity): AgentActivity =
        state.put(STORE, activity.id, activity)

    fun list(limit: Int = 50): List<AgentActivity> =
        state.list(STORE, AgentActivity::class.java)
            .sortedByDescending { it.createdAt }
            .take(limit.coerceIn(1, 200))

    private companion object {
        const val STORE = "agent-activity"
    }
}
