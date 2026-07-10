package com.ragekhab.api

import com.ragekhab.artifact.ArtifactIngestionResult
import com.ragekhab.artifact.ArtifactService
import com.ragekhab.artifact.ArtifactSlice
import com.ragekhab.artifact.RawArtifact
import com.ragekhab.artifact.RelatedRawContext
import com.ragekhab.document.ArtifactIngestionRequest
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@RestController
@RequestMapping("/api/artifacts")
class ArtifactController(
    private val artifactService: ArtifactService,
) {
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun ingest(@RequestBody request: ArtifactIngestionRequest): ArtifactIngestionResult =
        artifactService.ingest(request)

    @GetMapping("/{id}/raw")
    fun getRawArtifact(@PathVariable id: UUID): RawArtifact =
        artifactService.getRawArtifact(id) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Artifact not found")

    @GetMapping("/{id}/slice")
    fun getArtifactSlice(
        @PathVariable id: UUID,
        @RequestParam beforeLine: Int,
        @RequestParam afterLine: Int,
    ): ArtifactSlice =
        artifactService.getArtifactSlice(id, beforeLine, afterLine)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Artifact not found")

    @GetMapping("/{compressedArtifactId}/related-raw-context")
    fun getRelatedRawContext(@PathVariable compressedArtifactId: UUID): RelatedRawContext =
        artifactService.getRelatedRawContext(compressedArtifactId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Related raw artifact not found")
}
