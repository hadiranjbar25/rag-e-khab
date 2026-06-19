package com.ragekhab.config

import com.fasterxml.jackson.databind.ObjectMapper
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
        ObjectMapper().findAndRegisterModules()
}
