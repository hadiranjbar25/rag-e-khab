package com.ragekhab.api

import com.ragekhab.context.ContextOptimizationRequest
import com.ragekhab.context.ContextOptimizerService
import com.ragekhab.context.OptimizedContext
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/context")
class ContextOptimizerController(
    private val optimizerService: ContextOptimizerService,
) {
    @PostMapping("/optimize")
    fun optimize(@RequestBody request: ContextOptimizationRequest): OptimizedContext =
        optimizerService.optimize(request)
}
