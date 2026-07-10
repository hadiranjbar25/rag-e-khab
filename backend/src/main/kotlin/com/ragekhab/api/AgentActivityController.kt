package com.ragekhab.api

import com.ragekhab.activity.AgentActivity
import com.ragekhab.activity.AgentActivityService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/activity")
class AgentActivityController(
    private val activityService: AgentActivityService,
) {
    @GetMapping
    fun list(@RequestParam(required = false, defaultValue = "50") limit: Int): List<AgentActivity> =
        activityService.list(limit)
}
