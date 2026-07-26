package com.remotedev.pocketcode.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * PocketCode reads as an instrument, not an inbox.
 *
 * The app exists for one moment: an agent is blocked on a desktop somewhere and
 * needs a human to say yes or no. That is an annunciator panel's job, so the
 * palette borrows one -- a deep blue-shifted ink, quiet slate panels, and a
 * single amber caution lamp.
 *
 * Amber is the *brand* colour here, not just a warning colour, which is the one
 * deliberate risk in this palette. It means the colour that identifies the
 * product and the colour that means "you are needed" are the same, so the
 * approval prompt does not have to shout to be understood -- every other screen
 * has already taught you that amber means act. The cost is that nothing else may
 * use amber, which is why "connecting" is a pulsing neutral rather than the
 * usual yellow.
 */
object Ink {
    val Base = Color(0xFF0A0D12)        // app background; blue-shifted, not neutral black
    val Panel = Color(0xFF12161D)       // cards, nav, top bar
    val PanelHigh = Color(0xFF1A2029)   // inputs, chips, pressed states
    val Hairline = Color(0xFF262E3A)    // 1px rules and borders
    val HairlineSoft = Color(0xFF1C232D)

    val Bone = Color(0xFFE6E9EF)        // primary text, cool near-white
    val Muted = Color(0xFF8B94A3)       // secondary text
    val Faint = Color(0xFF5A6472)       // disabled, idle lamps
}

/** Status lamps. One meaning each -- see the note on amber above. */
object Lamp {
    val Signal = Color(0xFFF5A524)      // brand + "agent is waiting on you"
    val SignalDim = Color(0xFF3A2A0C)   // amber-tinted container
    val Ok = Color(0xFF3DD68C)          // connected, staged, added, passing
    val Fault = Color(0xFFFF6B6B)       // error, reject, deleted
    val Info = Color(0xFF7C9CFF)        // diffs, links, informational activity
    val Idle = Color(0xFF5A6472)        // not paired, nothing running
}

/**
 * Semantic roles that Material's ColorScheme has no slot for. Screens used to
 * hardcode these hexes individually, so "connected green" drifted between the
 * connection pill, the machine list and the terminal tab strip.
 */
data class StatusColors(
    val ok: Color = Lamp.Ok,
    val signal: Color = Lamp.Signal,
    val signalContainer: Color = Lamp.SignalDim,
    val fault: Color = Lamp.Fault,
    val info: Color = Lamp.Info,
    val idle: Color = Lamp.Idle,
)

val LocalStatusColors = staticCompositionLocalOf { StatusColors() }

val PocketColorScheme = darkColorScheme(
    primary = Lamp.Signal,
    onPrimary = Ink.Base,
    primaryContainer = Lamp.SignalDim,
    onPrimaryContainer = Color(0xFFFFDFA8),

    secondary = Lamp.Info,
    onSecondary = Ink.Base,
    secondaryContainer = Color(0xFF1B2440),
    onSecondaryContainer = Color(0xFFCBD8FF),

    tertiary = Lamp.Ok,
    onTertiary = Ink.Base,
    tertiaryContainer = Color(0xFF0F2A20),
    onTertiaryContainer = Color(0xFFB6F0D4),

    background = Ink.Base,
    onBackground = Ink.Bone,
    surface = Ink.Panel,
    onSurface = Ink.Bone,
    surfaceVariant = Ink.PanelHigh,
    onSurfaceVariant = Ink.Muted,

    outline = Ink.Hairline,
    outlineVariant = Ink.HairlineSoft,

    error = Lamp.Fault,
    onError = Ink.Base,
    errorContainer = Color(0xFF3A1418),
    onErrorContainer = Color(0xFFFFD2D2),

    scrim = Color(0xCC05070A),
)
