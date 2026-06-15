package com.ragekhab.api

import com.ragekhab.chat.ChatRequest
import com.ragekhab.chat.ChatResponse
import com.ragekhab.chat.ChatService
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/chat")
class ChatController(private val chatService: ChatService) {
    @PostMapping
    fun ask(@RequestBody request: ChatRequest): ChatResponse =
        chatService.ask(request.question, request.limit, request.projectId?.let(UUID::fromString))
}
