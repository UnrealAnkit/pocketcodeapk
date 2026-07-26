package com.remotedev.pocketcode.terminal

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.remotedev.pocketcode.PocketcodeApp
import com.remotedev.pocketcode.commands.SavedCommandBar
import com.remotedev.pocketcode.ui.components.StatusLamp
import com.remotedev.pocketcode.ui.theme.Mono
import com.remotedev.pocketcode.ui.theme.Space
import com.remotedev.pocketcode.ui.theme.status

data class Tab(
    val id: String,
    val title: String,
    val alive: Boolean = true,
    // Raw PTY output (post-JSON-decode, pre-ANSI-interpretation). Rendering
    // (colors, cursor movement, TUI redraws) is handled by xterm.js in
    // XtermTerminalView -- see that file for why a hand-rolled line-by-line
    // parser couldn't represent full-screen apps like Codex/Gemini/Claude Code.
    val raw: String = ""
)

@Composable
fun TerminalScreen(
    tabs: List<Tab>,
    activeTab: Int,
    onActiveTabChange: (Int) -> Unit,
    onAddTab: () -> Unit,
    onCloseTab: (String) -> Unit,
    onInput: (String) -> Unit,
    onResize: (tabId: String, cols: Int, rows: Int) -> Unit = { _, _, _ -> },
) {
    // Saved commands
    val savedCommands by PocketcodeApp.instance.savedCommands.commands.collectAsState()

    val cur = tabs.getOrNull(activeTab)
    var showTabMenu by remember { mutableStateOf(false) }
    val cs = MaterialTheme.colorScheme

    Column(
        Modifier
            .fillMaxSize()
            .imePadding()
            .background(cs.background)
    ) {
        // ── Top bar: pill tab selector (tap to switch / close / add tabs) ────
        Row(
            Modifier
                .fillMaxWidth()
                .background(cs.surface)
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.weight(1f)) {
                Surface(
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
                }
                DropdownMenu(
                    expanded = showTabMenu,
                    onDismissRequest = { showTabMenu = false },
                ) {
                    tabs.forEachIndexed { i, t ->
                        DropdownMenuItem(
                            text = { Text(t.title, fontFamily = Mono) },
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
                            },
                        )
                    }
                    DropdownMenuItem(
                        text = { Text("+ New terminal") },
                        onClick = { onAddTab(); showTabMenu = false },
                    )
                }
            }
        }

        if (cur != null) {
            // ── Terminal output: real terminal emulator, not a text list ──────
            XtermTerminalView(
                tabId = cur.id,
                raw = cur.raw,
                onInput = onInput,
                onResize = { cols, rows -> onResize(cur.id, cols, rows) },
                modifier = Modifier.weight(1f).fillMaxWidth(),
            )

            // ── Saved commands bar ────────────────────────────────────────────
            // Shown even when the command list is empty (shows only the "+" chip),
            // so users discover the feature immediately.
            SavedCommandBar(
                commands = savedCommands,
                onRun = { cmd -> onInput(cmd) },
                onAdd = { label, cmd -> PocketcodeApp.instance.savedCommands.add(label, cmd) },
                onRemove = { id -> PocketcodeApp.instance.savedCommands.remove(id) },
            )

            // ── Extra keys ───────────────────────────────────────────────────
            ExtraKeys(onSend = { onInput(it) })
        } else {
            Box(
                Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center,
            ) {
                Button(onClick = onAddTab, shape = MaterialTheme.shapes.small) {
                    Text("Open a terminal", style = MaterialTheme.typography.labelLarge)
                }
            }
        }
    }
}

@Composable
private fun ExtraKeys(onSend: (String) -> Unit) {
    // Keys a phone keyboard cannot reach but a TUI needs constantly.
    val keys = listOf(
        "esc"  to "",
        "ctrl" to "",
        "tab"  to "\t",
        "~"    to "~",
        "|"    to "|",
        "/"    to "/",
        "-"    to "-",
        "<-"   to "[D",
        "v"    to "[B",
        "^"    to "[A",
        "->"   to "[C",
    )
    val cs = MaterialTheme.colorScheme
    Row(
        Modifier
            .fillMaxWidth()
            .background(cs.surface)
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 6.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        keys.forEach { (label, payload) ->
            Surface(
                onClick = { onSend(payload) },
                shape = RoundedCornerShape(8.dp),
                color = cs.surfaceVariant,
            ) {
                Text(
                    label,
                    fontFamily = FontFamily.Monospace,
                    fontSize = 12.sp,
                    color = cs.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                )
            }
        }
    }
}
