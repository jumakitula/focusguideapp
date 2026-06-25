package com.focusguard.ai.vpn

object DnsPacketParser {

    // IP protocol number for UDP
    private const val PROTOCOL_UDP = 17
    // DNS port
    private const val DNS_PORT = 53

    /**
     * Checks if the packet is a DNS query (UDP to port 53).
     * IPv4 header: byte 9 = protocol, bytes 20-21 = UDP src port, bytes 22-23 = UDP dst port
     */
    fun isDnsQuery(packet: ByteArray, length: Int): Boolean {
        if (length < 28) return false // Minimum IP(20) + UDP(8) headers

        // Check IP version (high nibble of first byte should be 4)
        val version = (packet[0].toInt() and 0xF0) shr 4
        if (version != 4) return false

        // Check protocol is UDP (byte offset 9)
        val protocol = packet[9].toInt() and 0xFF
        if (protocol != PROTOCOL_UDP) return false

        // IP header length (low nibble of first byte * 4)
        val ipHeaderLength = (packet[0].toInt() and 0x0F) * 4

        if (length < ipHeaderLength + 8) return false

        // UDP destination port is at ipHeaderLength + 2 (2 bytes, big-endian)
        val dstPort = ((packet[ipHeaderLength + 2].toInt() and 0xFF) shl 8) or
                (packet[ipHeaderLength + 3].toInt() and 0xFF)

        return dstPort == DNS_PORT
    }

    /**
     * Extracts the queried domain name from a DNS query packet.
     * Layout: IP header | UDP header (8 bytes) | DNS header (12 bytes) | Question section
     * DNS question: QNAME (length-prefixed labels, null terminated) | QTYPE (2) | QCLASS (2)
     */
    fun extractDomain(packet: ByteArray, length: Int): String? {
        return try {
            // IP header length
            val ipHeaderLength = (packet[0].toInt() and 0x0F) * 4
            // Skip IP header + UDP header (8 bytes) + DNS header (12 bytes)
            var offset = ipHeaderLength + 8 + 12

            if (offset >= length) return null

            val labels = mutableListOf<String>()

            // Parse QNAME: sequence of length-prefixed labels ending with a 0-length label
            while (offset < length) {
                val labelLength = packet[offset].toInt() and 0xFF
                offset++
                if (labelLength == 0) break // Root label — end of domain
                if (offset + labelLength > length) return null

                val label = String(packet, offset, labelLength, Charsets.US_ASCII)
                labels.add(label)
                offset += labelLength
            }

            if (labels.isEmpty()) null else labels.joinToString(".")
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Builds a DNS NXDOMAIN (RCODE=3) response to send back for blocked domains.
     * Copies the transaction ID and question section from the original query.
     * Sets the QR bit to 1 (response) and RCODE to 3 (NXDOMAIN).
     */
    fun buildBlockedResponse(originalPacket: ByteArray, length: Int): ByteArray {
        val ipHeaderLength = (originalPacket[0].toInt() and 0x0F) * 4
        val udpOffset = ipHeaderLength
        val dnsOffset = udpOffset + 8

        if (length < dnsOffset + 12) return originalPacket

        val response = originalPacket.copyOf(length)

        // Swap source and destination IP (bytes 12-15 and 16-19)
        for (i in 0 until 4) {
            val tmp = response[12 + i]
            response[12 + i] = response[16 + i]
            response[16 + i] = tmp
        }

        // Swap source and destination UDP ports (bytes udpOffset..udpOffset+3)
        val tmpSrcPort0 = response[udpOffset]
        val tmpSrcPort1 = response[udpOffset + 1]
        response[udpOffset] = response[udpOffset + 2]
        response[udpOffset + 1] = response[udpOffset + 3]
        response[udpOffset + 2] = tmpSrcPort0
        response[udpOffset + 3] = tmpSrcPort1

        // DNS flags: set QR=1 (bit 15), OPCODE=0, AA=0, TC=0, RD=1, RA=0, RCODE=3
        // Original flags are at dnsOffset+2 and dnsOffset+3
        // Set QR bit (bit 7 of first flags byte)
        response[dnsOffset + 2] = (response[dnsOffset + 2].toInt() or 0x80).toByte()
        // Set RCODE to 3 (NXDOMAIN) in lower nibble of second flags byte
        response[dnsOffset + 3] = (response[dnsOffset + 3].toInt() and 0xF0 or 0x03).toByte()

        // Recalculate IP total length (already correct since we used copyOf)
        // Recalculate UDP length (already correct)

        // Clear IP checksum (bytes 10-11) — let kernel recalculate
        response[10] = 0
        response[11] = 0

        // Clear UDP checksum (bytes udpOffset+6, udpOffset+7)
        response[udpOffset + 6] = 0
        response[udpOffset + 7] = 0

        return response
    }
}
