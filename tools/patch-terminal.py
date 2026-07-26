#!/usr/bin/env python3
"""Reapplies the Terminal.kt polish without touching encoding or line endings.

The file mixes UTF-8 box-drawing comments with literal ESC (0x1b) bytes in the
extra-keys table. Editing it through a tool that guesses the encoding rewrites
every line and turns the box-drawing characters into '?', so the edits are done
here instead, on exact substrings, with newline translation disabled.
"""
import io
import sys

PATH = ("/mnt/d/PROJECTS/pocketcodeapk/android/app/src/main/java/"
        "com/remotedev/pocketcode/terminal/Terminal.kt")

EDITS = [
    # imports
    (
        "import androidx.compose.foundation.background\n"
        "import androidx.compose.foundation.horizontalScroll\n",
        "import androidx.compose.foundation.BorderStroke\n"
        "import androidx.compose.foundation.background\n"
        "import androidx.compose.foundation.horizontalScroll\n",
    ),
    (
        "import androidx.compose.material3.*\n"
        "import androidx.compose.runtime.*\n",
        "import androidx.compose.material.icons.Icons\n"
        "import androidx.compose.material.icons.outlined.Close\n"
        "import androidx.compose.material.icons.outlined.ExpandMore\n"
        "import androidx.compose.material3.*\n"
        "import androidx.compose.runtime.*\n",
    ),
    (
        "import com.remotedev.pocketcode.commands.SavedCommandBar\n",
        "import com.remotedev.pocketcode.commands.SavedCommandBar\n"
        "import com.remotedev.pocketcode.ui.components.StatusLamp\n"
        "import com.remotedev.pocketcode.ui.theme.Mono\n"
        "import com.remotedev.pocketcode.ui.theme.Space\n"
        "import com.remotedev.pocketcode.ui.theme.status\n",
    ),
    # tab selector: themed lamp + a real chevron instead of a text glyph
    (
        """                Surface(
                    onClick = { showTabMenu = true },
                    shape = RoundedCornerShape(50),
                    color = cs.surfaceVariant,
                ) {
                    Row(
                        Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier
                                .size(7.dp)
                                .clip(CircleShape)
                                .background(if (cur?.alive == true) Color(0xFF22C55E) else cs.onSurfaceVariant)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            text = if (cur != null) "${cur.title}  \u25be" else "Terminal  \u25be",
                            color = cs.onSurface,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 15.sp,
                        )
                    }
                }""",
        """                Surface(
                    onClick = { showTabMenu = true },
                    shape = RoundedCornerShape(50),
                    color = cs.surfaceVariant,
                    border = BorderStroke(1.dp, cs.outline),
                ) {
                    Row(
                        Modifier.padding(start = 12.dp, end = 6.dp, top = 6.dp, bottom = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        StatusLamp(if (cur?.alive == true) status.ok else status.idle, size = 7.dp)
                        Spacer(Modifier.width(Space.sm))
                        Text(
                            text = cur?.title ?: "No terminal",
                            color = cs.onSurface,
                            fontFamily = Mono,
                            fontSize = 14.sp,
                        )
                        Icon(
                            Icons.Outlined.ExpandMore,
                            contentDescription = "Switch terminal",
                            tint = cs.onSurfaceVariant,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }""",
    ),
    # close affordance in the tab menu
    (
        """                            text = { Text(t.title, fontFamily = FontFamily.Monospace) },
                            onClick = { onActiveTabChange(i); showTabMenu = false },
                            trailingIcon = {
                                TextButton(onClick = {
                                    onCloseTab(t.id)
                                    showTabMenu = false
                                }) {
                                    Text("\u2715", color = cs.error, fontSize = 14.sp)
                                }
                            },""",
        """                            text = { Text(t.title, fontFamily = Mono) },
                            onClick = { onActiveTabChange(i); showTabMenu = false },
                            trailingIcon = {
                                IconButton(onClick = {
                                    onCloseTab(t.id)
                                    showTabMenu = false
                                }) {
                                    Icon(
                                        Icons.Outlined.Close,
                                        contentDescription = "Close ${t.title}",
                                        tint = cs.onSurfaceVariant,
                                        modifier = Modifier.size(16.dp),
                                    )
                                }
                            },""",
    ),
    # empty state: a bare TextButton in the middle of a black screen
    (
        """                TextButton(onClick = onAddTab) {
                    Text("Tap to open a terminal", color = cs.onSurfaceVariant)
                }""",
        """                Button(onClick = onAddTab, shape = MaterialTheme.shapes.small) {
                    Text("Open a terminal", style = MaterialTheme.typography.labelLarge)
                }""",
    ),
    # the key bar is ours, not a clone of someone else's
    (
        "    // Matches CodeMote's key bar: esc ctrl ->| ~ | / - left down up right\n",
        "    // Keys a phone keyboard cannot reach but a TUI needs constantly.\n",
    ),
]


def main() -> int:
    with io.open(PATH, "r", encoding="utf-8", newline="") as fh:
        src = fh.read()

    for old, new in EDITS:
        if old not in src:
            print("MISS: %r..." % old[:70])
            return 1
        src = src.replace(old, new, 1)

    with io.open(PATH, "w", encoding="utf-8", newline="") as fh:
        fh.write(src)
    print("patched Terminal.kt")
    return 0


if __name__ == "__main__":
    sys.exit(main())
