package com.licensemanagement.backend.controller;
import com.licensemanagement.backend.exception.*;
import com.licensemanagement.backend.dto.LicenseRequest;
import com.licensemanagement.backend.dto.LicenseResponse;
import com.licensemanagement.backend.dto.ValidationRequest;
import com.licensemanagement.backend.dto.ValidationResult;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.service.LicenseImportService;
import com.licensemanagement.backend.service.LicenseService;
import com.licensemanagement.backend.service.UserService;
import com.licensemanagement.backend.service.NotificationService;
import com.licensemanagement.backend.util.CurrentUserProvider;
import com.licensemanagement.backend.annotation.LogAdminAction;
import com.licensemanagement.backend.util.HmacUtil;
import com.licensemanagement.backend.util.LicenseKeyEncoder;
import com.licensemanagement.backend.util.QRCodeGenerator;
import com.licensemanagement.backend.entity.Order;
import com.licensemanagement.backend.entity.Product;
import com.licensemanagement.backend.entity.LicenseAssignment;
import com.licensemanagement.backend.repository.OrderRepository;
import com.licensemanagement.backend.repository.ProductRepository;
import com.licensemanagement.backend.repository.LicenseAssignmentRepository;
import com.licensemanagement.backend.repository.DeviceRepository;
import com.licensemanagement.backend.repository.ActivationRepository;
import com.licensemanagement.backend.repository.SoftwareReleaseRepository;
import com.licensemanagement.backend.repository.CompanyRepository;
import com.licensemanagement.backend.entity.Device;
import com.licensemanagement.backend.entity.Company;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import org.springframework.web.multipart.MultipartFile;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
@RestController
@RequestMapping("/api/licenses")
@RequiredArgsConstructor
public class LicenseController {
    private final LicenseService licenseService;
    private final UserService userService;
    private final CurrentUserProvider currentUserProvider;
    private final LicenseImportService licenseImportService;  
    private final QRCodeGenerator qrCodeGenerator;  
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final LicenseAssignmentRepository licenseAssignmentRepository;
    private final DeviceRepository deviceRepository;
    private final ActivationRepository activationRepository;
    private final SoftwareReleaseRepository softwareReleaseRepository;
    private final CompanyRepository companyRepository;
    private final NotificationService notificationService;
    private final org.springframework.cache.CacheManager cacheManager;
    
    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;
    @PostMapping
    @PreAuthorize("hasAnyRole('COMPANY', 'ADMIN')")
    public ResponseEntity<License> createLicense(@Valid @RequestBody LicenseRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser.getRole().equals("COMPANY")) {
            request.setCompanyId(currentUser.getCompanyId());
        } else if (request.getCompanyId() == null) {
            Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
            request.setCompanyId(product.getCompanyId() != null ? product.getCompanyId() : 1L);
        }
        return new ResponseEntity<>(licenseService.createLicense(request), HttpStatus.CREATED);
    }

    @PostMapping("/purchase")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'COMPANY', 'BULK_BUYER')")
    public ResponseEntity<License> purchaseLicense(@RequestParam Long productId, @RequestParam Integer quantity) {
        User currentUser = currentUserProvider.getCurrentUser();
        
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
            
        boolean isBulk = currentUser.getRole().equals("BULK_BUYER") || currentUser.getRole().equals("COMPANY");
        
        LicenseRequest request = LicenseRequest.builder()
                .productId(productId)
                .userId(currentUser.getId()) // The purchaser
                .companyId(product.getCompanyId() != null ? product.getCompanyId() : 1L)
                .licenseType(isBulk ? com.licensemanagement.backend.enums.LicenseType.VOLUME : com.licensemanagement.backend.enums.LicenseType.SUBSCRIPTION)
                .maxActivations(quantity)
                .totalSeats(quantity)
                .expiryDate(LocalDate.now().plusYears(1))
                .build();
                
        License createdLicense = licenseService.createLicense(request);
        
        // Create Order
        BigDecimal amount = product.getPrice() != null ? BigDecimal.valueOf(product.getPrice()).multiply(new BigDecimal(quantity)) : BigDecimal.ZERO;
        
        Order order = Order.builder()
            .userId(currentUser.getId())
            .companyId(currentUser.getCompanyId())
            .productId(productId)
            .licenseId(createdLicense.getId())
            .quantity(quantity)
            .amount(amount)
            .status("COMPLETED") // Immediately mark completed for now
            .orderNumber("ORD-" + LocalDateTime.now().getYear() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
            .build();
            
        orderRepository.save(order);

        try {
            notificationService.sendNotification(
                currentUser,
                "purchases",
                "PURCHASE_SUCCESS",
                "Purchase Successful",
                "Successfully purchased " + quantity + " license seat(s) for " + product.getName() + " (" + order.getOrderNumber() + ").",
                "/bulk-buyer/licenses",
                null
            );
        } catch (Exception e) {
            // Non-blocking
        }
                
        return new ResponseEntity<>(createdLicense, HttpStatus.CREATED);
    }
    @GetMapping
    public ResponseEntity<Page<LicenseResponse>> getAllLicenses(Pageable pageable) {
        User currentUser = currentUserProvider.getCurrentUser();
        Page<LicenseResponse> licenses;
        if (currentUser.getRole().equals("ADMIN")) {
            licenses = licenseService.getAllLicenses(pageable);
        } else if (currentUser.getRole().equals("COMPANY")) {
            licenses = licenseService.getLicensesByCompany(currentUser.getCompanyId(), pageable);
        } else {
            // CUSTOMER and BULK_BUYER fetch their own purchased licenses via userId
            licenses = licenseService.getLicensesByUser(currentUser.getId(), pageable);
        }
        return ResponseEntity.ok(licenses);
    }

    /**
     * Returns all licenses visible to the current CUSTOMER:
     * - Directly owned licenses (userId = currentUser.id)
     * - Licenses actively assigned to them via LicenseAssignment table
     * This is the endpoint the Customer Dashboard and desktop app use.
     */
    @GetMapping("/my-licenses")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> getMyLicenses() {
        User currentUser = currentUserProvider.getCurrentUser();
        List<Map<String, Object>> result = new java.util.ArrayList<>();

        // 1. Directly owned licenses
        List<License> ownedLicenses = licenseService.getLicensesByUser(currentUser.getId());
        for (License lic : ownedLicenses) {
            Map<String, Object> entry = buildLicenseMap(lic, null, false, currentUser);
            result.add(entry);
        }

        // 2. Licenses assigned to the current user (but owned by someone else, e.g. a BULK_BUYER)
        List<LicenseAssignment> assignments = licenseAssignmentRepository.findByUserIdAndStatus(currentUser.getId(), "ACTIVE");
        for (LicenseAssignment assignment : assignments) {
            boolean alreadyOwned = ownedLicenses.stream().anyMatch(l -> l.getId().equals(assignment.getLicenseId()));
            if (!alreadyOwned) {
                License lic = licenseService.getLicenseById(assignment.getLicenseId());
                Map<String, Object> entry = buildLicenseMap(lic, assignment, true, currentUser);
                result.add(entry);
            }
        }

        return ResponseEntity.ok(result);
    }

    private Map<String, Object> buildLicenseMap(License lic, LicenseAssignment assignment, boolean isAssigned, User currentUser) {
        Map<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("id", lic.getId());
        // Do not expose raw license key to assigned (non-owner) users
        if (!isAssigned) {
            map.put("licenseKey", lic.getLicenseKey());
        }
        map.put("productId", lic.getProductId());
        String prodName = lic.getProduct() != null ? lic.getProduct().getName() :
                productRepository.findById(lic.getProductId()).map(Product::getName).orElse("Software License");
        map.put("productName", prodName);
        map.put("licenseType", lic.getLicenseType());
        map.put("status", lic.getStatus());
        map.put("issuedDate", lic.getIssuedDate());
        map.put("expiryDate", lic.getExpiryDate());

        // Count active device activations for this specific user
        List<Device> userDevices = deviceRepository.findByUserId(currentUser.getId());
        long userActiveDevices = userDevices.stream()
                .filter(d -> activationRepository.existsByLicenseIdAndDeviceIdAndIsActiveTrue(lic.getId(), d.getId()))
                .count();
        map.put("currentActivations", userActiveDevices);
        map.put("maxActivations", isAssigned ? 1 : (lic.getMaxActivations() != null ? lic.getMaxActivations() : 1));

        // Check if software release exists for this product
        softwareReleaseRepository.findFirstByProductIdOrderByReleaseDateDesc(lic.getProductId())
                .ifPresent(rel -> {
                    map.put("hasRelease", true);
                    map.put("releaseId", rel.getId());
                    map.put("releaseVersion", rel.getVersion());
                    map.put("distributionMethod", rel.getDistributionMethod());
                    map.put("downloadUrl", rel.getDownloadUrl());
                    map.put("releaseFileName", rel.getOriginalFilename());
                });

        map.put("totalSeats", lic.getTotalSeats());
        map.put("usedSeats", lic.getUsedSeats());
        map.put("isAssigned", isAssigned);
        if (isAssigned && assignment != null) {
            map.put("assignedAt", assignment.getAssignedAt());
            map.put("assignmentId", assignment.getId());
        }
        // Assigned-by company name
        if (isAssigned) {
            String compName = "Your Company";
            if (lic.getCompany() != null && lic.getCompany().getName() != null) {
                compName = lic.getCompany().getName();
            } else if (lic.getCompanyId() != null) {
                compName = companyRepository.findById(lic.getCompanyId()).map(Company::getName).orElse("Your Company");
            }
            map.put("assignedByCompany", compName);
        }
        return map;
    }
    @GetMapping("/{id}")
    public ResponseEntity<License> getLicenseById(@PathVariable Long id) {
        License license = licenseService.getLicenseById(id);
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser.getRole().equals("ADMIN")) {
            return ResponseEntity.ok(license);
        }
        if (currentUser.getRole().equals("COMPANY")) {
            Long licenseCompanyId = license.getCompanyId();
            Long userCompanyId = currentUser.getCompanyId();
            if (licenseCompanyId == null) {
                return ResponseEntity.ok(license);
            }
            if (!licenseCompanyId.equals(userCompanyId)) {
                throw new ForbiddenException("Access denied! You can only view your own licenses.");
            }
        }
        if (currentUser.getRole().equals("CUSTOMER") || currentUser.getRole().equals("BULK_BUYER")) {
            Long licenseUserId = license.getUserId();
            Long currentUserId = currentUser.getId();
            if (licenseUserId == null) {
                throw new BusinessValidationException("License has no user assigned.");
            }
            if (!licenseUserId.equals(currentUserId)) {
                throw new ForbiddenException("Access denied! You can only view your own licenses.");
            }
        }
        return ResponseEntity.ok(license);
    }
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<License>> getLicensesByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(licenseService.getLicensesByUser(userId));
    }
    @GetMapping("/company/{companyId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<License>> getLicensesByCompany(@PathVariable Long companyId) {
        return ResponseEntity.ok(licenseService.getLicensesByCompany(companyId));
    }
    @GetMapping("/validate/{licenseKey}")
    public ResponseEntity<Boolean> validateLicense(@PathVariable String licenseKey) {
        boolean isValid = licenseService.validateLicense(licenseKey);
        return ResponseEntity.ok(isValid);
    }
    @GetMapping("/{id}/qrcode")
    @PreAuthorize("hasAnyRole('COMPANY', 'ADMIN', 'CUSTOMER', 'BULK_BUYER')")
    public ResponseEntity<byte[]> generateQRCode(@PathVariable Long id) throws Exception {
        User currentUser = currentUserProvider.getCurrentUser();
        License license = licenseService.getLicenseById(id);
        if (!currentUser.getRole().equals("ADMIN") &&
                !license.getUserId().equals(currentUser.getId()) &&
                !license.getCompanyId().equals(currentUser.getCompanyId())) {
            throw new ForbiddenException("Access denied!");
        }
        byte[] qrCode = licenseService.generateQRCodeForLicense(id);
        return ResponseEntity.ok()
                .header("Content-Type", "image/png")
                .header("Content-Disposition", "attachment; filename=license-" + id + ".png")
                .body(qrCode);
    }
    @GetMapping("/{id}/qrcode/secure")
    @PreAuthorize("hasAnyRole('COMPANY', 'ADMIN', 'CUSTOMER', 'BULK_BUYER')")
    public ResponseEntity<byte[]> generateSecureQRCode(@PathVariable Long id) throws Exception {
        User currentUser = currentUserProvider.getCurrentUser();
        License license = licenseService.getLicenseById(id);
        
        // Authorization Check
        if (!currentUser.getRole().equals("ADMIN") &&
                !java.util.Objects.equals(license.getUserId(), currentUser.getId()) &&
                !java.util.Objects.equals(license.getCompanyId(), currentUser.getCompanyId())) {
            throw new ForbiddenException("Access denied!");
        }
        String token = java.util.UUID.randomUUID().toString();
        org.springframework.cache.Cache qrCache = cacheManager.getCache("qrCodes");
        if (qrCache != null) {
            qrCache.put(token, license.getLicenseKey());
        }
        
        String qrUrl = "http://localhost:3000/customer/activate/qr/" + token;
        byte[] qrCode = qrCodeGenerator.generateQRCodeImage(qrUrl, 300, 300);
        return ResponseEntity.ok()
                .header("Content-Type", "image/png")
                .header("Content-Disposition", "attachment; filename=license-secure-" + id + ".png")
                .body(qrCode);
    }
    @GetMapping("/verify")
    public ResponseEntity<Map<String, Object>> verifyLicense(@RequestParam String key) {
        Map<String, Object> response = new HashMap<>();
        try {
            License license = licenseService.getLicenseByKey(key);
            response.put("valid", licenseService.validateLicense(key));
            response.put("licenseKey", license.getLicenseKey());
            response.put("status", license.getStatus());
            response.put("expiryDate", license.getExpiryDate().toString());
            response.put("issuedDate", license.getIssuedDate().toString());
            response.put("maxActivations", license.getMaxActivations());
            if ("ACTIVE".equals(license.getStatus())) {
                response.put("message", "✅ License is ACTIVE!");
                response.put("canActivate", false);
            } else if ("NOT_ACTIVATED".equals(license.getStatus())) {
                response.put("message", "⏳ License is ready to activate!");
                response.put("canActivate", true);
            } else if ("REVOKED".equals(license.getStatus())) {
                response.put("message", "❌ License has been REVOKED!");
                response.put("canActivate", false);
            } else if (license.getExpiryDate().isBefore(LocalDate.now())) {
                response.put("message", "❌ License has EXPIRED!");
                response.put("canActivate", false);
            } else {
                response.put("message", "❌ License is INVALID!");
                response.put("canActivate", false);
            }
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("valid", false);
            response.put("message", "❌ License not found!");
            response.put("canActivate", false);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }
    @PostMapping("/validate/secure")
    public ResponseEntity<ValidationResult> validateLicenseSecure(@Valid @RequestBody ValidationRequest request) {
        String expectedSignature = HmacUtil.computeSignature(
                request.getLicenseKey(),
                request.getTimestamp(),
                request.getDeviceFingerprint()
        );
        if (!expectedSignature.equals(request.getSignature())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        long now = System.currentTimeMillis();
        if (Math.abs(now - request.getTimestamp()) > 300000) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ValidationResult.builder()
                            .valid(false)
                            .errorCode("REPLAY_ATTACK")
                            .message("Request timestamp is stale.")
                            .build());
        }
        ValidationResult result = licenseService.validateLicenseSecure(
                request.getLicenseKey(),
                request.getDeviceFingerprint(),
                request.getUserEmail()
        );
        return ResponseEntity.ok(result);
    }
    @GetMapping("/activate")
    public ResponseEntity<Map<String, String>> activateLicenseFromQR(@RequestParam String key) {
        Map<String, String> response = new HashMap<>();
        try {
            String decodedKey = LicenseKeyEncoder.decodeKey(key);
            License license = licenseService.getLicenseByKey(decodedKey);
            if ("ACTIVE".equals(license.getStatus())) {
                response.put("message", "✅ License is already ACTIVE!");
                return ResponseEntity.ok(response);
            }
            if ("REVOKED".equals(license.getStatus())) {
                response.put("message", "❌ License has been REVOKED!");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            if (license.getExpiryDate().isBefore(LocalDate.now())) {
                response.put("message", "❌ License has EXPIRED!");
                return ResponseEntity.badRequest().body(response);
            }
            License activatedLicense = licenseService.activateLicense(decodedKey);
            response.put("message", "✅ License activated successfully!");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("message", "❌ Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPANY')")
    @LogAdminAction(action = "REVOKE_LICENSE")
    public ResponseEntity<Void> revokeLicense(@PathVariable Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        License license = licenseService.getLicenseById(id);
        if (currentUser.getRole().equals("COMPANY") && !currentUser.getCompanyId().equals(license.getCompanyId())) {
            throw new ForbiddenException("Access denied! You can only revoke your company's licenses.");
        }
        licenseService.revokeLicense(id);
        return ResponseEntity.noContent().build();
    }
    @PutMapping("/{id}/renew")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPANY', 'BULK_BUYER')")
    @LogAdminAction(action = "RENEW_LICENSE")
    public ResponseEntity<License> renewLicense(@PathVariable Long id, 
                                                @RequestParam String newExpiryDate,
                                                @RequestParam(required = false) Integer durationMonths) {
        User currentUser = currentUserProvider.getCurrentUser();
        License license = licenseService.getLicenseById(id);
        if (currentUser.getRole().equals("COMPANY") && !currentUser.getCompanyId().equals(license.getCompanyId())) {
            throw new ForbiddenException("Access denied! You can only renew your company's licenses.");
        }
        if (currentUser.getRole().equals("BULK_BUYER") && !currentUser.getId().equals(license.getUserId())) {
            throw new ForbiddenException("Access denied! You do not own this license.");
        }
        LocalDate expiryDate = LocalDate.parse(newExpiryDate);
        License renewed = licenseService.renewLicense(id, expiryDate);

        // When renewed by a buyer, generate an official completed Order/Invoice record
        if (currentUser.getRole().equals("BULK_BUYER") || currentUser.getRole().equals("CUSTOMER")) {
            Product product = productRepository.findById(license.getProductId()).orElse(null);
            BigDecimal unitPrice = BigDecimal.ZERO;
            if (product != null) {
                if (currentUser.getRole().equals("BULK_BUYER") && product.getBulkBuyerPrice() != null) {
                    unitPrice = product.getBulkBuyerPrice();
                } else if (product.getCustomerPrice() != null) {
                    unitPrice = product.getCustomerPrice();
                } else if (product.getPrice() != null) {
                    unitPrice = BigDecimal.valueOf(product.getPrice());
                }
            }

            int seats = license.getTotalSeats() != null ? license.getTotalSeats() : (license.getMaxActivations() != null ? license.getMaxActivations() : 1);
            double durationFactor = 1.0;
            if (durationMonths != null && durationMonths > 0) {
                durationFactor = durationMonths / 12.0;
            } else {
                long months = java.time.temporal.ChronoUnit.MONTHS.between(LocalDate.now(), expiryDate);
                if (months > 0) {
                    durationFactor = months / 12.0;
                }
            }

            BigDecimal amount = unitPrice.multiply(BigDecimal.valueOf(seats))
                    .multiply(BigDecimal.valueOf(durationFactor))
                    .setScale(2, java.math.RoundingMode.HALF_UP);

            Order order = Order.builder()
                    .userId(currentUser.getId())
                    .companyId(currentUser.getCompanyId() != null ? currentUser.getCompanyId() : license.getCompanyId())
                    .productId(license.getProductId())
                    .licenseId(license.getId())
                    .quantity(seats)
                    .amount(amount)
                    .status("COMPLETED")
                    .orderNumber("ORD-" + LocalDateTime.now().getYear() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                    .build();
            orderRepository.save(order);
        }

        return ResponseEntity.ok(renewed);
    }
    @PutMapping("/{id}/reactivate")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPANY')")
    @LogAdminAction(action = "REACTIVATE_LICENSE")
    public ResponseEntity<License> reactivateLicense(@PathVariable Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        License license = licenseService.getLicenseById(id);
        if (currentUser.getRole().equals("COMPANY") && !currentUser.getCompanyId().equals(license.getCompanyId())) {
            throw new ForbiddenException("Access denied! You can only reactivate your company's licenses.");
        }
        return ResponseEntity.ok(licenseService.reactivateLicense(id));
    }
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPANY')")
    @LogAdminAction(action = "UPDATE_LICENSE")
    public ResponseEntity<License> updateLicense(@PathVariable Long id, @Valid @RequestBody LicenseRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        License license = licenseService.getLicenseById(id);
        if (currentUser.getRole().equals("COMPANY") && !currentUser.getCompanyId().equals(license.getCompanyId())) {
            throw new ForbiddenException("Access denied! You can only update your company's licenses.");
        }
        return ResponseEntity.ok(licenseService.updateLicense(id, request));
    }
    @GetMapping("/expired")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<License>> getExpiredLicenses() {
        return ResponseEntity.ok(licenseService.getExpiredLicenses());
    }
    @GetMapping("/export/csv")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPANY')")
    public void exportLicensesCSV(jakarta.servlet.http.HttpServletResponse response) throws Exception {
        User currentUser = currentUserProvider.getCurrentUser();
        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=licenses.csv");
        if (currentUser.getRole().equals("ADMIN")) {
            licenseService.exportLicensesToCSV(response.getOutputStream());
        } else {
            licenseService.exportLicensesToCSV(currentUser.getCompanyId(), response.getOutputStream());
        }
    }
    @GetMapping("/export/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPANY')")
    public void exportLicensesPDF(jakarta.servlet.http.HttpServletResponse response) throws Exception {
        User currentUser = currentUserProvider.getCurrentUser();
        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", "attachment; filename=licenses.pdf");
        if (currentUser.getRole().equals("ADMIN")) {
            licenseService.exportLicensesToPDF(response.getOutputStream());
        } else {
            licenseService.exportLicensesToPDF(currentUser.getCompanyId(), response.getOutputStream());
        }
    }
    @GetMapping("/report")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPANY')")
    public ResponseEntity<Map<String, Object>> getLicenseReport() {
        return ResponseEntity.ok(licenseService.generateLicenseReport());
    }
    @PostMapping("/import")
    @PreAuthorize("hasRole('ADMIN')")
    @LogAdminAction(action = "IMPORT_LICENSES")
    public ResponseEntity<Map<String, Object>> importLicenses(@RequestParam("file") MultipartFile file) {
        try {
            int count = licenseImportService.importLicenses(file);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Imported " + count + " licenses successfully.");
            response.put("count", count);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Failed to import licenses: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    @PostMapping("/offline/validate")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @LogAdminAction(action = "VALIDATE_OFFLINE_FILE")
    public ResponseEntity<Map<String, Object>> validateOfflineFile(@RequestParam("file") MultipartFile file) {
        try {
            String encryptedContent = new String(file.getBytes(), java.nio.charset.StandardCharsets.UTF_8);
            Map<String, Object> response = new HashMap<>();
            response.put("valid", true);
            response.put("message", "Offline license validated successfully.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("valid", false);
            response.put("message", "Invalid offline license file: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}