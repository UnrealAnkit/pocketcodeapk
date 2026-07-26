package com.remotedev.pocketcode.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.remotedev.pocketcode.R

// Inter and Space Grotesk ship as variable faces, so the weight axis has to be
// set explicitly -- passing FontWeight alone picks the nearest static instance,
// which for a single-file variable font is always the default 400.
@OptIn(ExperimentalTextApi::class)
private fun variable(resId: Int, weight: FontWeight) =
    Font(resId, weight = weight, variationSettings = FontVariation.Settings(FontVariation.weight(weight.weight)))

/**
 * Three roles, each doing one job.
 *
 * Space Grotesk carries screen titles and the wordmark. Its slightly mechanical
 * letterforms suit a control surface, and holding it back to titles only keeps
 * it from turning into decoration.
 *
 * Inter runs the interface. It was drawn for small sizes on screens, which is
 * most of this app.
 *
 * JetBrains Mono is for anything the machine wrote: paths, diffs, commands,
 * approval snippets. Reserving it for machine output means the typeface itself
 * tells you whether a human or a computer chose the words.
 */
val Display = FontFamily(
    variable(R.font.space_grotesk_variable, FontWeight.Medium),
    variable(R.font.space_grotesk_variable, FontWeight.SemiBold),
    variable(R.font.space_grotesk_variable, FontWeight.Bold),
)

val Body = FontFamily(
    variable(R.font.inter_variable, FontWeight.Normal),
    variable(R.font.inter_variable, FontWeight.Medium),
    variable(R.font.inter_variable, FontWeight.SemiBold),
)

val Mono = FontFamily(
    Font(R.font.jetbrains_mono_regular, FontWeight.Normal),
    Font(R.font.jetbrains_mono_medium, FontWeight.Medium),
)

/**
 * The panel-label treatment: uppercase, small, widely tracked. Used for section
 * headers and event kinds, where the text is naming a live readout rather than
 * introducing prose.
 */
val Eyebrow = TextStyle(
    fontFamily = Body,
    fontWeight = FontWeight.SemiBold,
    fontSize = 10.5.sp,
    lineHeight = 14.sp,
    letterSpacing = 1.2.sp,
)

val MonoSmall = TextStyle(
    fontFamily = Mono,
    fontWeight = FontWeight.Normal,
    fontSize = 12.sp,
    lineHeight = 18.sp,
)

val MonoBody = TextStyle(
    fontFamily = Mono,
    fontWeight = FontWeight.Normal,
    fontSize = 13.sp,
    lineHeight = 20.sp,
)

val PocketTypography = Typography(
    displaySmall = TextStyle(
        fontFamily = Display, fontWeight = FontWeight.Bold,
        fontSize = 28.sp, lineHeight = 34.sp, letterSpacing = (-0.6).sp,
    ),
    headlineSmall = TextStyle(
        fontFamily = Display, fontWeight = FontWeight.SemiBold,
        fontSize = 21.sp, lineHeight = 27.sp, letterSpacing = (-0.3).sp,
    ),
    titleLarge = TextStyle(
        fontFamily = Display, fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp, lineHeight = 24.sp, letterSpacing = (-0.2).sp,
    ),
    titleMedium = TextStyle(
        fontFamily = Body, fontWeight = FontWeight.SemiBold,
        fontSize = 15.sp, lineHeight = 21.sp,
    ),
    titleSmall = TextStyle(
        fontFamily = Body, fontWeight = FontWeight.SemiBold,
        fontSize = 13.sp, lineHeight = 18.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = Body, fontWeight = FontWeight.Normal,
        fontSize = 15.sp, lineHeight = 22.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = Body, fontWeight = FontWeight.Normal,
        fontSize = 14.sp, lineHeight = 20.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = Body, fontWeight = FontWeight.Normal,
        fontSize = 12.5.sp, lineHeight = 18.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = Body, fontWeight = FontWeight.SemiBold,
        fontSize = 13.sp, lineHeight = 17.sp, letterSpacing = 0.1.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = Body, fontWeight = FontWeight.Medium,
        fontSize = 12.sp, lineHeight = 16.sp,
    ),
    labelSmall = Eyebrow,
)
