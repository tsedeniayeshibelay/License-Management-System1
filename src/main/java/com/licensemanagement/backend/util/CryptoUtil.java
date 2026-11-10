package com.licensemanagement.backend.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;
import java.security.*;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

@Component
@Slf4j
public class CryptoUtil {

    @Value("${app.security.rsa.private-key:}")
    private String privateKeyString;

    @Value("${app.security.rsa.public-key:}")
    private String publicKeyString;

    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    private PrivateKey privateKey;
    private PublicKey publicKey;

    private static final int AES_KEY_BITS  = 256;
    private static final int GCM_IV_BYTES  = 12;
    private static final int GCM_TAG_BITS  = 128;

    @PostConstruct
    public void init() {
        try {
            if (privateKeyString.isEmpty() || publicKeyString.isEmpty()) {
                if ("prod".equalsIgnoreCase(activeProfile) || "production".equalsIgnoreCase(activeProfile)) {
                    throw new RuntimeException("CRITICAL: RSA keys must be provided in configuration for production environments. Refusing to generate temporary keys.");
                }
                log.warn("RSA keys not found in configuration. Generating a temporary 2048-bit RSA key pair for development...");
                KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("RSA");
                keyPairGenerator.initialize(2048);
                KeyPair keyPair = keyPairGenerator.generateKeyPair();
                privateKey = keyPair.getPrivate();
                publicKey  = keyPair.getPublic();
                log.info("--- TEMPORARY RSA PUBLIC KEY (Give this to your client app) ---");
                log.info(Base64.getEncoder().encodeToString(publicKey.getEncoded()));
                log.info("---------------------------------------------------------------");
            } else {
                KeyFactory keyFactory = KeyFactory.getInstance("RSA");
                byte[] privBytes = Base64.getDecoder().decode(privateKeyString);
                privateKey = keyFactory.generatePrivate(new PKCS8EncodedKeySpec(privBytes));
                byte[] pubBytes  = Base64.getDecoder().decode(publicKeyString);
                publicKey  = keyFactory.generatePublic(new X509EncodedKeySpec(pubBytes));
                log.info("RSA keys successfully loaded from configuration.");
            }
        } catch (Exception e) {
            log.error("Failed to initialize RSA keys", e);
            throw new RuntimeException("Failed to initialize RSA keys", e);
        }
    }

    // -------------------------------------------------------------------------
    // RSA signing (used for audit trail, offline payload signing)
    // -------------------------------------------------------------------------

    public String sign(String data) {
        try {
            Signature sig = Signature.getInstance("SHA256withRSA");
            sig.initSign(privateKey);
            sig.update(data.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(sig.sign());
        } catch (Exception e) {
            log.error("Failed to sign data", e);
            throw new RuntimeException("Failed to sign data", e);
        }
    }

    public boolean verify(String data, String signatureString) {
        try {
            Signature sig = Signature.getInstance("SHA256withRSA");
            sig.initVerify(publicKey);
            sig.update(data.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return sig.verify(Base64.getDecoder().decode(signatureString));
        } catch (Exception e) {
            log.error("Failed to verify data", e);
            return false;
        }
    }

    // -------------------------------------------------------------------------
    // FR-03: Encrypted license container — AES-256-GCM payload, RSA-OAEP key wrap
    //
    // Container wire format (all fields Base64-encoded in a JSON object):
    //   {
    //     "v":          "2",                    // format version
    //     "ct":         "DEVICE_BOUND",         // container type
    //     "encKey":     "<base64>",             // RSA-OAEP encrypted AES-256 key
    //     "iv":         "<base64>",             // 12-byte GCM IV
    //     "ciphertext": "<base64>",             // AES-256-GCM encrypted payload JSON
    //     "sig":        "<base64>"              // RSA-SHA256 sig over (iv + ciphertext)
    //   }
    // -------------------------------------------------------------------------

    /**
     * FR-03: Encrypt a plaintext payload JSON into a signed, encrypted container.
     *
     * DEVICE_BOUND: AES key derived from deviceFingerprint via PBKDF2 (client decrypts
     *               with its own fingerprint — no private key needed on client).
     *               encKey field stores the PBKDF2 salt.
     *
     * ONLINE / NETWORK_SERVED: AES key wrapped with RSA-OAEP (server-decryptable only;
     *               client receives the plaintext payload separately over TLS).
     *
     * @param payloadJson   The JSON string to protect.
     * @param containerType One of: DEVICE_BOUND, ONLINE, NETWORK_SERVED
     * @param deviceFingerprint Required for DEVICE_BOUND; ignored otherwise.
     * @return A JSON string representing the encrypted container.
     */
    public String encryptContainer(String payloadJson, String containerType, String deviceFingerprint) {
        try {
            byte[] iv = new byte[GCM_IV_BYTES];
            new SecureRandom().nextBytes(iv);

            byte[] aesKeyBytes;
            byte[] encKeyField; // stored in "encKey" — meaning differs by type

            if ("DEVICE_BOUND".equals(containerType) && deviceFingerprint != null) {
                // Derive AES key from fingerprint — must match PBKDF2 on client side
                byte[] salt = new byte[16];
                new SecureRandom().nextBytes(salt);
                aesKeyBytes = pbkdf2(deviceFingerprint.getBytes(java.nio.charset.StandardCharsets.UTF_8), salt, 200_000, 32);
                encKeyField = salt; // client uses same fingerprint + salt to re-derive
            } else {
                // ONLINE / NETWORK_SERVED: random key wrapped with RSA-OAEP
                KeyGenerator kg = KeyGenerator.getInstance("AES");
                kg.init(AES_KEY_BITS, new SecureRandom());
                aesKeyBytes = kg.generateKey().getEncoded();
                Cipher rsaCipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
                rsaCipher.init(Cipher.ENCRYPT_MODE, publicKey);
                encKeyField = rsaCipher.doFinal(aesKeyBytes);
            }

            // AES-256-GCM encrypt
            Cipher aesCipher = Cipher.getInstance("AES/GCM/NoPadding");
            aesCipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(aesKeyBytes, "AES"), new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] ciphertext = aesCipher.doFinal(payloadJson.getBytes(java.nio.charset.StandardCharsets.UTF_8));

            // RSA-SHA256 sign (iv || ciphertext)
            Signature sig = Signature.getInstance("SHA256withRSA");
            sig.initSign(privateKey);
            sig.update(concat(iv, ciphertext));
            byte[] signature = sig.sign();

            com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
            java.util.Map<String, String> container = new java.util.LinkedHashMap<>();
            container.put("v",          "2");
            container.put("ct",         containerType);
            container.put("encKey",     Base64.getEncoder().encodeToString(encKeyField));
            container.put("iv",         Base64.getEncoder().encodeToString(iv));
            container.put("ciphertext", Base64.getEncoder().encodeToString(ciphertext));
            container.put("sig",        Base64.getEncoder().encodeToString(signature));
            return om.writeValueAsString(container);
        } catch (Exception e) {
            log.error("Failed to encrypt container", e);
            throw new RuntimeException("Failed to encrypt license container", e);
        }
    }

    /** Convenience overload — uses RSA-OAEP (ONLINE mode). */
    public String encryptContainer(String payloadJson, String containerType) {
        return encryptContainer(payloadJson, containerType, null);
    }

    private static byte[] pbkdf2(byte[] password, byte[] salt, int iterations, int keyLen) throws Exception {
        javax.crypto.SecretKeyFactory skf = javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        javax.crypto.spec.PBEKeySpec spec = new javax.crypto.spec.PBEKeySpec(
            new String(password, java.nio.charset.StandardCharsets.UTF_8).toCharArray(), salt, iterations, keyLen * 8);
        return skf.generateSecret(spec).getEncoded();
    }

    public PublicKey getPublicKey() { return publicKey; }

    public String getKeyId() { return "lockstrata-rsa-1"; }

    private static byte[] concat(byte[] a, byte[] b) {
        byte[] result = new byte[a.length + b.length];
        System.arraycopy(a, 0, result, 0, a.length);
        System.arraycopy(b, 0, result, a.length, b.length);
        return result;
    }
}
