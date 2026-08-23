package com.licensemanagement.backend.service;

import com.licensemanagement.backend.dto.LicenseRequest;
import com.licensemanagement.backend.dto.ValidationResult;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.Product;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.enums.LicenseType;
import com.licensemanagement.backend.exception.BusinessValidationException;
import com.licensemanagement.backend.exception.ResourceConflictException;
import com.licensemanagement.backend.exception.ResourceNotFoundException;
import com.licensemanagement.backend.repository.LicenseRepository;
import com.licensemanagement.backend.repository.ProductRepository;
import com.licensemanagement.backend.repository.UserRepository;
import com.licensemanagement.backend.util.LicenseKeyGenerator;
import com.licensemanagement.backend.util.LicenseKeyValidator;
import com.licensemanagement.backend.util.QRCodeGenerator;
import com.licensemanagement.backend.util.ReportGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LicenseServiceTest {

    @Mock
    private LicenseRepository licenseRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private LicenseKeyGenerator licenseKeyGenerator;

    @Mock
    private LicenseKeyValidator licenseKeyValidator;

    @Mock
    private QRCodeGenerator qrCodeGenerator;

    @Mock
    private ReportGenerator reportGenerator;

    @Mock
    private WebhookService webhookService;

    @InjectMocks
    private LicenseService licenseService;

    private License mockLicense;

    @BeforeEach
    void setUp() {
        org.mockito.Mockito.lenient().when(licenseKeyValidator.isValidKey(anyString())).thenReturn(true);
        mockLicense = new License();
        mockLicense.setId(1L);
        mockLicense.setLicenseKey("TEST-KEY-123");
        mockLicense.setStatus("NOT_ACTIVATED");
        mockLicense.setExpiryDate(LocalDate.now().plusDays(30));
    }

    @Test
    void testCreateLicenseSuccess() {
        LicenseRequest request = new LicenseRequest();
        request.setProductId(100L);
        request.setUserId(200L);
        request.setMaxActivations(5);
        request.setTotalSeats(10);
        request.setExpiryDate(LocalDate.now().plusDays(365));
        request.setLicenseType(LicenseType.SUBSCRIPTION);

        when(productRepository.findById(100L)).thenReturn(Optional.of(new Product()));
        when(userRepository.findById(200L)).thenReturn(Optional.of(new User()));
        when(licenseKeyGenerator.generateKey(org.mockito.ArgumentMatchers.anyLong())).thenReturn("NEW-KEY-123");
        when(licenseRepository.existsByLicenseKey("NEW-KEY-123")).thenReturn(false);
        
        License savedLicense = new License();
        savedLicense.setLicenseKey("NEW-KEY-123");
        when(licenseRepository.save(any(License.class))).thenReturn(savedLicense);

        License result = licenseService.createLicense(request);

        assertNotNull(result);
        assertEquals("NEW-KEY-123", result.getLicenseKey());
        verify(licenseRepository, times(1)).save(any(License.class));
    }

    @Test
    void testActivateLicenseAlreadyActivated() {
        mockLicense.setStatus("ACTIVE");
        when(licenseRepository.findByLicenseKey("TEST-KEY-123")).thenReturn(Optional.of(mockLicense));

        assertThrows(ResourceConflictException.class, () -> licenseService.activateLicense("TEST-KEY-123"));
    }

    @Test
    void testActivateLicenseExpired() {
        mockLicense.setStatus("NOT_ACTIVATED");
        mockLicense.setExpiryDate(LocalDate.now().minusDays(1)); // Expired yesterday
        when(licenseRepository.findByLicenseKey("TEST-KEY-123")).thenReturn(Optional.of(mockLicense));

        assertThrows(BusinessValidationException.class, () -> licenseService.activateLicense("TEST-KEY-123"));
    }

    @Test
    void testValidateLicenseSecureInactive() {
        mockLicense.setStatus("NOT_ACTIVATED");
        when(licenseRepository.findByLicenseKey("TEST-KEY-123")).thenReturn(Optional.of(mockLicense));

        ValidationResult result = licenseService.validateLicenseSecure("TEST-KEY-123", "device1", "user@test.com");

        assertFalse(result.isValid());
        assertEquals("INACTIVE", result.getErrorCode());
    }

    @Test
    void testValidateLicenseSecureExpired() {
        mockLicense.setStatus("ACTIVE");
        mockLicense.setExpiryDate(LocalDate.now().minusDays(1));
        when(licenseRepository.findByLicenseKey("TEST-KEY-123")).thenReturn(Optional.of(mockLicense));

        ValidationResult result = licenseService.validateLicenseSecure("TEST-KEY-123", "device1", "user@test.com");

        assertFalse(result.isValid());
        assertEquals("EXPIRED", result.getErrorCode());
    }

    @Test
    void testLicenseNotFound() {
        when(licenseRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> licenseService.getLicenseById(999L));
    }
}
