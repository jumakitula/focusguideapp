package com.focusguard.ai.vpn

import kotlinx.coroutines.*

object BlocklistManager {

    private val blockedDomains = mutableSetOf<String>()
    private val emergencyDomains = mutableSetOf<String>()
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    private val defaultBlockedDomains = setOf(
        "instagram.com", "facebook.com", "twitter.com", "x.com",
        "tiktok.com", "youtube.com", "reddit.com", "snapchat.com",
        "pinterest.com", "netflix.com", "primevideo.com", "hotstar.com"
    )

    private val defaultEmergencyDomains = setOf(
        "gmail.com", "google.com", "meet.google.com", "maps.google.com",
        "whatsapp.com", "10.0.2.2", "localhost"
    )

    init {
        blockedDomains.addAll(defaultBlockedDomains)
        emergencyDomains.addAll(defaultEmergencyDomains)
    }

    /**
     * Returns true if the domain should be blocked.
     * Emergency domains always pass through (substring match).
     * Blocked domains are dropped (substring match).
     */
    fun isBlocked(domain: String): Boolean {
        val lowerDomain = domain.lowercase()

        // Check emergency (always allowed) first
        if (emergencyDomains.any { lowerDomain.contains(it) || it.contains(lowerDomain) }) {
            return false
        }

        // Check blocked list
        return blockedDomains.any { lowerDomain.contains(it) || it.contains(lowerDomain) }
    }

    /**
     * Replace current lists with data from an active session.
     */
    fun updateFromSession(newBlockedSites: List<String>, newEmergencySites: List<String>) {
        synchronized(this) {
            blockedDomains.clear()
            if (newBlockedSites.isEmpty()) {
                blockedDomains.addAll(defaultBlockedDomains)
            } else {
                blockedDomains.addAll(newBlockedSites.map { it.lowercase() })
            }

            emergencyDomains.clear()
            emergencyDomains.addAll(defaultEmergencyDomains)
            emergencyDomains.addAll(newEmergencySites.map { it.lowercase() })
        }
    }

    /**
     * Temporarily allow a domain for a given number of minutes, then remove it.
     */
    fun addTemporaryAllowance(domain: String, durationMinutes: Int) {
        val lowerDomain = domain.lowercase()
        emergencyDomains.add(lowerDomain)

        scope.launch {
            delay(durationMinutes * 60_000L)
            emergencyDomains.remove(lowerDomain)
        }
    }

    /**
     * Returns a status map with current counts and lists for the UI.
     */
    fun getStatus(): Map<String, Any> {
        return mapOf(
            "blocked_count" to blockedDomains.size,
            "emergency_count" to emergencyDomains.size,
            "blocked_domains" to blockedDomains.toList(),
            "emergency_domains" to emergencyDomains.toList()
        )
    }
}
