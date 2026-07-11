package com.ragekhab.api

import com.ragekhab.repository.RepositoryAgentService
import com.ragekhab.repository.RepositoryAgentStatus
import com.ragekhab.repository.ContextPackage
import com.ragekhab.repository.ContextRequest
import com.ragekhab.repository.RepositoryContextBuilder
import com.ragekhab.repository.RepositoryScanRequest
import com.ragekhab.repository.RepositoryScanResult
import com.ragekhab.repository.RepositorySyncRequest
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/repository-agent")
class RepositoryAgentController(
    private val repositoryAgent: RepositoryAgentService,
    private val contextPackages: RepositoryContextBuilder,
) {
    @PostMapping("/scan")
    fun scan(@RequestBody(required = false) request: RepositoryScanRequest?): RepositoryScanResult =
        repositoryAgent.scan(request ?: RepositoryScanRequest())

    @PostMapping("/sync")
    fun sync(@RequestBody request: RepositorySyncRequest): RepositoryScanResult =
        repositoryAgent.sync(request)

    @GetMapping("/status")
    fun status(@RequestParam(required = false) repository: String?): RepositoryAgentStatus =
        repositoryAgent.status(repository)

    @PostMapping("/context-package")
    fun contextPackage(@RequestBody request: ContextRequest): ContextPackage =
        contextPackages.buildContextPackage(request)
}
