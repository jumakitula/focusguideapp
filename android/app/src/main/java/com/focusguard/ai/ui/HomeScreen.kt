package com.focusguard.ai.ui

import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.focusguard.ai.api.ActiveSession
import com.focusguard.ai.api.FocusApiClient
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    userEmail: String,
    onChangeEmail: () -> Unit,
    onCheckNow: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var activeSession by remember { mutableStateOf<ActiveSession?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var blockedSites by remember { mutableStateOf(listOf<String>()) }

    val primaryGreen = Color(0xFF22C55E)
    val background = Color(0xFF0F172A)
    val surface = Color(0xFF1E293B)
    val textPrimary = Color(0xFFE2E8F0)
    val textSecondary = Color(0xFF94A3B8)

    suspend fun refresh() {
        isLoading = true
        try {
            val session = FocusApiClient.getActiveSession(userEmail)
            activeSession = session
            blockedSites = session?.blockedSites ?: emptyList()
        } catch (e: Exception) {
            // ignore
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(userEmail) {
        refresh()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "FocusGuard AI",
                        color = textPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp
                    )
                },
                actions = {
                    IconButton(onClick = { scope.launch { refresh() } }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = textPrimary)
                    }
                    IconButton(onClick = onChangeEmail) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings", tint = textPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = background)
            )
        },
        containerColor = background
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            // Main status card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = surface)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    if (activeSession != null) {
                        ActiveSessionContent(
                            session = activeSession!!,
                            primaryGreen = primaryGreen,
                            textPrimary = textPrimary,
                            textSecondary = textSecondary
                        )
                    } else {
                        StandbyContent(
                            textPrimary = textPrimary,
                            textSecondary = textSecondary
                        )
                    }
                }
            }

            // Check Now button
            Button(
                onClick = {
                    onCheckNow()
                    scope.launch { delay(2000); refresh() }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isLoading,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (activeSession != null) primaryGreen else Color(0xFF334155)
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        color = textPrimary,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Check Now", color = textPrimary, fontWeight = FontWeight.SemiBold)
                }
            }

            // Blocked sites section
            if (blockedSites.isNotEmpty()) {
                Text(
                    "Currently Blocked",
                    color = textSecondary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(blockedSites) { site ->
                        SuggestionChip(
                            onClick = {},
                            label = { Text(site, color = textPrimary, fontSize = 12.sp) },
                            colors = SuggestionChipDefaults.suggestionChipColors(
                                containerColor = Color(0xFF334155)
                            ),
                            border = null
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // User info
            TextButton(onClick = onChangeEmail) {
                Text(
                    "Connected as: $userEmail — tap to change",
                    color = textSecondary,
                    fontSize = 12.sp
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
fun ActiveSessionContent(
    session: ActiveSession,
    primaryGreen: Color,
    textPrimary: Color,
    textSecondary: Color
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(900, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )

    var countdown by remember { mutableStateOf("") }

    LaunchedEffect(session.endTime) {
        while (true) {
            val endInstant = try {
                Instant.parse(session.endTime)
            } catch (e: Exception) {
                break
            }
            val now = Instant.now()
            val minutes = ChronoUnit.MINUTES.between(now, endInstant)
            val seconds = ChronoUnit.SECONDS.between(now, endInstant) % 60
            countdown = if (minutes > 0) "${minutes}m ${seconds}s remaining" else "${seconds}s remaining"
            delay(1000)
        }
    }

    Box(
        modifier = Modifier
            .size(12.dp)
            .clip(CircleShape)
            .background(primaryGreen.copy(alpha = alpha))
            .align(Alignment.CenterHorizontally)
    )

    Spacer(modifier = Modifier.height(12.dp))

    Text(
        "FOCUS MODE ACTIVE",
        color = primaryGreen,
        fontSize = 13.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 2.sp
    )

    Spacer(modifier = Modifier.height(8.dp))

    Text(
        session.eventTitle,
        color = textPrimary,
        fontSize = 20.sp,
        fontWeight = FontWeight.Bold
    )

    if (countdown.isNotEmpty()) {
        Spacer(modifier = Modifier.height(4.dp))
        Text(countdown, color = primaryGreen, fontSize = 14.sp)
    }

    session.aiReason?.let { reason ->
        Spacer(modifier = Modifier.height(8.dp))
        Text(reason, color = textSecondary, fontSize = 13.sp, lineHeight = 18.sp)
    }

    Spacer(modifier = Modifier.height(8.dp))

    val intensityColor = when (session.focusIntensity.lowercase()) {
        "critical" -> Color(0xFFEF4444)
        "high" -> Color(0xFFF97316)
        "medium" -> Color(0xFFEAB308)
        else -> primaryGreen
    }

    Surface(
        shape = RoundedCornerShape(6.dp),
        color = intensityColor.copy(alpha = 0.15f)
    ) {
        Text(
            session.focusIntensity.uppercase(),
            color = intensityColor,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp
        )
    }
}

@Composable
fun StandbyContent(textPrimary: Color, textSecondary: Color) {
    Box(
        modifier = Modifier
            .size(12.dp)
            .clip(CircleShape)
            .background(Color(0xFF475569))
            .align(Alignment.CenterHorizontally)
    )

    Spacer(modifier = Modifier.height(12.dp))

    Text(
        "STANDBY",
        color = Color(0xFF475569),
        fontSize = 13.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 2.sp
    )

    Spacer(modifier = Modifier.height(8.dp))

    Text(
        "No Active Focus Session",
        color = textPrimary,
        fontSize = 20.sp,
        fontWeight = FontWeight.Bold
    )

    Spacer(modifier = Modifier.height(4.dp))

    Text(
        "VPN is standing by. Hit Check Now to sync.",
        color = textSecondary,
        fontSize = 13.sp
    )
}
