package com.remotedev.pocketcode.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.remotedev.pocketcode.ui.theme.Eyebrow as EyebrowStyle
import com.remotedev.pocketcode.ui.theme.Space

/**
 * A panel label: uppercase, tracked, quiet. Names a live readout rather than
 * introducing prose, which is why it is set apart from the body scale.
 */
@Composable
fun Eyebrow(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.onSurfaceVariant,
) {
    Text(text.uppercase(), modifier = modifier, style = EyebrowStyle, color = color)
}

/** The status lamp. Pulses only while something is genuinely in flight. */
@Composable
fun StatusLamp(color: Color, pulsing: Boolean = false, size: Dp = 8.dp) {
    val transition = rememberInfiniteTransition(label = "lamp")
    val alpha by transition.animateFloat(
        initialValue = 1f,
        targetValue = 0.2f,
        animationSpec = infiniteRepeatable(tween(750), RepeatMode.Reverse),
        label = "pulse",
    )
    Box(
        Modifier
            .size(size)
            .graphicsLayer { this.alpha = if (pulsing) alpha else 1f }
            .clip(CircleShape)
            .background(color)
    )
}

/**
 * The standard raised surface: panel fill plus a hairline. Stock M3 cards lean
 * on tonal elevation, which on a near-black background reads as a muddy grey
 * rectangle with no defined edge.
 */
@Composable
fun PanelCard(
    modifier: Modifier = Modifier,
    accent: Color? = null,
    shape: Shape = MaterialTheme.shapes.medium,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val cs = MaterialTheme.colorScheme
    val border = BorderStroke(1.dp, accent?.copy(alpha = 0.55f) ?: cs.outline)
    val fill = if (accent != null) cs.surface else cs.surface
    if (onClick != null) {
        Surface(onClick = onClick, modifier = modifier, shape = shape, color = fill, border = border) {
            Column(Modifier.padding(Space.md), content = content)
        }
    } else {
        Surface(modifier = modifier, shape = shape, color = fill, border = border) {
            Column(Modifier.padding(Space.md), content = content)
        }
    }
}

/**
 * An empty screen is an invitation to act, so every one of these takes an
 * action. Screens used to each draw their own centred column with a different
 * padding and an emoji.
 */
@Composable
fun EmptyState(
    icon: ImageVector,
    title: String,
    body: String,
    modifier: Modifier = Modifier,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
) {
    val cs = MaterialTheme.colorScheme
    Box(modifier.fillMaxSize().padding(Space.xxl), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Surface(
                shape = CircleShape,
                color = cs.surfaceVariant,
                border = BorderStroke(1.dp, cs.outline),
            ) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = cs.onSurfaceVariant,
                    modifier = Modifier.padding(Space.lg).size(24.dp),
                )
            }
            Spacer(Modifier.height(Space.lg))
            Text(title, style = MaterialTheme.typography.titleLarge, color = cs.onSurface)
            Spacer(Modifier.height(Space.sm))
            Text(
                body,
                style = MaterialTheme.typography.bodyMedium,
                color = cs.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
            if (actionLabel != null && onAction != null) {
                Spacer(Modifier.height(Space.xl))
                Button(onClick = onAction, shape = MaterialTheme.shapes.small) { Text(actionLabel) }
            }
        }
    }
}

/** Row of eyebrow + optional trailing control, with the hairline that follows it. */
@Composable
fun SectionHeader(
    label: String,
    modifier: Modifier = Modifier,
    trailing: @Composable (RowScope.() -> Unit)? = null,
) {
    Column(modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = Space.lg, vertical = Space.sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Eyebrow(label, Modifier.weight(1f))
            trailing?.invoke(this)
        }
        HorizontalDivider(thickness = 1.dp, color = MaterialTheme.colorScheme.outlineVariant)
    }
}

/** Shown while waiting on the desktop, so a slow reply is not mistaken for empty. */
@Composable
fun LoadingState(label: String, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize().padding(Space.xxl), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(strokeWidth = 2.dp, modifier = Modifier.size(22.dp))
            Spacer(Modifier.height(Space.md))
            Eyebrow(label)
        }
    }
}
