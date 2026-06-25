package com.focusguard.ai.api

import com.google.gson.annotations.SerializedName

data class ActiveSession(
    @SerializedName("session_id") val sessionId: String,
    @SerializedName("event_title") val eventTitle: String,
    @SerializedName("start_time") val startTime: String,
    @SerializedName("end_time") val endTime: String,
    @SerializedName("focus_intensity") val focusIntensity: String,
    @SerializedName("blocked_sites") val blockedSites: List<String>,
    @SerializedName("emergency_sites") val emergencySites: List<String>,
    @SerializedName("is_active") val isActive: Boolean,
    @SerializedName("ai_reason") val aiReason: String?
)

data class UserSettings(
    @SerializedName("user_email") val userEmail: String,
    @SerializedName("blocked_sites") val blockedSites: List<String>,
    @SerializedName("emergency_sites") val emergencySites: List<String>,
    @SerializedName("trigger_intensity") val triggerIntensity: String,
    @SerializedName("advance_minutes") val advanceMinutes: Int
)

data class OverrideRequest(
    @SerializedName("user_email") val userEmail: String,
    @SerializedName("reason") val reason: String
)

data class OverrideResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String
)

data class CompletionRequest(
    @SerializedName("user_email") val userEmail: String,
    @SerializedName("description") val description: String,
    @SerializedName("image_base64") val imageBase64: String? = null
)

data class CompletionResponse(
    @SerializedName("verified") val verified: Boolean,
    @SerializedName("message") val message: String,
    @SerializedName("ai_analysis") val aiAnalysis: String?,
    @SerializedName("confidence") val confidence: Double?
)
