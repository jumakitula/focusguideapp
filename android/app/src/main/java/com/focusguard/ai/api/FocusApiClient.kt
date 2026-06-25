package com.focusguard.ai.api

import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

object FocusApiClient {

    // Change this to your deployed URL for production builds:
    // e.g. "https://your-app.replit.app/api"
    // For emulator testing, use "http://10.0.2.2:8000/api"
    // For a device on the same WiFi, use your machine's LAN IP: "http://192.168.x.x:8000/api"
    const val BASE_URL = BuildConfig.API_BASE_URL

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    /**
     * Fetches the currently active focus session for the user.
     * Returns null if there is no active session or on any error.
     */
    suspend fun getActiveSession(userEmail: String): ActiveSession? = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$BASE_URL/focus/active/$userEmail")
                .get()
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful || response.code == 404) return@withContext null

            val body = response.body?.string() ?: return@withContext null
            gson.fromJson(body, ActiveSession::class.java)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Fetches user settings from the backend.
     * Returns default settings on any error.
     */
    suspend fun getUserSettings(userEmail: String): UserSettings = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$BASE_URL/settings/$userEmail")
                .get()
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return@withContext defaultSettings(userEmail)

            val body = response.body?.string() ?: return@withContext defaultSettings(userEmail)
            gson.fromJson(body, UserSettings::class.java)
        } catch (e: Exception) {
            defaultSettings(userEmail)
        }
    }

    /**
     * Logs an override (user disabled focus mode manually).
     */
    suspend fun logOverride(sessionId: String, userEmail: String, reason: String): Boolean =
        withContext(Dispatchers.IO) {
            try {
                val payload = gson.toJson(OverrideRequest(userEmail, reason))
                val body = payload.toRequestBody(jsonMediaType)
                val request = Request.Builder()
                    .url("$BASE_URL/focus/sessions/$sessionId/override")
                    .post(body)
                    .build()

                val response = client.newCall(request).execute()
                response.isSuccessful
            } catch (e: Exception) {
                false
            }
        }

    /**
     * Submits proof of task completion for AI verification.
     */
    suspend fun submitCompletion(
        sessionId: String,
        userEmail: String,
        description: String,
        imageBase64: String? = null
    ): CompletionResponse? = withContext(Dispatchers.IO) {
        try {
            val payload = gson.toJson(CompletionRequest(userEmail, description, imageBase64))
            val body = payload.toRequestBody(jsonMediaType)
            val request = Request.Builder()
                .url("$BASE_URL/focus/sessions/$sessionId/complete")
                .post(body)
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return@withContext null

            val responseBody = response.body?.string() ?: return@withContext null
            gson.fromJson(responseBody, CompletionResponse::class.java)
        } catch (e: Exception) {
            null
        }
    }

    private fun defaultSettings(userEmail: String) = UserSettings(
        userEmail = userEmail,
        blockedSites = listOf(
            "instagram.com", "facebook.com", "twitter.com", "x.com",
            "tiktok.com", "youtube.com", "reddit.com"
        ),
        emergencySites = listOf("gmail.com", "google.com", "meet.google.com", "whatsapp.com"),
        triggerIntensity = "medium",
        advanceMinutes = 5
    )
}
