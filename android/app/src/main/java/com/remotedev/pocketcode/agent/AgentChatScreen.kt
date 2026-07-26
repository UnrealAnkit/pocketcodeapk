package com.remotedev.pocketcode.agent

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.remotedev.pocketcode.terminal.Tab
import com.remotedev.pocketcode.terminal.XtermTerminalView
import com.remotedev.pocketcode.ui.components.Eyebrow
import com.remotedev.pocketcode.ui.components.EmptyState
import com.remotedev.pocketcode.ui.theme.Mono
import com.remotedev.pocketcode.ui.theme.MonoSmall
import com.remotedev.pocketcode.ui.theme.Space
import com.remotedev.pocketcode.ui.theme.status

/**
 * Per-terminal native chat surface for structured Claude Code and Codex CLI
 * events. The raw xterm view remains one tap away for unsupported output,
 * debugging, and other agent CLIs.
 */
@Composable
fun AgentChatScreen(
    events: List<AgentEvent>,
    tabs: List<Tab>,
    onApprove: (String) -> Unit,
    onReject: (String) -> Unit,
    onInput: (tabId: String, data: String) -> Unit,
    onResize: (tabId: String, cols: Int, rows: Int) -> Unit,
) {
    val threadTabs = remember(events, tabs) {
        val eventTabs = events.map { it.tab }.filter { it.isNotBlank() }.toSet()
        tabs.filter { it.id in eventTabs }
    }
    var selectedTab by remember { mutableStateOf<String?>(null) }
    var rawTerminal by remember { mutableStateOf(false) }
    LaunchedEffect(threadTabs) {
        if (selectedTab !in threadTabs.map { it.id }) selectedTab = threadTabs.firstOrNull()?.id
    }
    val selected = threadTabs.firstOrNull { it.id == selectedTab }

    Column(Modifier.fillMaxSize()) {
        if (threadTabs.isEmpty()) {
            EmptyState(
                icon = Icons.Outlined.Bolt,
                title = "Nothing running yet",
                body = "Start Claude Code or Codex CLI in a terminal and its activity shows up here. " +
                    "Other agents still work — read them in Raw terminal.",
            )
            return@Column
        }
        ThreadSelector(
            tabs = threadTabs,
            selectedTab = selectedTab,
            onSelect = { selectedTab = it; rawTerminal = false },
        )
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = Space.lg, vertical = Space.xs),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Eyebrow(selected?.let { agentLabel(events, it.id) } ?: "Agent")
            TextButton(onClick = { rawTerminal = !rawTerminal }) {
                Text(
                    if (rawTerminal) "Native view" else "Raw terminal",
                    style = MaterialTheme.typography.labelMedium,
                )
            }
        }
        if (selected == null) return@Column

        val threadEvents = remember(events, selected.id) { events.filter { it.tab == selected.id } }

        if (rawTerminal) {
            XtermTerminalView(
                tabId = selected.id,
                raw = selected.raw,
                onInput = { onInput(selected.id, it) },
                onResize = { cols, rows -> onResize(selected.id, cols, rows) },
                modifier = Modifier.weight(1f).fillMaxWidth(),
            )
        } else {
            NativeConversation(events = threadEvents, modifier = Modifier.weight(1f))
        }

        // The prompt is only live while it is the most recent thing the agent
        // said. Anything older has already been answered, and offering its
        // buttons again would send a keystroke into an unrelated prompt.
        val pending = threadEvents.lastOrNull()?.takeIf { it.kind == "awaiting_approval" }
        var answered by remember(selected.id) { mutableStateOf<Long?>(null) }
        val live = pending?.takeIf { it.ts != answered }

        AnimatedVisibility(
            visible = live != null,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically(),
        ) {
            ApprovalConsole(
                snippet = live?.summary.orEmpty(),
                onApprove = { answered = pending?.ts; onApprove(selected.id) },
                onReject = { answered = pending?.ts; onReject(selected.id) },
            )
        }
    }
}

/**
 * The signature surface. Everything else in the app is deliberately quiet so
 * that this one card can be loud: it is the only place amber appears at full
 * strength, it pins itself to the bottom of the screen within thumb reach, and
 * it breathes until someone answers it.
 */
@Composable
private fun ApprovalConsole(snippet: String, onApprove: () -> Unit, onReject: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val signal = status.signal
    val transition = rememberInfiniteTransition(label = "await")
    val glow by transition.animateFloat(
        initialValue = 0.35f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1100), RepeatMode.Reverse),
        label = "glow",
    )
    Surface(
        modifier = Modifier.fillMaxWidth().padding(Space.md),
        shape = MaterialTheme.shapes.large,
        color = cs.surface,
        border = BorderStroke(1.5.dp, signal.copy(alpha = glow)),
        shadowElevation = 12.dp,
    ) {
        Column(Modifier.padding(Space.lg)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Bolt, contentDescription = null, tint = signal, modifier = Modifier.size(15.dp))
                Spacer(Modifier.width(Space.xs + 2.dp))
                Eyebrow("Waiting on you", color = signal)
            }
            Spacer(Modifier.height(Space.md))
            Surface(
                shape = MaterialTheme.shapes.small,
                color = cs.background,
                border = BorderStroke(1.dp, cs.outlineVariant),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    snippet.ifBlank { "The agent is asking for confirmation." },
                    style = MonoSmall,
                    color = cs.onSurface,
                    maxLines = 5,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(Space.md),
                )
            }
            Spacer(Modifier.height(Space.lg))
            Row(horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
                Button(
                    onClick = onApprove,
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = MaterialTheme.shapes.small,
                    colors = ButtonDefaults.buttonColors(containerColor = signal, contentColor = cs.background),
                ) {
                    Icon(Icons.Outlined.Check, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(Space.sm))
                    Text("Approve", style = MaterialTheme.typography.labelLarge)
                }
                OutlinedButton(
                    onClick = onReject,
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = MaterialTheme.shapes.small,
                    border = BorderStroke(1.dp, cs.outline),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = cs.onSurfaceVariant),
                ) {
                    Icon(Icons.Outlined.Close, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(Space.sm))
                    Text("Reject", style = MaterialTheme.typography.labelLarge)
                }
            }
        }
    }
}

@Composable
private fun ThreadSelector(tabs: List<Tab>, selectedTab: String?, onSelect: (String) -> Unit) {
    if (tabs.size < 2) return   // a chip row of one is just a label
    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())
            .padding(horizontal = Space.lg, vertical = Space.sm),
        horizontalArrangement = Arrangement.spacedBy(Space.sm),
    ) {
        tabs.forEach { tab ->
            FilterChip(
                selected = tab.id == selectedTab,
                onClick = { onSelect(tab.id) },
                shape = MaterialTheme.shapes.small,
                label = { Text(tab.title, fontFamily = Mono, maxLines = 1) },
            )
        }
    }
}

@Composable
private fun NativeConversation(events: List<AgentEvent>, modifier: Modifier) {
    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    LaunchedEffect(events.size) { if (events.isNotEmpty()) listState.animateScrollToItem(events.lastIndex) }
    if (events.isEmpty()) {
        Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Eyebrow("Listening for activity")
        }
        return
    }
    LazyColumn(
        state = listState,
        modifier = modifier.fillMaxWidth().padding(horizontal = Space.md),
        contentPadding = PaddingValues(bottom = Space.md),
        verticalArrangement = Arrangement.spacedBy(Space.sm),
    ) {
        items(events, key = { "${it.ts}-${it.kind}-${it.summary.hashCode()}" }) { event ->
            ActivityRow(event)
        }
    }
}

/**
 * One line of agent activity. The kind is carried by a coloured rule down the
 * left edge instead of a coloured bubble, so a long run of tool calls reads as
 * a single stream rather than a wall of tinted boxes.
 */
@Composable
private fun ActivityRow(event: AgentEvent) {
    val cs = MaterialTheme.colorScheme
    val accent = when (event.kind) {
        "tool_call" -> status.info
        "diff" -> status.ok
        "question", "awaiting_approval" -> status.signal
        "error" -> status.fault
        else -> cs.outline
    }
    val machineWritten = event.kind == "tool_call" || event.kind == "diff"
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.small,
        color = cs.surface,
        border = BorderStroke(1.dp, cs.outlineVariant),
    ) {
        Row(Modifier.height(IntrinsicSize.Min)) {
            Box(Modifier.width(2.dp).fillMaxHeight().background(accent))
            Column(Modifier.padding(Space.md)) {
                Eyebrow(event.kind.replace('_', ' '), color = accent)
                Spacer(Modifier.height(Space.xs + 2.dp))
                Text(
                    event.summary,
                    style = if (machineWritten) MonoSmall else MaterialTheme.typography.bodyMedium,
                    color = cs.onSurface,
                    maxLines = 12,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

private fun agentLabel(events: List<AgentEvent>, tabId: String): String = when (
    events.lastOrNull { it.tab == tabId }?.agentId
) {
    "claude-code" -> "Claude Code"
    "codex-cli" -> "Codex CLI"
    else -> "Agent"
}
