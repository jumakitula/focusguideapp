package com.focusguard.ai

import android.content.Context
import android.content.Intent
import androidx.work.*
import com.focusguard.ai.api.FocusApiClient
import com.focusguard.ai.vpn.BlocklistManager
import com.focusguard.ai.vpn.FocusVpnService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

class SessionCheckWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val prefs = applicationContext.getSharedPreferences("focusguard", Context.MODE_PRIVATE)
        val userEmail = prefs.getString("user_email", "") ?: ""

        if (userEmail.isEmpty()) {
            return@withContext Result.success()
        }

        val vpnActive = prefs.getBoolean("vpn_active", false)
        val activeSession = FocusApiClient.getActiveSession(userEmail)

        if (activeSession != null && activeSession.isActive && !vpnActive) {
            // Session is active and VPN is not running — start it
            BlocklistManager.updateFromSession(
                activeSession.blockedSites,
                activeSession.emergencySites
            )

            val startIntent = Intent(applicationContext, FocusVpnService::class.java).apply {
                action = FocusVpnService.ACTION_START
                putStringArrayListExtra(
                    FocusVpnService.EXTRA_BLOCKED_DOMAINS,
                    ArrayList(activeSession.blockedSites)
                )
                putExtra(FocusVpnService.EXTRA_EVENT_NAME, activeSession.eventTitle)
            }
            applicationContext.startForegroundService(startIntent)

            prefs.edit()
                .putString("current_session_id", activeSession.sessionId)
                .apply()

        } else if (activeSession == null && vpnActive) {
            // No active session but VPN is running — stop it
            val stopIntent = Intent(applicationContext, FocusVpnService::class.java).apply {
                action = FocusVpnService.ACTION_STOP
            }
            applicationContext.startService(stopIntent)

            prefs.edit()
                .remove("current_session_id")
                .apply()
        }

        Result.success()
    }

    companion object {
        private const val WORK_TAG = "focus_session_check"

        /**
         * Schedule a repeating work request to run every 15 minutes (WorkManager minimum).
         */
        fun scheduleRepeating(context: Context) {
            val request = PeriodicWorkRequestBuilder<SessionCheckWorker>(
                15, TimeUnit.MINUTES
            )
                .addTag(WORK_TAG)
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_TAG,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
        }

        /**
         * Run an immediate one-time check now (e.g. on demand from the UI).
         */
        fun scheduleOneTime(context: Context) {
            val request = OneTimeWorkRequestBuilder<SessionCheckWorker>()
                .addTag("${WORK_TAG}_onetime")
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .build()

            WorkManager.getInstance(context).enqueue(request)
        }
    }
}
