package com.ragekhab.config

import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.scheduling.annotation.EnableScheduling

@Configuration
@EnableConfigurationProperties(RagEKhabProperties::class)
@EnableScheduling
class AppConfig {
    @Bean
    fun objectMapper(): ObjectMapper =
        ObjectMapper()
            .registerModule(JavaTimeModule())
            .findAndRegisterModules()
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
}
