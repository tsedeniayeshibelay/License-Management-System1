package com.licensemanagement.backend.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;
import java.security.*;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

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
                publicKey = keyPair.getPublic();
                
                log.info("--- TEMPORARY RSA PUBLIC KEY (Give this to your client app) ---");
                log.info(Base64.getEncoder().encodeToString(publicKey.getEncoded()));
                log.info("---------------------------------------------------------------");
            } else {
                KeyFactory keyFactory = KeyFactory.getInstance("RSA");
                
                byte[] privateKeyBytes = Base64.getDecoder().decode(privateKeyString);
                PKCS8EncodedKeySpec privateKeySpec = new PKCS8EncodedKeySpec(privateKeyBytes);
                privateKey = keyFactory.generatePrivate(privateKeySpec);
                
                byte[] publicKeyBytes = Base64.getDecoder().decode(publicKeyString);
                X509EncodedKeySpec publicKeySpec = new X509EncodedKeySpec(publicKeyBytes);
                publicKey = keyFactory.generatePublic(publicKeySpec);
                
                log.info("RSA keys successfully loaded from configuration.");
            }
        } catch (Exception e) {
            log.error("Failed to initialize RSA keys", e);
            throw new RuntimeException("Failed to initialize RSA keys", e);
        }
    }

    public String sign(String data) {
        try {
            Signature signature = Signature.getInstance("SHA256withRSA");
            signature.initSign(privateKey);
            signature.update(data.getBytes());
            byte[] signedBytes = signature.sign();
            return Base64.getEncoder().encodeToString(signedBytes);
        } catch (Exception e) {
            log.error("Failed to sign data", e);
            throw new RuntimeException("Failed to sign data", e);
        }
    }

    public boolean verify(String data, String signatureString) {
        try {
            Signature signature = Signature.getInstance("SHA256withRSA");
            signature.initVerify(publicKey);
            signature.update(data.getBytes());
            byte[] signatureBytes = Base64.getDecoder().decode(signatureString);
            return signature.verify(signatureBytes);
        } catch (Exception e) {
            log.error("Failed to verify data", e);
            return false;
        }
    }

    public String getKeyId() {
        return "lockstrata-rsa-1";
    }
}
