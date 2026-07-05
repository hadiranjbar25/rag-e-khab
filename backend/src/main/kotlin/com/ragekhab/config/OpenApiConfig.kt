package com.ragekhab.config

import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import org.springdoc.core.models.GroupedOpenApi
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class OpenApiConfig {
    @Bean
    fun ragEKhabOpenApi(): OpenAPI = OpenAPI()
        .info(
            Info()
                .title("RAG-e Khab API")
                .version("0.1.0")
                .description("REST API for documents, search, chat, memory, repositories, context optimization, and Safe Debug Sessions.")
        )

    @Bean
    fun restApiGroup(): GroupedOpenApi = GroupedOpenApi.builder()
        .group("rest-api")
        .pathsToMatch("/api/**")
        .build()
}
