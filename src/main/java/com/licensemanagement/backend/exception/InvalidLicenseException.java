package com.licensemanagement.backend.exception;
public class InvalidLicenseException extends RuntimeException {
    public InvalidLicenseException(String message) {
        super(message);
    }
    public InvalidLicenseException(String message, Throwable cause) {
        super(message, cause);
    }
}