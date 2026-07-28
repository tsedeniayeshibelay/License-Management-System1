package com.licensemanagement.backend.util;
import java.util.Base64;
public class LicenseKeyEncoder {
    public static String encodeKey(String licenseKey) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(licenseKey.getBytes());
    }
    public static String decodeKey(String encodedKey) {
        try {
            return new String(Base64.getUrlDecoder().decode(encodedKey));
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid activation link!");
        }
    }
}