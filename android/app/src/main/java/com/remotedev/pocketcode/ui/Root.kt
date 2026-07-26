package com.remotedev.pocketcode.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.outlined.AccountTree
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Dns
import androidx.compose.material.icons.outlined.Devices
import androidx.compose.material.icons.outlined.FolderOpen
import androidx.compose.material.icons.automirrored.outlined.StickyNote2
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material.icons.outlined.Terminal
import androidx.compose.material.icons.outlined.Workspaces
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.remotedev.pocketcode.ui.components.StatusLamp
import com.remotedev.pocketcode.ui.theme.Space
import com.remotedev.pocketcode.ui.theme.status
import com.remotedev.pocketcode.PocketcodeApp
import com.remotedev.pocketcode.connection.ConnState
import com.remotedev.pocketcode.files.FileTreeScreen
import com.remotedev.pocketcode.git.GitPanelScreen
import com.remotedev.pocketcode.git.PullRequestsScreen
import com.remotedev.pocketcode.devservers.DevServersScreen
import com.remotedev.pocketcode.pairing.PairingQR
import com.remotedev.pocketcode.pairing.QrParser
import com.remotedev.pocketcode.pairing.QrScannerScreen
import com.remotedev.pocketcode.notes.NotesScreen
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay

// Screens are addressed by name rather than by bare index. The two used to be
// kept in sync by hand, and the "Machines" action opened the QR scanner because
// of an off-by-one against the `when (tab)` block below.
private object Screen {
    const val FILES = 0
    const val TERMINAL = 1
    const val GIT = 2
    const val AGENT = 3
    const val NOTES = 4
    const val PAIR = 5
    const val MACHINES = 6
    const val SERVERS = 7
}

private data class NavItem(val screen: Int, val icon: ImageVector, val label: String)

// Four primary destinations. Everything else lives in the overflow menu -- six
// bottom-bar entries plus three top-bar text buttons read as an unfinished
// prototype, and the agent surface is the one worth pointing at.
private val NAV_ITEMS = listOf(
    NavItem(Screen.AGENT, Icons.Outlined.AutoAwesome, "Agent"),
    NavItem(Screen.TERMINAL, Icons.Outlined.Terminal, "Terminal"),
    NavItem(Screen.FILES, Icons.Outlined.FolderOpen, "Files"),
    NavItem(Screen.GIT, Icons.Outlined.AccountTree, "Git"),
)

private fun screenTitle(screen: Int): String = when (screen) {
    Screen.FILES -> "Files"
    Screen.TERMINAL -> "Terminal"
    Screen.GIT -> "Git"
    Screen.AGENT -> "Agent"
    Screen.NOTES -> "Notes"
    Screen.PAIR -> "Pair"
    Screen.MACHINES -> "Machines"
    Screen.SERVERS -> "Dev servers"
    else -> "PocketCode"
}

/**
 * Connecting deliberately does *not* use amber. Amber is reserved for "the agent
 * is waiting on you" so that it means exactly one thing anywhere in the app; a
 * connection in progress is a pulsing neutral instead.
 */
@Composable
private fun connColor(state: ConnState): Color = when (state) {
    is ConnState.Connected -> status.ok
    is ConnState.Connecting, is ConnState.Reconnecting -> status.info
    is ConnState.Error -> status.fault
    else -> status.idle
}

/**
 * Whether the phone and the machine are actually talking is the one thing an
 * onlooker needs to read at a glance, so it is a labelled lamp rather than a
 * bare dot -- and it is tappable, because "disconnected" and "how do I
 * reconnect" are the same thought.
 */
@Composable
private fun ConnectionPill(state: ConnState, machineName: String?, onClick: () -> Unit) {
    val color = connColor(state)
    val busy = state is ConnState.Connecting || state is ConnState.Reconnecting
    val label = when (state) {
        is ConnState.Connected -> state.machine
        is ConnState.Connecting -> "Connecting"
        is ConnState.Reconnecting -> "Retry ${state.attempt}"
        is ConnState.Error -> "Error"
        is ConnState.Disconnected -> "Offline"
        ConnState.Idle -> machineName ?: "Not paired"
    }
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        color = color.copy(alpha = 0.12f),
        border = BorderStroke(1.dp, color.copy(alpha = 0.35f)),
    ) {
        Row(
            Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            StatusLamp(color, pulsing = busy, size = 7.dp)
            Spacer(Modifier.width(7.dp))
            Text(
                label,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.widthIn(max = 110.dp),
            )
        }
    }
}

// A floating panel rather than a full-bleed NavigationBar: it keeps the ink
// background visible at the edges, which is what makes the app read as a
// control surface laid over the terminal rather than a stack of grey sheets.
@Composable
private fun FloatingBottomNav(selected: Int, onSelect: (Int) -> Unit) {
    val cs = MaterialTheme.colorScheme
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = Space.md, vertical = Space.md),
        shape = MaterialTheme.shapes.extraLarge,
        color = cs.surface,
        border = BorderStroke(1.dp, cs.outline),
        shadowElevation = 10.dp,
    ) {
        Row(Modifier.padding(Space.xs)) {
            NAV_ITEMS.forEach { item ->
                val isSelected = selected == item.screen
                val fg = if (isSelected) cs.primary else cs.onSurfaceVariant
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clip(MaterialTheme.shapes.large)
                        .background(if (isSelected) cs.primary.copy(alpha = 0.10f) else Color.Transparent)
                        .clickable { onSelect(item.screen) }
                        .padding(vertical = Space.sm),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(item.icon, contentDescription = item.label, tint = fg, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.height(3.dp))
                    Text(
                        item.label,
                        style = MaterialTheme.typography.labelMedium,
                        fontSize = 11.sp,
                        color = fg,
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun Root(openDiffFor: String? = null, clearOpenDiffFor: (String?) -> Unit = {}) {
    val app = PocketcodeApp.instance
    // Open on the agent surface: it is the reason the app exists, and a file
    // tree is a poor first impression.
    var tab by remember { mutableStateOf(Screen.AGENT) }
    var showPasteDialog by remember { mutableStateOf(false) }
    var showWorkspaceDialog by remember { mutableStateOf(false) }
    var showOverflow by remember { mutableStateOf(false) }
    val machines by app.machines.machines.collectAsState()
    val connState by app.connection.state.collectAsState()
    val lastConnectUrl by app.connection.lastConnectUrl.collectAsState()

    val fileTree by app.connection.fileTree.collectAsState()
    val gitStatus by app.connection.gitStatus.collectAsState()
    val gitDiff by app.connection.gitDiff.collectAsState()
    val gitFeedback by app.connection.gitFeedback.collectAsState()
    val gitBranches by app.connection.gitBranches.collectAsState()
    val pullRequests by app.connection.pullRequests.collectAsState()
    val pullRequestDetail by app.connection.pullRequestDetail.collectAsState()
    val pullRequestFeedback by app.connection.pullRequestFeedback.collectAsState()
    val devServers by app.connection.devServers.collectAsState()
    val devServerLogs by app.connection.devServerLogs.collectAsState()
    val agentEvents by app.connection.agentEvents.collectAsState()
    val terminalTabs by app.connection.terminalTabs.collectAsState()
    val notes by app.db.dao().notes().collectAsState(initial = emptyList())
    val costUpdate by app.connection.costFlow.collectAsState()
    var activeTerminalTab by remember { mutableStateOf(0) }
    var showingPullRequests by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val isLandscape = androidx.compose.ui.platform.LocalConfiguration.current.orientation == android.content.res.Configuration.ORIENTATION_LANDSCAPE
    val isImeVisible = WindowInsets.isImeVisible

    fun selectTab(screen: Int) {
        tab = screen
        if (screen == Screen.GIT) app.connection.send("""{"t":"git.status"}""")
    }

    LaunchedEffect(openDiffFor) {
        if (openDiffFor != null) {
            selectTab(Screen.GIT)
            clearOpenDiffFor(null)
        }
    }

    fun pairAndConnect(qr: PairingQR) {
        val machine = app.machines.add(qr)
        app.connection.connect(machine)
        tab = Screen.TERMINAL
    }

    Scaffold(topBar = {
        TopAppBar(
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            title = {
                Column {
                    Text(
                        screenTitle(tab),
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                    // One line of context under the title, which is where the
                    // session cost lives when there is nothing more urgent.
                    val subtitle = when (connState) {
                        is ConnState.Connected -> costUpdate?.let { "~\$${"%.4f".format(it.usd)} this session" } ?: "Connected"
                        is ConnState.Connecting -> "Opening tunnel"
                        is ConnState.Reconnecting -> "Retrying"
                        is ConnState.Error -> {
                            val reason = (connState as ConnState.Error).reason
                            if (lastConnectUrl != null) "$reason · $lastConnectUrl" else reason
                        }
                        is ConnState.Disconnected -> "Tap the status chip to reconnect"
                        ConnState.Idle ->
                            if (machines.isNotEmpty()) "Tap the status chip to connect"
                            else "Scan the QR from your editor"
                    }
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            },
            actions = {
                ConnectionPill(connState, machines.firstOrNull()?.name) { tab = Screen.MACHINES }
                Box {
                    IconButton(onClick = { showOverflow = true }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "More")
                    }
                    DropdownMenu(expanded = showOverflow, onDismissRequest = { showOverflow = false }) {
                        DropdownMenuItem(
                            text = { Text("Machines") },
                            leadingIcon = { Icon(Icons.Outlined.Devices, null) },
                            onClick = { showOverflow = false; tab = Screen.MACHINES },
                        )
                        DropdownMenuItem(
                            text = { Text("Pair a new machine") },
                            leadingIcon = { Icon(Icons.Outlined.QrCodeScanner, null) },
                            onClick = { showOverflow = false; tab = Screen.PAIR },
                        )
                        HorizontalDivider()
                        DropdownMenuItem(
                            text = { Text("Workspaces") },
                            leadingIcon = { Icon(Icons.Outlined.Workspaces, null) },
                            onClick = {
                                showOverflow = false
                                app.connection.send("""{"t":"workspace.list"}""")
                                showWorkspaceDialog = true
                            },
                        )
                        DropdownMenuItem(
                            text = { Text("Dev servers") },
                            leadingIcon = { Icon(Icons.Outlined.Dns, null) },
                            onClick = { showOverflow = false; tab = Screen.SERVERS },
                        )
                        DropdownMenuItem(
                            text = { Text("Notes") },
                            leadingIcon = { Icon(Icons.AutoMirrored.Outlined.StickyNote2, null) },
                            onClick = { showOverflow = false; tab = Screen.NOTES },
                        )
                    }
                }
            },
        )
    }, bottomBar = {
        // The keyboard covers the floating navigation. Do not reserve that
        // bar's height as empty space above the IME while entering a command.
        if (!isLandscape && !isImeVisible) {
            FloatingBottomNav(selected = tab, onSelect = ::selectTab)
        }
    }) { padding ->
        Row(Modifier.padding(padding).fillMaxSize()) {
            if (isLandscape) {
                // Matched to the portrait nav rather than left as a stock rail,
                // which rendered in a different grey with a different indicator.
                NavigationRail(
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
                ) {
                    NAV_ITEMS.forEach { item ->
                        NavigationRailItem(
                            selected = tab == item.screen,
                            onClick = { selectTab(item.screen) },
                            label = { Text(item.label, style = MaterialTheme.typography.labelMedium) },
                            icon = { Icon(item.icon, contentDescription = item.label, modifier = Modifier.size(20.dp)) },
                            colors = NavigationRailItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.10f),
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            ),
                        )
                    }
                }
            }
            Box(Modifier.weight(1f).fillMaxHeight()) {
                when (tab) {
                    Screen.FILES -> {
                    // ponytail: pass the upstream StateFlow directly -- wrapping it in
                    // remember(fileTree) { MutableStateFlow(fileTree) } recreates the flow
                    // on every state change and FileTreeScreen never re-receives updates.
                    FileTreeScreen(
                        root = app.connection.fileTree,
                        connected = connState is ConnState.Connected,
                        onRefresh = { app.connection.send("""{"t":"fs.tree"}""") },
                    ) { node ->
                        app.connection.send("""{"t":"fs.read","path":"${node.path}"}""")
                    }
                }
                    Screen.TERMINAL -> com.remotedev.pocketcode.terminal.TerminalScreen(
                        tabs = terminalTabs,
                        activeTab = activeTerminalTab,
                        onActiveTabChange = { activeTerminalTab = it },
                        onAddTab = { app.connection.send("""{"t":"term.open"}""") },
                        onCloseTab = { tabId ->
                            app.connection.send("""{"t":"term.close","tab":"$tabId"}""")
                            if (terminalTabs.getOrNull(activeTerminalTab)?.id == tabId) activeTerminalTab = 0
                        },
                        onInput = { data ->
                            val curTab = terminalTabs.getOrNull(activeTerminalTab)
                            if (curTab != null) {
                                app.connection.send("""{"t":"term.input","tab":"${curTab.id}","data":${jsonStr(data)}}""")
                            }
                        },
                        onResize = { tabId, cols, rows ->
                            app.connection.send("""{"t":"term.resize","tab":"$tabId","cols":$cols,"rows":$rows}""")
                        }
                    )
                    Screen.GIT -> if (showingPullRequests) PullRequestsScreen(
                        prs = pullRequests,
                        detail = pullRequestDetail,
                        feedback = pullRequestFeedback,
                        onRefresh = { app.connection.send("""{"t":"github.prs"}""") },
                        onOpen = { number -> app.connection.send("""{"t":"github.pr","number":$number}""") },
                        onBack = { showingPullRequests = false; app.connection.pullRequestDetail.value = null },
                        onMerge = { number -> app.connection.send("""{"t":"github.pr.merge","number":$number,"method":"squash"}""") },
                        onClose = { number -> app.connection.send("""{"t":"github.pr.close","number":$number}""") },
                    ) else GitPanelScreen(
                        status = gitStatus,
                        diffText = gitDiff,
                        feedback = gitFeedback,
                        branches = gitBranches,
                        onRequestDiff = { path, staged ->
                            app.connection.send("""{"t":"git.diff","path":${jsonStr(path)},"staged":$staged}""")
                        },
                        onClearDiff = { app.connection.gitDiff.value = "" },
                        onStage = { paths ->
                            val pathsJson = paths.joinToString(",") { jsonStr(it) }
                            app.connection.send("""{"t":"git.stage","paths":[$pathsJson]}""")
                        },
                        onUnstage = { paths ->
                            val pathsJson = paths.joinToString(",") { jsonStr(it) }
                            app.connection.send("""{"t":"git.unstage","paths":[$pathsJson]}""")
                        },
                        onCommit = { msg -> app.connection.send("""{"t":"git.commit","message":${jsonStr(msg)}}""") },
                        onPush = { app.connection.send("""{"t":"git.push"}""") },
                        onRequestBranches = { app.connection.send("""{"t":"git.branches"}""") },
                        onSwitchBranch = { name, create ->
                            app.connection.send("""{"t":"git.checkout","name":${jsonStr(name)},"create":$create}""")
                        },
                        onShowPullRequests = {
                            showingPullRequests = true
                            app.connection.send("""{"t":"github.prs"}""")
                        },
                    )
                    Screen.AGENT -> com.remotedev.pocketcode.agent.AgentChatScreen(
                        events = agentEvents,
                        tabs = terminalTabs,
                        onApprove = { tabId -> app.connection.respondToApproval(tabId, approve = true) },
                        onReject = { tabId -> app.connection.respondToApproval(tabId, approve = false) },
                        onInput = { tabId, data ->
                            app.connection.send("""{"t":"term.input","tab":"$tabId","data":${jsonStr(data)}}""")
                        },
                        onResize = { tabId, cols, rows ->
                            app.connection.send("""{"t":"term.resize","tab":"$tabId","cols":$cols,"rows":$rows}""")
                        },
                    )
                    Screen.NOTES -> NotesScreen(
                        notes = notes,
                        canSend = terminalTabs.getOrNull(activeTerminalTab)?.alive == true,
                        onSave = { id, content -> scope.launch {
                            if (id == null) app.db.dao().addNote(com.remotedev.pocketcode.persistence.Note(content = content, updatedAt = System.currentTimeMillis()))
                            else app.db.dao().updateNote(id, content, System.currentTimeMillis())
                        } },
                        onDelete = { id -> scope.launch { app.db.dao().deleteNote(id) } },
                        onSend = { content ->
                            terminalTabs.getOrNull(activeTerminalTab)?.let { target ->
                                val tabId = target.id
                                // Submit separately from the paste. Claude Code's TUI may
                                // absorb an Enter that shares the pasted input frame, whereas
                                // a subsequent carriage-return is handled as its real Enter key.
                                app.connection.send("""{"t":"term.input","tab":"$tabId","data":${jsonStr(content)}}""")
                                scope.launch {
                                    delay(150)
                                    app.connection.send("""{"t":"term.input","tab":"$tabId","data":${jsonStr("\r")}}""")
                                }
                                when {
                                    target.raw.contains("Claude Code", ignoreCase = true) -> "Claude Code (${target.title})"
                                    target.raw.contains("OpenAI Codex", ignoreCase = true) -> "Codex CLI (${target.title})"
                                    else -> "terminal ${target.title}"
                                }
                            }
                        },
                    )
                    Screen.PAIR -> QrScannerScreen(
                        onPaired = { qr -> pairAndConnect(qr) },
                        onManual = { showPasteDialog = true },
                    )
                    Screen.MACHINES -> com.remotedev.pocketcode.pairing.MachineListScreen(
                        machines,
                        onPick = { app.connection.connect(it) },
                        onRemove = { app.machines.remove(it.id) },
                        onScanNew = { tab = Screen.PAIR },
                    )
                    Screen.SERVERS -> DevServersScreen(
                        servers = devServers,
                        logs = devServerLogs,
                        onRefresh = { app.connection.send("""{"t":"devservers"}""") },
                        onStart = { command -> app.connection.send("""{"t":"devserver.start","cmd":${jsonStr(command)}}""") },
                        onFollow = { port -> app.connection.send("""{"t":"devserver.log","port":$port,"follow":true}""") },
                        onStop = { pid -> app.connection.send("""{"t":"devserver.stop","pid":$pid}""") },
                    )
                }
            }
        }
    }

    val openFile by app.connection.openFile.collectAsState()
    openFile?.let { (path, content) ->
        com.remotedev.pocketcode.files.FileEditorScreen(
            path = path,
            content = content,
            onSave = { updated ->
                app.connection.send("""{"t":"fs.write","path":${jsonStr(path)},"content":${jsonStr(updated)}}""")
                app.connection.openFile.value = null
            },
            onClose = { app.connection.openFile.value = null },
        )
    }

    if (showPasteDialog) {
        PasteQrDialog(
            onDismiss = { showPasteDialog = false },
            onSubmit = { raw ->
                QrParser.parse(raw)?.let { pairAndConnect(it) }
                showPasteDialog = false
            },
        )
    }

    if (showWorkspaceDialog) {
        val workspaces by app.connection.workspaces.collectAsState()
        AlertDialog(
            onDismissRequest = { showWorkspaceDialog = false },
            title = { Text("Switch Workspace") },
            text = {
                LazyColumn {
                    items(workspaces) { (name, uri) ->
                        Row(Modifier.fillMaxWidth().clickable {
                            app.connection.send("""{"t":"workspace.switch","folderUri":${jsonStr(uri)}}""")
                            showWorkspaceDialog = false
                        }.padding(12.dp)) {
                            Text(name, style = MaterialTheme.typography.bodyLarge)
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showWorkspaceDialog = false }) { Text("Cancel") }
            }
        )
    }
}

@Composable
private fun PasteQrDialog(onDismiss: () -> Unit, onSubmit: (String) -> Unit) {
    var text by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Paste pairing string") },
        text = {
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Pairing JSON") },
                supportingText = { Text("From the PocketCode panel in your editor") },
            )
        },
        confirmButton = {
            TextButton(onClick = { onSubmit(text) }, enabled = text.isNotBlank()) { Text("Pair") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

private fun jsonStr(s: String): String {
    val sb = StringBuilder(s.length + 2)
    sb.append('"')
    for (c in s) {
        when (c) {
            '\\' -> sb.append("\\\\")
            '"' -> sb.append("\\\"")
            '\n' -> sb.append("\\n")
            '\r' -> sb.append("\\r")
            '\t' -> sb.append("\\t")
            '\b' -> sb.append("\\b")
            '' -> sb.append("\\f")
            else -> if (c.code < 0x20) sb.append(String.format("\\u%04x", c.code)) else sb.append(c)
        }
    }
    sb.append('"')
    return sb.toString()
}
