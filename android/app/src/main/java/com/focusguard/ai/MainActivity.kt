package com.focusguard.ai

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.focusguard.ai.ui.HomeScreen
import com.focusguard.ai.ui.PermissionScreen
import com.focusguard.ai.ui.theme.FocusGuardTheme

class MainActivity : ComponentActivity() {

    private var vpnPermissionGranted by mutableStateOf(false)
    private var userEmail by mutableStateOf("")
    private var showEmailDialog by mutableStateOf(false)

    private val vpnPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            vpnPermissionGranted = true
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Load saved email
        val prefs = getSharedPreferences("focusguard", MODE_PRIVATE)
        val savedEmail = prefs.getString("user_email", "") ?: ""
        userEmail = savedEmail

        if (savedEmail.isEmpty()) {
            showEmailDialog = true
        }

        // Check VPN permission
        val vpnIntent = VpnService.prepare(this)
        vpnPermissionGranted = vpnIntent == null

        // Schedule background session checker
        SessionCheckWorker.scheduleRepeating(this)

        setContent {
            FocusGuardTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    if (showEmailDialog) {
                        EmailSetupDialog(
                            onEmailSet = { email ->
                                userEmail = email
                                prefs.edit().putString("user_email", email).apply()
                                showEmailDialog = false
                                checkVpnPermission()
                            }
                        )
                    } else if (!vpnPermissionGranted) {
                        PermissionScreen(
                            onRequestPermission = { checkVpnPermission() }
                        )
                    } else {
                        HomeScreen(
                            userEmail = userEmail,
                            onChangeEmail = { showEmailDialog = true },
                            onCheckNow = { SessionCheckWorker.scheduleOneTime(this) }
                        )
                    }
                }
            }
        }
    }

    private fun checkVpnPermission() {
        val vpnIntent = VpnService.prepare(this)
        if (vpnIntent != null) {
            vpnPermissionLauncher.launch(vpnIntent)
        } else {
            vpnPermissionGranted = true
        }
    }
}

@Composable
fun EmailSetupDialog(onEmailSet: (String) -> Unit) {
    var email by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = {},
        title = { Text("Welcome to FocusGuard AI") },
        text = {
            Column {
                Text(
                    "Enter your Google email address. This connects to your calendar to schedule focus sessions.",
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Google Email") },
                    placeholder = { Text("you@gmail.com") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { if (email.isNotBlank()) onEmailSet(email.trim()) },
                enabled = email.isNotBlank()
            ) {
                Text("Continue")
            }
        }
    )
}
