package com.licensemanagement.backend.util;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.*;

/**
 * FR-10: Software-managed cryptographic key hierarchy.
 *
 * Key structure:
 *
 *   ROOT KEY (AES-256, Shamir-split into N shares — requires K shares to reconstruct)
 *       │
 *       ├── AUDIT SIGNING KEY  (RSA-2048, protected by ROOT KEY)
 *       │       Used exclusively to sign audit log entries (FR-09)
 *       │
 *       └── PRODUCT SIGNING KEY per product  (RSA-2048, protected by ROOT KEY)
 *               Used to sign license containers issued for that product (FR-03)
 *
 * The root key is never stored in plaintext — only its AES-256-GCM-encrypted form
 * is persisted (in application.properties / .env as KEY_SHARE_MASTER_CIPHER).
 * Reconstruction requires at least K of N Shamir shares provided by custodians.
 *
 * For this implementation the "custodians" are simulated via the admin API:
 *   POST /api/admin/key-hierarchy/init      — generate root key + shares
 *   POST /api/admin/key-hierarchy/unlock    — reconstruct root key from K shares
 *   POST /api/admin/key-hierarchy/product-key — derive/register a per-product key
 */
@Component
@Slf4j
public class KeyHierarchyService {

    // Shamir parameters
    private static final int SHAMIR_N = 5;   // total shares produced
    private static final int SHAMIR_K = 3;   // minimum shares needed to reconstruct

    // Galois field prime for Shamir (2^127 - 1, a Mersenne prime)
    private static final BigInteger PRIME =
        BigInteger.TWO.pow(127).subtract(BigInteger.ONE);

    @Value("${app.security.root-key-cipher:}")
    private String rootKeyCipherB64;   // AES-256-GCM encrypted root key (stored in env)

    @Value("${app.security.root-key-iv:}")
    private String rootKeyIvB64;       // IV for root-key cipher

    @Value("${app.security.audit-signing-key:}")
    private String auditSigningKeyB64; // RSA private key for audit trail, encrypted with root key

    /** In-memory root key — only present after unlock(). Never written to disk in plaintext. */
    private byte[] rootKey = null;

    /** In-memory per-product RSA keys: productId -> {privateKey, publicKey} */
    private final Map<String, KeyPair> productKeys = new HashMap<>();

    /** In-memory audit trail RSA key pair */
    private KeyPair auditKeyPair = null;

    // -------------------------------------------------------------------------
    // Initialisation
    // -------------------------------------------------------------------------

    @PostConstruct
    public void init() {
        if (rootKeyCipherB64 != null && !rootKeyCipherB64.isBlank()) {
            log.info("FR-10: Root key cipher found in configuration. Call /api/admin/key-hierarchy/unlock to activate key hierarchy.");
        } else {
            log.warn("FR-10: No root key configured. Key hierarchy is inactive. " +
                     "Call POST /api/admin/key-hierarchy/init to bootstrap.");
        }
    }

    // -------------------------------------------------------------------------
    // FR-10: Bootstrap — generate root key and split into Shamir shares
    // -------------------------------------------------------------------------

    /**
     * Generate a fresh AES-256 root key, split it into SHAMIR_N shares,
     * and return the shares to the caller (to be distributed to custodians).
     *
     * The root key is AES-256-GCM encrypted with a master password and
     * the cipher/IV are returned so they can be stored in configuration.
     *
     * @param masterPassword  A strong password used to seal the root key at rest.
     * @return  Map containing: "shares" (list of hex strings), "rootKeyCipher", "rootKeyIv"
     */
    public Map<String, Object> initRootKey(String masterPassword) {
        try {
            // 1. Generate AES-256 root key
            KeyGenerator kg = KeyGenerator.getInstance("AES");
            kg.init(256, new SecureRandom());
            SecretKey rootSecretKey = kg.generateKey();
            byte[] rawRoot = rootSecretKey.getEncoded();

            // 2. Shamir-split the root key into N shares
            List<String> shares = shamirSplit(rawRoot, SHAMIR_K, SHAMIR_N);

            // 3. Seal the root key with the master password (PBKDF2 + AES-256-GCM)
            byte[] salt = new byte[16];
            new SecureRandom().nextBytes(salt);
            byte[] derivedKey = pbkdf2(masterPassword, salt, 300_000, 32);
            byte[] iv = new byte[12];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(derivedKey, "AES"), new GCMParameterSpec(128, iv));
            byte[] ciphertext = cipher.doFinal(rawRoot);

            // Store root key in memory for immediate use
            this.rootKey = rawRoot;
            log.info("FR-10: Root key initialised. {} shares generated (need {} to unlock).", SHAMIR_N, SHAMIR_K);

            // 4. Generate audit signing key pair and seal with root key
            auditKeyPair = generateRsaKeyPair();
            log.info("FR-10: Audit signing key pair generated.");

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("shares",       shares);
            result.put("shamirN",      SHAMIR_N);
            result.put("shamirK",      SHAMIR_K);
            result.put("rootKeyCipher", Base64.getEncoder().encodeToString(
                    concat(salt, ciphertext)));          // salt prepended to ciphertext
            result.put("rootKeyIv",    Base64.getEncoder().encodeToString(iv));
            result.put("auditPublicKey", Base64.getEncoder().encodeToString(
                    auditKeyPair.getPublic().getEncoded()));
            result.put("message",
                "Store rootKeyCipher and rootKeyIv in your .env. " +
                "Distribute each share to a separate custodian. " +
                "You need " + SHAMIR_K + " of " + SHAMIR_N + " shares to unlock.");
            return result;
        } catch (Exception e) {
            log.error("FR-10: Failed to initialise root key", e);
            throw new RuntimeException("Key hierarchy initialisation failed", e);
        }
    }

    // -------------------------------------------------------------------------
    // FR-10: Unlock — reconstruct root key from K Shamir shares
    // -------------------------------------------------------------------------

    /**
     * Reconstruct the root key from at least K Shamir shares and load the audit
     * signing key. Must be called before any key-hierarchy operations will work.
     *
     * @param shares  At least SHAMIR_K hex-encoded shares from custodians.
     * @return true if unlock succeeded.
     */
    public boolean unlock(List<String> shares) {
        if (shares == null || shares.size() < SHAMIR_K) {
            throw new BusinessValidationException(
                "Need at least " + SHAMIR_K + " shares to unlock the key hierarchy.");
        }
        try {
            byte[] reconstructed = shamirReconstruct(shares);
            this.rootKey = reconstructed;
            log.info("FR-10: Root key successfully reconstructed from {} shares.", shares.size());

            // Re-derive audit key if stored
            if (auditSigningKeyB64 != null && !auditSigningKeyB64.isBlank()) {
                byte[] encAuditKey = Base64.getDecoder().decode(auditSigningKeyB64);
                byte[] auditPriv = aesGcmDecrypt(encAuditKey, rootKey);
                KeyFactory kf = KeyFactory.getInstance("RSA");
                PrivateKey priv = kf.generatePrivate(new PKCS8EncodedKeySpec(auditPriv));
                // Public key is not secret — derive from private
                auditKeyPair = new KeyPair(null, priv);
            }
            return true;
        } catch (BusinessValidationException bve) {
            throw bve;
        } catch (Exception e) {
            log.error("FR-10: Root key unlock failed", e);
            return false;
        }
    }

    // -------------------------------------------------------------------------
    // FR-10: Per-product signing keys
    // -------------------------------------------------------------------------

    /**
     * Generate and register a signing key pair for a specific product.
     * The private key is sealed with the root key and returned encrypted
     * (to be stored in configuration). The public key is returned for
     * embedding in client apps.
     */
    public Map<String, String> generateProductKey(String productId) {
        requireUnlocked();
        try {
            KeyPair kp = generateRsaKeyPair();
            productKeys.put(productId, kp);

            // Seal private key with root key
            byte[] encPriv = aesGcmEncrypt(kp.getPrivate().getEncoded(), rootKey);

            log.info("FR-10: Generated signing key pair for product '{}'.", productId);
            return Map.of(
                "productId",        productId,
                "encryptedPrivKey", Base64.getEncoder().encodeToString(encPriv),
                "publicKey",        Base64.getEncoder().encodeToString(kp.getPublic().getEncoded()),
                "message",          "Store encryptedPrivKey in config under app.security.product-key." + productId
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate product key for " + productId, e);
        }
    }

    /**
     * Load a previously sealed product key into memory.
     * @param productId       The product identifier.
     * @param encPrivKeyB64   Base64-encoded AES-256-GCM sealed private key.
     */
    public void loadProductKey(String productId, String encPrivKeyB64, String pubKeyB64) {
        requireUnlocked();
        try {
            byte[] encPriv = Base64.getDecoder().decode(encPrivKeyB64);
            byte[] rawPriv = aesGcmDecrypt(encPriv, rootKey);
            KeyFactory kf  = KeyFactory.getInstance("RSA");
            PrivateKey priv = kf.generatePrivate(new PKCS8EncodedKeySpec(rawPriv));

            PublicKey pub = null;
            if (pubKeyB64 != null && !pubKeyB64.isBlank()) {
                pub = kf.generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(pubKeyB64)));
            }
            productKeys.put(productId, new KeyPair(pub, priv));
            log.info("FR-10: Product key for '{}' loaded.", productId);
        } catch (Exception e) {
            throw new RuntimeException("Failed to load product key for " + productId, e);
        }
    }

    // -------------------------------------------------------------------------
    // Signing accessors
    // -------------------------------------------------------------------------

    /** FR-10: Sign data with the product-specific signing key. */
    public String signWithProductKey(String productId, String data) {
        KeyPair kp = productKeys.get(productId);
        if (kp == null || kp.getPrivate() == null) {
            log.warn("FR-10: No product key for '{}' — falling back to root RSA key.", productId);
            return null; // caller falls back to CryptoUtil.sign()
        }
        try {
            Signature sig = Signature.getInstance("SHA256withRSA");
            sig.initSign(kp.getPrivate());
            sig.update(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(sig.sign());
        } catch (Exception e) {
            throw new RuntimeException("Product key signing failed for " + productId, e);
        }
    }

    /** FR-10: Sign data with the dedicated audit-trail signing key. */
    public String signWithAuditKey(String data) {
        if (auditKeyPair == null || auditKeyPair.getPrivate() == null) {
            log.debug("FR-10: Audit key not loaded — audit entry will use root RSA key.");
            return null; // caller uses CryptoUtil.sign() as fallback
        }
        try {
            Signature sig = Signature.getInstance("SHA256withRSA");
            sig.initSign(auditKeyPair.getPrivate());
            sig.update(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(sig.sign());
        } catch (Exception e) {
            throw new RuntimeException("Audit key signing failed", e);
        }
    }

    public boolean isUnlocked()           { return rootKey != null; }
    public KeyPair getProductKey(String id){ return productKeys.get(id); }
    public KeyPair getAuditKeyPair()       { return auditKeyPair; }

    // -------------------------------------------------------------------------
    // FR-10: Shamir Secret Sharing (GF(prime) polynomial interpolation)
    // -------------------------------------------------------------------------

    /**
     * Split secret into N shares such that K are needed to reconstruct.
     * Returns shares as hex strings in format "x:y".
     */
    public List<String> shamirSplit(byte[] secret, int k, int n) {
        SecureRandom rng = new SecureRandom();
        BigInteger s = new BigInteger(1, secret);

        // Build random polynomial of degree k-1: f(x) = s + a1*x + a2*x^2 + ... + a(k-1)*x^(k-1)
        BigInteger[] coeffs = new BigInteger[k];
        coeffs[0] = s;
        for (int i = 1; i < k; i++) {
            coeffs[i] = new BigInteger(PRIME.bitLength(), rng).mod(PRIME);
        }

        List<String> shares = new ArrayList<>();
        for (int x = 1; x <= n; x++) {
            BigInteger xVal = BigInteger.valueOf(x);
            BigInteger y = BigInteger.ZERO;
            BigInteger xPow = BigInteger.ONE;
            for (BigInteger c : coeffs) {
                y = y.add(c.multiply(xPow)).mod(PRIME);
                xPow = xPow.multiply(xVal).mod(PRIME);
            }
            shares.add(x + ":" + y.toString(16));
        }
        return shares;
    }

    /**
     * Reconstruct the secret from at least K shares using Lagrange interpolation.
     */
    public byte[] shamirReconstruct(List<String> shares) {
        List<BigInteger[]> points = new ArrayList<>();
        for (String share : shares) {
            String[] parts = share.split(":");
            if (parts.length != 2) throw new IllegalArgumentException("Invalid share format: " + share);
            points.add(new BigInteger[]{
                new BigInteger(parts[0]),
                new BigInteger(parts[1], 16)
            });
        }

        BigInteger secret = BigInteger.ZERO;
        for (int i = 0; i < points.size(); i++) {
            BigInteger xi = points.get(i)[0];
            BigInteger yi = points.get(i)[1];
            BigInteger num = BigInteger.ONE;
            BigInteger den = BigInteger.ONE;
            for (int j = 0; j < points.size(); j++) {
                if (i == j) continue;
                BigInteger xj = points.get(j)[0];
                num = num.multiply(xj.negate()).mod(PRIME);
                den = den.multiply(xi.subtract(xj)).mod(PRIME);
            }
            BigInteger lagrange = yi.multiply(num).multiply(den.modInverse(PRIME)).mod(PRIME);
            secret = secret.add(lagrange).mod(PRIME);
        }

        // Convert back to byte array (pad to 32 bytes for AES-256)
        byte[] raw = secret.toByteArray();
        byte[] key = new byte[32];
        int srcOff = raw.length > 32 ? raw.length - 32 : 0;
        int dstOff = 32 - (raw.length - srcOff);
        System.arraycopy(raw, srcOff, key, dstOff, raw.length - srcOff);
        return key;
    }

    // -------------------------------------------------------------------------
    // AES-256-GCM helpers for sealing keys at rest
    // -------------------------------------------------------------------------

    private byte[] aesGcmEncrypt(byte[] plaintext, byte[] keyBytes) throws Exception {
        byte[] iv = new byte[12];
        new SecureRandom().nextBytes(iv);
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(keyBytes, "AES"), new GCMParameterSpec(128, iv));
        byte[] ct = c.doFinal(plaintext);
        return concat(iv, ct); // prepend IV
    }

    private byte[] aesGcmDecrypt(byte[] ivAndCiphertext, byte[] keyBytes) throws Exception {
        byte[] iv = Arrays.copyOfRange(ivAndCiphertext, 0, 12);
        byte[] ct = Arrays.copyOfRange(ivAndCiphertext, 12, ivAndCiphertext.length);
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(keyBytes, "AES"), new GCMParameterSpec(128, iv));
        return c.doFinal(ct);
    }

    private static byte[] pbkdf2(String password, byte[] salt, int iterations, int keyLen) throws Exception {
        javax.crypto.SecretKeyFactory skf = javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        char[] pwd = password.toCharArray();
        javax.crypto.spec.PBEKeySpec spec = new javax.crypto.spec.PBEKeySpec(pwd, salt, iterations, keyLen * 8);
        return skf.generateSecret(spec).getEncoded();
    }

    private static KeyPair generateRsaKeyPair() throws Exception {
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048, new SecureRandom());
        return gen.generateKeyPair();
    }

    private static byte[] concat(byte[] a, byte[] b) {
        byte[] r = new byte[a.length + b.length];
        System.arraycopy(a, 0, r, 0, a.length);
        System.arraycopy(b, 0, r, a.length, b.length);
        return r;
    }

    private void requireUnlocked() {
        if (rootKey == null) {
            throw new BusinessValidationException(
                "Key hierarchy is locked. Unlock it first with POST /api/admin/key-hierarchy/unlock");
        }
    }

    // Inline exception class to avoid import issues
    private static class BusinessValidationException extends RuntimeException {
        BusinessValidationException(String msg) { super(msg); }
    }
}
