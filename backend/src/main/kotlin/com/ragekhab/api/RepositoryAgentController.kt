package com.ragekhab.api

import com.ragekhab.repository.RepositoryAgentService
import com.ragekhab.repository.RepositoryAgentStatus
import com.ragekhab.repository.RepositoryScanRequest
import com.ragekhab.repository.RepositoryScanResult
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/repository-agent")
class RepositoryAgentController(
    private val repositoryAgent: RepositoryAgentService,
) {
    @PostMapping("/scan")
    fun scan(@RequestBody(required = false) request: RepositoryScanRequest?): RepositoryScanResult =
        repositoryAgent.scan(request ?: RepositoryScanRequest())

    @GetMapping("/status")
    fun status(): RepositoryAgentStatus =
        repositoryAgent.status()
}
