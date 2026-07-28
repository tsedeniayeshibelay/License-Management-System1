package com.licensemanagement.backend.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Arrays;

@Component
public class LicenseKeyValidator {

    @Value("${app.security.license.hmac-secret}")
    private String hmacSecret;

    /**
     * Validates a license key's cryptographic signature.
     * @param key The formatted license key (e.g. XXXX-XXXX-XXXX...)
     * @return true if structurally and cryptographically valid, false otherwise.
     */
    public boolean isValidKey(String key) {
        if (key == null || key.isBlank()) return false;
        
        try {
            // Decode Base32
            byte[] decoded = Base32Util.decode(key);
            
            // We expect exactly 15 bytes (6 bytes payload + 9 bytes signature)
            if (decoded.length != 15) {
                return false;
            }
            
            byte[] payload = new byte[6];
            System.arraycopy(decoded, 0, payload, 0, 6);
            
            byte[] providedSignature = new byte[9];
            System.arraycopy(decoded, 6, providedSignature, 0, 9);
            
            // Recalculate signature
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(hmacSecret.getBytes(), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] fullSignature = mac.doFinal(payload);
            
            byte[] expectedSignature = new byte[9];
            System.arraycopy(fullSignature, 0, expectedSignature, 0, 9);
            
            // Compare securely
            return Arrays.equals(providedSignature, expectedSignature);
            
        } catch (Exception e) {
            // Any error (e.g. invalid Base32 chars) means invalid key
            return false;
        }
    }
}
