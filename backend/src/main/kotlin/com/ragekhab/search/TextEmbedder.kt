package com.ragekhab.search

import org.springframework.stereotype.Component
import kotlin.math.sqrt

@Component
class TextEmbedder {
    val dimensions = 384

    fun embed(text: String): List<Float> {
        val vector = FloatArray(dimensions)
        tokens(text).forEach { token ->
            val index = token.hashCode().floorMod(dimensions)
            vector[index] += 1f
        }
        val norm = sqrt(vector.sumOf { (it * it).toDouble() }).toFloat()
        if (norm > 0f) {
            for (index in vector.indices) vector[index] = vector[index] / norm
        }
        return vector.toList()
    }

    fun cosine(a: List<Float>, b: List<Float>): Double {
        if (a.isEmpty() || b.isEmpty()) return 0.0
        return (0 until minOf(a.size, b.size)).sumOf { index -> (a[index] * b[index]).toDouble() }
    }

    private fun tokens(text: String): List<String> =
        text.lowercase()
            .split(Regex("[^\\p{L}\\p{N}]+"))
            .filter { it.length > 2 }

    private fun Int.floorMod(modulus: Int): Int = Math.floorMod(this, modulus)
}
