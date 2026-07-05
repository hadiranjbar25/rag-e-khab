package com.ragekhab

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.ragekhab.storage.AppStateStore
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.datasource.DriverManagerDataSource
import java.util.UUID

fun testStateStore(): AppStateStore {
    val dataSource = DriverManagerDataSource(
        "jdbc:h2:mem:${UUID.randomUUID()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "sa",
        "",
    )
    return AppStateStore(JdbcTemplate(dataSource), testObjectMapper())
}

fun testObjectMapper(): ObjectMapper =
    ObjectMapper()
        .registerModule(JavaTimeModule())
        .findAndRegisterModules()
