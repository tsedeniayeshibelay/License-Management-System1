package com.licensemanagement.backend.util;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
@Slf4j
@Component
public class HmacUtil {
    private static String SHARED_SECRET;
    @Value("${license.validation.hmac-secret:}")
    public void setSharedSecret(String secret) {
        SHARED_SECRET = secret;
    }
    private static Mac getMac() {
        try {
            if (SHARED_SECRET == null || SHARED_SECRET.isBlank()) {
                throw new IllegalStateException("HMAC secret is not configured.");
            }
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(
                    SHARED_SECRET.getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"
            );
            mac.init(keySpec);
            return mac;
        } catch (Exception e) {
            throw new RuntimeException("HMAC initialization failed", e);
        }
    }
    public static String computeSignature(String licenseKey, long timestamp, String deviceFingerprint) {
        String canonicalData = licenseKey + timestamp + deviceFingerprint;
        Mac mac = getMac();
        byte[] hmacBytes = mac.doFinal(canonicalData.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(hmacBytes);
    }
    public static boolean verifySignature(String licenseKey, long timestamp, String deviceFingerprint, String providedSignature) {
        if (providedSignature == null || providedSignature.isBlank()) {
            return false;
        }
        String expectedSignature = computeSignature(licenseKey, timestamp, deviceFingerprint);
        return MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                providedSignature.getBytes(StandardCharsets.UTF_8)
        );
    }
    public static String computeHmac(String data) {
        Mac mac = getMac();
        byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(hmacBytes);
    }
}