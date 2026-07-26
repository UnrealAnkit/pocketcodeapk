package com.remotedev.pocketcode

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.remotedev.pocketcode.ui.Root
import com.remotedev.pocketcode.ui.components.Eyebrow
import com.remotedev.pocketcode.ui.theme.PocketCodeTheme
import com.remotedev.pocketcode.ui.theme.Space

class MainActivity : FragmentActivity() {
    private val openDiffFor = mutableStateOf<String?>(null)
    private val isAuthorized = mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleIntent(intent)
        checkBiometricsAndPrompt()
        setContent { App(isAuthorized.value, openDiffFor.value) { openDiffFor.value = it } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        intent?.getStringExtra("openDiffFor")?.let { openDiffFor.value = it }
    }

    private fun checkBiometricsAndPrompt() {
        val manager = BiometricManager.from(this)
        val authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL
        when (manager.canAuthenticate(authenticators)) {
            BiometricManager.BIOMETRIC_SUCCESS -> showBiometricPrompt(authenticators)
            else -> isAuthorized.value = true
        }
    }

    private fun showBiometricPrompt(authenticators: Int) {
        val executor = ContextCompat.getMainExecutor(this)
        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                super.onAuthenticationError(errorCode, errString)
                Toast.makeText(applicationContext, "Authentication error: $errString", Toast.LENGTH_SHORT).show()
                finish()
            }
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                super.onAuthenticationSucceeded(result)
                isAuthorized.value = true
            }
        }
        val prompt = BiometricPrompt(this, executor, callback)
        val info = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Unlock PocketCode")
            .setSubtitle("Authenticate to access your remote development machine")
            .setAllowedAuthenticators(authenticators)
            .build()
        prompt.authenticate(info)
    }
}

@Composable
fun App(isAuthorized: Boolean, openDiffFor: String?, clearOpenDiffFor: (String?) -> Unit) {
    PocketCodeTheme {
        Surface {
            if (isAuthorized) {
                Root(openDiffFor, clearOpenDiffFor)
            } else {
                LockScreen()
            }
        }
    }
}

/**
 * First thing anyone sees, and previously the words "Authorization Required" on
 * a black field. It is the wordmark's only full-bleed appearance, so it does the
 * branding the top bar no longer has room for.
 */
@Composable
fun LockScreen() {
    val cs = MaterialTheme.colorScheme
    Box(Modifier.fillMaxSize().padding(Space.xxl), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Icon(
                Icons.Outlined.Lock,
                contentDescription = null,
                tint = cs.primary,
                modifier = Modifier.size(28.dp),
            )
            Text(
                "PocketCode",
                style = MaterialTheme.typography.displaySmall,
                color = cs.onBackground,
                modifier = Modifier.padding(top = Space.lg),
            )
            Text(
                "Unlock to reach your machine.",
                style = MaterialTheme.typography.bodyMedium,
                color = cs.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = Space.sm),
            )
            Eyebrow("Locked", Modifier.padding(top = Space.xxl), color = cs.primary)
        }
    }
}
