package com.focusguard.ai.vpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log
import androidx.core.app.NotificationCompat
import com.focusguard.ai.MainActivity
import kotlinx.coroutines.*
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.ByteBuffer

class FocusVpnService : VpnService() {

    companion object {
        private const val TAG = "FocusVpnService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "focusguard_vpn"

        const val ACTION_START = "com.focusguard.ai.START_VPN"
        const val ACTION_STOP = "com.focusguard.ai.STOP_VPN"
        const val EXTRA_BLOCKED_DOMAINS = "blocked_domains"
        const val EXTRA_EVENT_NAME = "event_name"
    }

    private var vpnInterface: ParcelFileDescriptor? = null
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var currentEventName = "Focus Session"

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopVpn()
                return START_NOT_STICKY
            }
            ACTION_START -> {
                val blockedDomains = intent.getStringArrayListExtra(EXTRA_BLOCKED_DOMAINS) ?: arrayListOf()
                val eventName = intent.getStringExtra(EXTRA_EVENT_NAME) ?: "Focus Session"
                startVpn(blockedDomains, eventName)
            }
        }
        return START_STICKY
    }

    fun startVpn(blockedDomains: List<String>, eventName: String) {
        currentEventName = eventName

        BlocklistManager.updateFromSession(
            blockedDomains,
            listOf("gmail.com", "google.com", "meet.google.com", "whatsapp.com")
        )

        val builder = Builder()
        builder.setSession("FocusGuard AI")
        builder.addAddress("10.0.0.2", 24)
        builder.addRoute("0.0.0.0", 0)
        builder.addDnsServer("8.8.8.8")
        builder.setMtu(1500)

        vpnInterface = builder.establish()

        if (vpnInterface == null) {
            Log.e(TAG, "Failed to establish VPN interface")
            return
        }

        getSharedPreferences("focusguard", MODE_PRIVATE)
            .edit()
            .putBoolean("vpn_active", true)
            .apply()

        startForeground(NOTIFICATION_ID, buildNotification("FocusGuard Active — $eventName"))

        serviceScope.launch {
            runPacketLoop()
        }

        Log.i(TAG, "VPN started for event: $eventName")
    }

    private suspend fun runPacketLoop() {
        val fd = vpnInterface ?: return
        val inputStream = FileInputStream(fd.fileDescriptor)
        val outputStream = FileOutputStream(fd.fileDescriptor)
        val packet = ByteArray(32767)
        val buffer = ByteBuffer.wrap(packet)

        while (isActive) {
            try {
                val length = withContext(Dispatchers.IO) {
                    inputStream.read(packet)
                }
                if (length <= 0) continue

                buffer.limit(length)
                buffer.rewind()

                if (DnsPacketParser.isDnsQuery(packet, length)) {
                    val domain = DnsPacketParser.extractDomain(packet, length)
                    if (domain != null) {
                        if (BlocklistManager.isBlocked(domain)) {
                            Log.d(TAG, "Blocked DNS query: $domain")
                            val response = DnsPacketParser.buildBlockedResponse(packet, length)
                            withContext(Dispatchers.IO) {
                                outputStream.write(response)
                            }
                        } else {
                            withContext(Dispatchers.IO) {
                                outputStream.write(packet, 0, length)
                            }
                        }
                    } else {
                        withContext(Dispatchers.IO) {
                            outputStream.write(packet, 0, length)
                        }
                    }
                } else {
                    withContext(Dispatchers.IO) {
                        outputStream.write(packet, 0, length)
                    }
                }
            } catch (e: Exception) {
                if (isActive) {
                    Log.e(TAG, "Packet loop error", e)
                }
            }
        }
    }

    fun stopVpn() {
        serviceScope.cancel()
        vpnInterface?.close()
        vpnInterface = null

        getSharedPreferences("focusguard", MODE_PRIVATE)
            .edit()
            .putBoolean("vpn_active", false)
            .apply()

        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()

        Log.i(TAG, "VPN stopped")
    }

    override fun onDestroy() {
        stopVpn()
        super.onDestroy()
    }

    private fun buildNotification(message: String): Notification {
        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager

        val channel = NotificationChannel(
            CHANNEL_ID,
            "FocusGuard VPN",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "FocusGuard VPN status notifications"
        }
        notificationManager.createNotificationChannel(channel)

        val stopIntent = Intent(this, FocusVpnService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val mainIntent = Intent(this, MainActivity::class.java)
        val mainPendingIntent = PendingIntent.getActivity(
            this, 0, mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("FocusGuard AI")
            .setContentText(message)
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentIntent(mainPendingIntent)
            .addAction(android.R.drawable.ic_delete, "Stop", stopPendingIntent)
            .setOngoing(true)
            .build()
    }
}
