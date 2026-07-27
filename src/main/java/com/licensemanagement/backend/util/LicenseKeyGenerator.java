package com.licensemanagement.backend.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;

@Component
public class LicenseKeyGenerator {

    @Value("${app.security.license.hmac-secret}")
    private String hmacSecret;

    private static final SecureRandom RANDOM = new SecureRandom();

    public String generateKey(Long productId) {
        try {
            // Ensure productId fits in 2 bytes (max 65535)
            short pId = (short) (productId != null ? (productId % 65536) : 0);
            
            // Generate 4 random bytes
            byte[] randomSeed = new byte[4];
            RANDOM.nextBytes(randomSeed);
            
            // Pack into 6 bytes (2 for productId + 4 random)
            ByteBuffer buffer = ByteBuffer.allocate(6);
            buffer.putShort(pId);
            buffer.put(randomSeed);
            byte[] payload = buffer.array();
            
            // Calculate HMAC-SHA256
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(hmacSecret.getBytes(), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] signature = mac.doFinal(payload);
            
            // Take first 9 bytes of signature for a total of 15 bytes (6 payload + 9 signature)
            // 15 bytes * 8 bits = 120 bits. 120 / 5 = 24 base32 characters.
            byte[] finalKeyBytes = new byte[15];
            System.arraycopy(payload, 0, finalKeyBytes, 0, 6);
            System.arraycopy(signature, 0, finalKeyBytes, 6, 9);
            
            // Base32 encode
            String base32Key = Base32Util.encode(finalKeyBytes);
            
            // Format as XXXXX-XXXXX-XXXXX-XXXXX-XXXXX (24 chars + 4 dashes = 28 chars? Wait. 24 chars is XXXXXX-XXXXX...)
            // 24 characters: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX (6 groups of 4)
            StringBuilder formattedKey = new StringBuilder();
            for (int i = 0; i < base32Key.length(); i++) {
                if (i > 0 && i % 4 == 0) {
                    formattedKey.append("-");
                }
                formattedKey.append(base32Key.charAt(i));
            }
            return formattedKey.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate secure license key", e);
        }
    }
}