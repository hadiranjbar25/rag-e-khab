package com.ragekhab.api

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class ApiExceptionHandler {
    @ExceptionHandler(IllegalArgumentException::class)
    fun illegalArgument(exception: IllegalArgumentException): ResponseEntity<ApiErrorResponse> =
        badRequest(exception.message ?: "Invalid request.")

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun unreadableMessage(exception: HttpMessageNotReadableException): ResponseEntity<ApiErrorResponse> =
        badRequest(readableMessage(exception))

    private fun badRequest(message: String): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ApiErrorResponse(
                status = HttpStatus.BAD_REQUEST.value(),
                error = HttpStatus.BAD_REQUEST.reasonPhrase,
                message = message,
            ),
        )

    private fun readableMessage(exception: HttpMessageNotReadableException): String {
        val causeMessage = exception.mostSpecificCause.message.orEmpty()
        return when {
            causeMessage.contains("task", ignoreCase = true) -> "Task is required."
            causeMessage.isNotBlank() -> causeMessage
            else -> "Request body must be valid JSON."
        }
    }
}

data class ApiErrorResponse(
    val status: Int,
    val error: String,
    val message: String,
)
