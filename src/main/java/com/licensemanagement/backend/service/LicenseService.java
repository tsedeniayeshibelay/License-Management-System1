package com.licensemanagement.backend.service;
import com.licensemanagement.backend.exception.*;
import com.licensemanagement.backend.dto.LicenseRequest;
import com.licensemanagement.backend.dto.LicenseResponse;
import com.licensemanagement.backend.dto.ValidationResult;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.Product;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.repository.LicenseRepository;
import com.licensemanagement.backend.repository.ProductRepository;
import com.licensemanagement.backend.repository.UserRepository;
import com.licensemanagement.backend.util.LicenseKeyEncoder;
import com.licensemanagement.backend.util.LicenseKeyGenerator;
import com.licensemanagement.backend.util.LicenseKeyValidator;
import com.licensemanagement.backend.util.QRCodeGenerator;
import com.licensemanagement.backend.util.ReportGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
@Service
@RequiredArgsConstructor
public class LicenseService {
    private final LicenseRepository licenseRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final LicenseKeyGenerator licenseKeyGenerator;
    private final LicenseKeyValidator licenseKeyValidator;
    private final QRCodeGenerator qrCodeGenerator;
    private final ReportGenerator reportGenerator;
    private final WebhookService webhookService;
    private final ActivityLogService activityLogService;
    
    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;
    @Transactional
    public License createLicense(LicenseRequest request) {
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        String licenseKey;
        do {
            licenseKey = licenseKeyGenerator.generateKey(request.getProductId());
        } while (licenseRepository.existsByLicenseKey(licenseKey));
        License license = new License();
        license.setLicenseKey(licenseKey);
        license.setProductId(request.getProductId());
        license.setUserId(request.getUserId());
        license.setCompanyId(request.getCompanyId());
        license.setLicenseType(request.getLicenseType());
        license.setMaxActivations(request.getMaxActivations());
        license.setTotalSeats(request.getTotalSeats());
        license.setUsedSeats(0);
        license.setIssuedDate(LocalDate.now());
        license.setExpiryDate(request.getExpiryDate());
        if (com.licensemanagement.backend.enums.LicenseType.VOLUME.equals(request.getLicenseType())) {
            license.setStatus("ACTIVE");
        } else {
            license.setStatus("NOT_ACTIVATED");
        }
        License savedLicense = licenseRepository.save(license);
        
        webhookService.sendCompanyAlert(request.getCompanyId(), 
            "💰 **New License Generated**\nProduct ID: `" + request.getProductId() + "`\nType: `" + request.getLicenseType() + "`");
            
        if (savedLicense.getCompanyId() != null) {
            activityLogService.logAction(
                savedLicense.getCompanyId(),
                "LICENSE_ISSUED",
                "Issued license LIC-" + savedLicense.getId() + " for product " + product.getName() + " (" + savedLicense.getLicenseType() + ")",
                savedLicense.getUserId(),
                savedLicense.getId()
            );
        }
            
        return savedLicense;
    }
    public Page<LicenseResponse> getAllLicenses(Pageable pageable) {
        return licenseRepository.findAll(pageable).map(this::mapToResponse);
    }
    public Page<LicenseResponse> getLicensesByUser(Long userId, Pageable pageable) {
        return licenseRepository.findByUserId(userId, pageable).map(this::mapToResponse);
    }
    public Page<LicenseResponse> getLicensesByCompany(Long companyId, Pageable pageable) {
        return licenseRepository.findByCompanyId(companyId, pageable).map(this::mapToResponse);
    }
    public List<License> getAllLicenses() {
        return licenseRepository.findAll();
    }
    public License getLicenseById(Long id) {
        return licenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("License not found with id: " + id));
    }
    @Cacheable(value = "licenses", key = "#licenseKey")
    public License getLicenseByKey(String licenseKey) {
        if (!licenseKeyValidator.isValidKey(licenseKey)) {
            throw new ResourceNotFoundException("License not found or structurally invalid: " + licenseKey);
        }
        return licenseRepository.findByLicenseKey(licenseKey)
                .orElseThrow(() -> new ResourceNotFoundException("License not found with key: " + licenseKey));
    }
    public boolean validateLicense(String licenseKey) {
        return licenseRepository.findByLicenseKey(licenseKey)
                .map(license -> "ACTIVE".equals(license.getStatus()) &&
                        !license.getExpiryDate().isBefore(LocalDate.now()))
                .orElse(false);
    }
    public ValidationResult validateLicenseSecure(String licenseKey, String deviceFingerprint, String userEmail) {
        License license = getLicenseByKey(licenseKey);
        if (!"ACTIVE".equals(license.getStatus())) {
            return ValidationResult.builder()
                    .valid(false)
                    .errorCode("INACTIVE")
                    .message("License is " + license.getStatus())
                    .build();
        }
        if (LocalDate.now().isAfter(license.getExpiryDate())) {
            return ValidationResult.builder()
                    .valid(false)
                    .errorCode("EXPIRED")
                    .message("License expired on " + license.getExpiryDate())
                    .expiryDate(license.getExpiryDate())
                    .build();
        }
        return ValidationResult.builder()
                .valid(true)
                .message("License is valid")
                .expiryDate(license.getExpiryDate())
                .licenseType(license.getLicenseType())
                .remainingSeats(license.getTotalSeats())
                .build();
    }
    public List<License> getLicensesByUser(Long userId) {
        return licenseRepository.findByUserId(userId);
    }
    public List<License> getLicensesByCompany(Long companyId) {
        return licenseRepository.findByCompanyId(companyId);
    }
    @CacheEvict(value = "licenses", allEntries = true)
    public License updateLicense(Long id, LicenseRequest request) {
        License license = getLicenseById(id);
        if (request.getExpiryDate() != null) {
            license.setExpiryDate(request.getExpiryDate());
        }
        if (request.getMaxActivations() != null) {
            license.setMaxActivations(request.getMaxActivations());
        }
        if (request.getTotalSeats() != null) {
            license.setTotalSeats(request.getTotalSeats());
        }
        if (request.getLicenseType() != null) {
            license.setLicenseType(request.getLicenseType());
        }
        return licenseRepository.save(license);
    }
    @CacheEvict(value = "licenses", allEntries = true)
    public void revokeLicense(Long id) {
        License license = getLicenseById(id);
        license.setStatus("REVOKED");
        License saved = licenseRepository.save(license);
        if (saved.getCompanyId() != null) {
            activityLogService.logAction(
                saved.getCompanyId(),
                "LICENSE_REVOKED",
                "Revoked license LIC-" + saved.getId(),
                saved.getUserId(),
                saved.getId()
            );
        }
    }
    @Transactional
    @CacheEvict(value = "licenses", allEntries = true)
    public License renewLicense(Long id, LocalDate newExpiryDate) {
        License license = getLicenseById(id);
        license.setExpiryDate(newExpiryDate);
        license.setStatus("ACTIVE");
        License saved = licenseRepository.save(license);
        if (saved.getCompanyId() != null) {
            activityLogService.logAction(
                saved.getCompanyId(),
                "LICENSE_RENEWED",
                "Renewed license LIC-" + saved.getId() + " until " + newExpiryDate,
                saved.getUserId(),
                saved.getId()
            );
        }
        return saved;
    }
    @CacheEvict(value = "licenses", allEntries = true)
    public License reactivateLicense(Long id) {
        License license = getLicenseById(id);
        if (license.getExpiryDate() != null && license.getExpiryDate().isBefore(LocalDate.now())) {
            throw new BusinessValidationException("Cannot reactivate an expired license. Please renew it with a future expiration date.");
        }
        license.setStatus("ACTIVE");
        License saved = licenseRepository.save(license);
        if (saved.getCompanyId() != null) {
            activityLogService.logAction(
                saved.getCompanyId(),
                "LICENSE_REACTIVATED",
                "Reactivated license LIC-" + saved.getId(),
                saved.getUserId(),
                saved.getId()
            );
        }
        return saved;
    }
    @CacheEvict(value = "licenses", allEntries = true)
    public License activateLicense(String licenseKey) {
        License license = getLicenseByKey(licenseKey);
        if ("ACTIVE".equals(license.getStatus())) {
            throw new ResourceConflictException("License is already activated!");
        }
        if ("REVOKED".equals(license.getStatus())) {
            throw new BusinessValidationException("License has been revoked!");
        }
        if (license.getExpiryDate().isBefore(LocalDate.now())) {
            throw new BusinessValidationException("License has expired!");
        }
        license.setStatus("ACTIVE");
        return licenseRepository.save(license);
    }
    public byte[] generateQRCodeForLicense(Long licenseId) throws Exception {
        License license = getLicenseById(licenseId);
        String encodedKey = LicenseKeyEncoder.encodeKey(license.getLicenseKey());
        return qrCodeGenerator.generateActivationQRCode(encodedKey, baseUrl);
    }
    public void exportLicensesToCSV(java.io.OutputStream outputStream) throws Exception {
        reportGenerator.exportLicensesToCSV(outputStream);
    }
    public void exportLicensesToCSV(Long companyId, java.io.OutputStream outputStream) throws Exception {
        reportGenerator.exportLicensesToCSV(companyId, outputStream);
    }
    public void exportLicensesToPDF(java.io.OutputStream outputStream) throws Exception {
        reportGenerator.exportLicensesToPDF(outputStream);
    }
    public void exportLicensesToPDF(Long companyId, java.io.OutputStream outputStream) throws Exception {
        reportGenerator.exportLicensesToPDF(companyId, outputStream);
    }
    public Map<String, Object> generateLicenseReport() {
        return reportGenerator.generateLicenseReport();
    }
    public List<License> getExpiredLicenses() {
        return licenseRepository.findByExpiryDateBefore(LocalDate.now());
    }
    private LicenseResponse mapToResponse(License license) {
        Product product = license.getProductId() != null ? productRepository.findById(license.getProductId()).orElse(null) : null;
        User user = license.getUserId() != null ? userRepository.findById(license.getUserId()).orElse(null) : null;

        String productName = product != null ? product.getName() : "Unknown Product";
        String customerName = user != null ? (user.getFullName() != null && !user.getFullName().isEmpty() ? user.getFullName() : user.getUsername()) : "Unknown";
        String customerEmail = user != null ? user.getEmail() : null;

        Map<String, Object> productMap = null;
        if (product != null) {
            productMap = Map.of(
                "id", product.getId(),
                "name", product.getName(),
                "description", product.getDescription() != null ? product.getDescription() : "",
                "status", product.getStatus() != null ? product.getStatus() : "ACTIVE"
            );
        } else if (license.getProductId() != null) {
            productMap = Map.of(
                "id", license.getProductId(),
                "name", "Unknown Product"
            );
        }

        Map<String, Object> userMap = null;
        if (user != null) {
            userMap = Map.of(
                "id", user.getId(),
                "name", customerName,
                "email", user.getEmail() != null ? user.getEmail() : "",
                "role", user.getRole() != null ? user.getRole() : ""
            );
        }

        String rawKey = license.getLicenseKey();
        String maskedKey = maskKey(rawKey);

        return LicenseResponse.builder()
                .id(license.getId())
                .licenseKey(license.getLicenseKey())
                .maskedLicenseKey(maskedKey)
                .productId(license.getProductId())
                .productName(productName)
                .product(productMap)
                .userId(license.getUserId())
                .customerName(customerName)
                .customerEmail(customerEmail)
                .user(userMap)
                .companyId(license.getCompanyId())
                .licenseType(license.getLicenseType())
                .expiryDate(license.getExpiryDate())
                .status(license.getStatus())
                .maxActivations(license.getMaxActivations())
                .totalSeats(license.getTotalSeats() != null ? license.getTotalSeats() : license.getMaxActivations())
                .usedSeats(license.getUsedSeats() != null ? license.getUsedSeats() : 0)
                .issuedDate(license.getIssuedDate())
                .build();
    }
    private String maskKey(String key) {
        if (key == null || key.length() < 8) return "••••••••";
        return key.substring(0, 4) + "-••••-••••-" + key.substring(key.length() - 4);
    }
    private String getProductName(Long productId) {
        return productRepository.findById(productId)
                .map(Product::getName)
                .orElse("Unknown");
    }
    private String getCustomerName(Long userId) {
        return userRepository.findById(userId)
                .map(User::getFullName)
                .orElse("Unknown");
    }
}