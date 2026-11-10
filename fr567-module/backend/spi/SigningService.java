package com.licensemanagement.backend.fr567.spi;

/**
 * SPI: Your project must implement this interface so FR-05 and FR-07
 * can sign and verify data using your RSA key pair.
 *
 * Typically wraps your existing CryptoUtil.sign() / verify() methods.
 */
public interface SigningService {

    /**
     * Sign data with your RSA private key (SHA256withRSA).
     * @return Base64-encoded signature.
     */
    String sign(String data);

    /**
     * Verify a Base64-encoded signature against data using your RSA public key.
     * @return true if the signature is valid.
     */
    boolean verify(String data, String signatureBase64);

    /**
     * Return a short identifier for the key in use (e.g. "lockstrata-rsa-1").
     */
    String getKeyId();
}
