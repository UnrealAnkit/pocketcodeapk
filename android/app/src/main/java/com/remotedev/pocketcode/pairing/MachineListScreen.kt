package com.remotedev.pocketcode.pairing

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.remotedev.pocketcode.ui.components.EmptyState
import com.remotedev.pocketcode.ui.components.Eyebrow
import com.remotedev.pocketcode.ui.components.PanelCard
import com.remotedev.pocketcode.ui.components.StatusLamp
import com.remotedev.pocketcode.ui.theme.MonoSmall
import com.remotedev.pocketcode.ui.theme.Space

@Composable
fun MachineListScreen(
    machines: List<PairedMachine>,
    onPick: (PairedMachine) -> Unit,
    onRemove: (PairedMachine) -> Unit = {},
    onScanNew: () -> Unit = {},
) {
    if (machines.isEmpty()) {
        EmptyState(
            icon = Icons.Outlined.QrCodeScanner,
            title = "No machines paired",
            body = "Run “Start Mobile Session” in your editor, then scan the QR code it shows.",
            actionLabel = "Scan QR code",
            onAction = onScanNew,
        )
        return
    }
    val cs = MaterialTheme.colorScheme
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(Space.md),
        verticalArrangement = Arrangement.spacedBy(Space.sm),
    ) {
        items(machines, key = { it.id }) { m ->
            PanelCard(onClick = { onPick(m) }) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    StatusLamp(cs.outline, size = 7.dp)
                    Spacer(Modifier.width(Space.md))
                    Column(Modifier.weight(1f)) {
                        Text(m.name, style = MaterialTheme.typography.titleMedium, color = cs.onSurface)
                        Spacer(Modifier.height(2.dp))
                        Text(
                            m.url,
                            style = MonoSmall,
                            color = cs.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Eyebrow(
                            "fp ${m.fingerprint.take(12)}",
                            Modifier.padding(top = Space.xs),
                        )
                    }
                    IconButton(onClick = { onRemove(m) }) {
                        Icon(
                            Icons.Outlined.Close,
                            contentDescription = "Forget ${m.name}",
                            tint = cs.onSurfaceVariant,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }
            }
        }
        item {
            OutlinedButton(
                onClick = onScanNew,
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.small,
                border = BorderStroke(1.dp, cs.outline),
            ) {
                Icon(Icons.Outlined.Add, contentDescription = null, modifier = Modifier.size(17.dp))
                Spacer(Modifier.width(Space.sm))
                Text("Pair a new machine", style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}
