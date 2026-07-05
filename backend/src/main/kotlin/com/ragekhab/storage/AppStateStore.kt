package com.ragekhab.storage

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.dao.DuplicateKeyException
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class AppStateStore(
    private val jdbc: JdbcTemplate,
    private val mapper: ObjectMapper,
) {
    init {
        jdbc.execute(
            """
            create table if not exists app_state (
                store varchar(80) not null,
                id varchar(120) not null,
                payload text not null,
                updated_at timestamp not null default current_timestamp,
                primary key (store, id)
            )
            """.trimIndent(),
        )
    }

    fun <T : Any> put(store: String, id: UUID, value: T): T = put(store, id.toString(), value)

    fun <T : Any> put(store: String, id: String, value: T): T {
        val payload = mapper.writeValueAsString(value)
        val updated = jdbc.update(
            "update app_state set payload = ?, updated_at = current_timestamp where store = ? and id = ?",
            payload,
            store,
            id,
        )
        if (updated == 0) {
            try {
                jdbc.update(
                    "insert into app_state (store, id, payload) values (?, ?, ?)",
                    store,
                    id,
                    payload,
                )
            } catch (_: DuplicateKeyException) {
                jdbc.update(
                    "update app_state set payload = ?, updated_at = current_timestamp where store = ? and id = ?",
                    payload,
                    store,
                    id,
                )
            }
        }
        return value
    }

    fun <T : Any> get(store: String, id: UUID, type: Class<T>): T? = get(store, id.toString(), type)

    fun <T : Any> get(store: String, id: String, type: Class<T>): T? =
        jdbc.query(
            "select payload from app_state where store = ? and id = ?",
            { rs, _ -> mapper.readValue(rs.getString("payload"), type) },
            store,
            id,
        ).firstOrNull()

    fun <T : Any> list(store: String, type: Class<T>): List<T> =
        jdbc.query(
            "select payload from app_state where store = ?",
            { rs, _ -> mapper.readValue(rs.getString("payload"), type) },
            store,
        )

    fun isEmpty(store: String): Boolean =
        jdbc.queryForObject("select count(*) from app_state where store = ?", Long::class.java, store) == 0L

    fun delete(store: String, id: UUID): Boolean = delete(store, id.toString())

    fun delete(store: String, id: String): Boolean =
        jdbc.update("delete from app_state where store = ? and id = ?", store, id) > 0

    fun deleteStore(store: String) {
        jdbc.update("delete from app_state where store = ?", store)
    }
}
