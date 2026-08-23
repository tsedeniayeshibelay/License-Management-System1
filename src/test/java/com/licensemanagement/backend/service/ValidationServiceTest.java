package com.licensemanagement.backend.service;

import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.exception.BusinessValidationException;
import com.licensemanagement.backend.repository.LicenseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ValidationServiceTest {

    @Mock
    private LicenseRepository licenseRepository;

    @InjectMocks
    private ValidationService validationService;

    private License mockLicense;

    @BeforeEach
    void setUp() {
        mockLicense = new License();
        mockLicense.setLicenseKey("TEST-KEY");
        mockLicense.setStatus("ACTIVE");
        mockLicense.setExpiryDate(LocalDate.now().plusDays(10));
        mockLicense.setMaxActivations(3);
    }

    @Test
    void testIsValidLicense() {
        when(licenseRepository.findByLicenseKey("TEST-KEY")).thenReturn(Optional.of(mockLicense));
        
        assertTrue(validationService.isValidLicense("TEST-KEY"));
    }

    @Test
    void testIsInvalidLicenseExpired() {
        mockLicense.setExpiryDate(LocalDate.now().minusDays(1));
        when(licenseRepository.findByLicenseKey("TEST-KEY")).thenReturn(Optional.of(mockLicense));
        
        assertFalse(validationService.isValidLicense("TEST-KEY"));
    }

    @Test
    void testValidateLicenseActiveThrowsExceptionIfInactive() {
        mockLicense.setStatus("REVOKED");
        
        assertThrows(BusinessValidationException.class, () -> validationService.validateLicenseActive(mockLicense));
    }

    @Test
    void testValidateLicenseActiveThrowsExceptionIfExpired() {
        mockLicense.setExpiryDate(LocalDate.now().minusDays(5));
        
        assertThrows(BusinessValidationException.class, () -> validationService.validateLicenseActive(mockLicense));
    }

    @Test
    void testValidateLicenseActivePasses() {
        assertDoesNotThrow(() -> validationService.validateLicenseActive(mockLicense));
    }

    @Test
    void testValidateDeviceLimitThrowsException() {
        assertThrows(BusinessValidationException.class, () -> validationService.validateDeviceLimit(mockLicense, 3)); // >= 3 throws exception
    }

    @Test
    void testValidateDeviceLimitPasses() {
        assertDoesNotThrow(() -> validationService.validateDeviceLimit(mockLicense, 2));
    }

    @Test
    void testGetLicenseStatus() {
        when(licenseRepository.findByLicenseKey("TEST-KEY")).thenReturn(Optional.of(mockLicense));
        assertEquals("VALID", validationService.getLicenseStatus("TEST-KEY"));
        
        mockLicense.setExpiryDate(LocalDate.now().minusDays(1));
        assertEquals("EXPIRED", validationService.getLicenseStatus("TEST-KEY"));
        
        mockLicense.setStatus("SUSPENDED");
        assertEquals("INACTIVE", validationService.getLicenseStatus("TEST-KEY"));
    }
}
