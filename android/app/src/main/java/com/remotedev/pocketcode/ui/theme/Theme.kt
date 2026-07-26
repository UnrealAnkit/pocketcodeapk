package com.remotedev.pocketcode.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.unit.dp

/**
 * One spacing ladder for the whole app. Padding used to be picked per screen
 * from {4, 6, 8, 10, 12, 16, 18, 20, 32}, which is why nothing lined up between
 * one tab and the next.
 */
object Space {
    val xs = 4.dp
    val sm = 8.dp
    val md = 12.dp
    val lg = 16.dp
    val xl = 24.dp
    val xxl = 32.dp
}

val PocketShapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(14.dp),
    large = RoundedCornerShape(18.dp),
    extraLarge = RoundedCornerShape(26.dp),
)

@Composable
fun PocketCodeTheme(content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalStatusColors provides StatusColors()) {
        MaterialTheme(
            colorScheme = PocketColorScheme,
            typography = PocketTypography,
            shapes = PocketShapes,
            content = content,
        )
    }
}

/** Shorthand so screens can read `status.ok` the way they read `colorScheme.primary`. */
val status: StatusColors
    @Composable get() = LocalStatusColors.current
