package com.ragekhab.api

import com.ragekhab.memory.AgentMemory
import com.ragekhab.memory.MemoryService
import com.ragekhab.memory.RecallMemoryRequest
import com.ragekhab.memory.RecallMemoryResponse
import com.ragekhab.memory.RememberRequest
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@RestController
@RequestMapping("/api/memories")
class MemoryController(
    private val memoryService: MemoryService,
) {
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun remember(@RequestBody request: RememberRequest): AgentMemory =
        memoryService.remember(request)

    @PostMapping("/recall")
    fun recall(@RequestBody request: RecallMemoryRequest): RecallMemoryResponse =
        memoryService.recall(request)

    @GetMapping
    fun list(): List<AgentMemory> =
        memoryService.list()

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable id: UUID) {
        if (!memoryService.delete(id)) throw ResponseStatusException(HttpStatus.NOT_FOUND, "Memory not found")
    }
}
