package com.ragekhab.search

import com.ragekhab.document.DocumentChunk

fun DocumentChunk.toResult(score: Double) = SearchResult(
    projectId = projectId.toString(),
    projectName = projectName,
    documentId = documentId.toString(),
    documentName = documentName,
    pageNumber = pageNumber,
    chunkId = id,
    score = score,
    text = text,
)
