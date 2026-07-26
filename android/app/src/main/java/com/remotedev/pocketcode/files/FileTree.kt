package com.remotedev.pocketcode.files

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.ui.text.TextStyle
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.FolderOpen
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.remotedev.pocketcode.ui.components.EmptyState
import com.remotedev.pocketcode.ui.theme.MonoSmall
import com.remotedev.pocketcode.ui.theme.Space
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.Serializable

@Serializable
data class FsNode(val name: String, val path: String, val type: String, val size: Long = 0, val children: List<FsNode> = emptyList())

@Composable
fun FileTreeScreen(
    root: StateFlow<List<FsNode>>,
    connected: Boolean = true,
    onRefresh: () -> Unit = {},
    onOpen: (FsNode) -> Unit,
) {
    val nodes by root.collectAsState()
    if (nodes.isEmpty()) {
        // An empty LazyColumn is indistinguishable from a crash. Say which of
        // the two situations this is instead of showing a blank pane.
        EmptyFileTree(connected = connected, onRefresh = onRefresh)
        return
    }
    LazyColumn { items(nodes) { n -> NodeRow(n, onOpen, depth = 0) } }
}

@Composable
private fun EmptyFileTree(connected: Boolean, onRefresh: () -> Unit) {
    if (connected) {
        EmptyState(
            icon = Icons.Outlined.FolderOpen,
            title = "No files loaded",
            body = "The workspace tree has not arrived from your editor yet.",
            actionLabel = "Load files",
            onAction = onRefresh,
        )
    } else {
        EmptyState(
            icon = Icons.Outlined.CloudOff,
            title = "Not connected",
            body = "Connect to a machine to browse its workspace.",
        )
    }
}

private fun humanSize(bytes: Long): String = when {
    bytes < 1024 -> "$bytes B"
    bytes < 1024 * 1024 -> "${bytes / 1024} KB"
    else -> "${bytes / (1024 * 1024)} MB"
}

@Composable
private fun NodeRow(node: FsNode, onOpen: (FsNode) -> Unit, depth: Int) {
    var open by remember { mutableStateOf(false) }
    val cs = MaterialTheme.colorScheme
    val isDir = node.type == "dir"
    Row(
        Modifier
            .fillMaxWidth()
            .clickable { if (isDir) open = !open else onOpen(node) }
            .padding(start = Space.lg + (depth * 14).dp, end = Space.lg, top = Space.sm, bottom = Space.sm),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            when {
                isDir && open -> Icons.Outlined.FolderOpen
                isDir -> Icons.Outlined.Folder
                else -> Icons.Outlined.Description
            },
            contentDescription = null,
            tint = if (isDir) cs.primary else cs.onSurfaceVariant,
            modifier = Modifier.size(17.dp),
        )
        Spacer(Modifier.width(Space.md))
        Text(
            node.name,
            style = MaterialTheme.typography.bodyMedium,
            color = cs.onSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        if (!isDir) {
            Text(humanSize(node.size), style = MonoSmall, color = cs.onSurfaceVariant)
        }
    }
    if (open && node.children.isNotEmpty()) {
        node.children.forEach { NodeRow(it, onOpen, depth + 1) }
    }
}

// ponytail: in-app code view is a read-only BasicTextField with monospace + line numbers.
// Edit goes through the VS Code extension. Add syntax highlight when needed.
@Composable
fun CodeViewerStub(path: String, content: String) {
    val lines = remember(content) { content.split('\n') }
    val codeStyle = TextStyle(
        fontFamily = FontFamily.Monospace,
        fontSize = 13.sp,
        color = MaterialTheme.colorScheme.onSurface,
    )
    val lineNumStyle = TextStyle(
        fontFamily = FontFamily.Monospace,
        fontSize = 13.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        fontWeight = FontWeight.Light,
    )
    val hScroll = rememberScrollState()
    val vScroll = rememberScrollState()
    val lineNumBg = MaterialTheme.colorScheme.surfaceVariant

    // ponytail: single vertical scroll wraps both line numbers and code so they
    // stay in lockstep. Horizontal scroll wraps the row so wide lines scroll
    // together with their line numbers.
    Column(Modifier.fillMaxSize()) {
        Surface(tonalElevation = 2.dp) {
            Text(
                path,
                style = MaterialTheme.typography.labelMedium,
                modifier = Modifier.fillMaxWidth().padding(8.dp),
            )
        }
        Box(Modifier.fillMaxSize().verticalScroll(vScroll).horizontalScroll(hScroll)) {
            Row(Modifier.fillMaxSize()) {
                Column(Modifier.background(lineNumBg)) {
                    lines.forEachIndexed { i, _ ->
                        Text(
                            "${i + 1}",
                            style = lineNumStyle,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }
                BasicTextField(
                    value = content,
                    onValueChange = {},
                    readOnly = true,
                    textStyle = codeStyle,
                    modifier = Modifier.padding(8.dp),
                )
            }
        }
    }
}
