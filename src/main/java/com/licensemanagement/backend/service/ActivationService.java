package com.licensemanagement.backend.service;
import com.licensemanagement.backend.exception.*;
import com.licensemanagement.backend.dto.ActivationRequest;
import java.util.Optional;
import com.licensemanagement.backend.dto.QRActivationRequest;
import com.licensemanagement.backend.dto.AutoActivationRequest;
import com.licensemanagement.backend.dto.OfflineFileRequest;
import com.licensemanagement.backend.dto.OfflineActivationPayload;
import com.licensemanagement.backend.dto.OfflineActivationResponse;
import com.licensemanagement.backend.dto.*;
import com.licensemanagement.backend.entity.Activation;
import com.licensemanagement.backend.entity.Device;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.entity.PendingQRActivation;
import com.licensemanagement.backend.entity.OfflineRequestLog;
import com.licensemanagement.backend.entity.Product;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.enums.LicenseType;
import com.licensemanagement.backend.repository.ActivationRepository;
import com.licensemanagement.backend.repository.DeviceRepository;
import com.licensemanagement.backend.repository.LicenseRepository;
import com.licensemanagement.backend.repository.LicenseAssignmentRepository;
import com.licensemanagement.backend.repository.UserRepository;
import com.licensemanagement.backend.repository.ProductRepository;
import com.licensemanagement.backend.repository.PendingQRActivationRepository;
import com.licensemanagement.backend.repository.OfflineRequestLogRepository;
import com.licensemanagement.backend.repository.UsageLogRepository;
import com.licensemanagement.backend.entity.UsageLog;
import com.licensemanagement.backend.util.CryptoUtil;
import com.licensemanagement.backend.util.QRCodeGenerator;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;
import java.security.MessageDigest;
import java.util.Base64;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.Cache;
import com.licensemanagement.backend.util.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import jakarta.servlet.http.HttpServletRequest;
@Service
@RequiredArgsConstructor
@Slf4j
public class ActivationService {
    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    private final ActivationRepository activationRepository;
    private final LicenseRepository licenseRepository;
    private final LicenseAssignmentRepository licenseAssignmentRepository;
    private final UserRepository userRepository;
    private final DeviceRepository deviceRepository;
    private final QRCodeGenerator QRCodeGenerator;
    private final ValidationService validationService;  
    private final EmailService emailService;            
    private final CurrentUserProvider currentUserProvider;
    private final RateLimitingService rateLimitingService;
    private final CryptoUtil cryptoUtil;
    private final ObjectMapper objectMapper;
    private final AnomalyDetectionService anomalyDetectionService;
    private final WebhookService webhookService;
    private final CacheManager cacheManager;
    private final ProductRepository productRepository;
    private final PendingQRActivationRepository pendingQRActivationRepository;
    private final OfflineRequestLogRepository offlineRequestLogRepository;
    private final UsageLogRepository usageLogRepository;
    private final NotificationService notificationService;
    private final ActivityLogService activityLogService;
    
    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${qr.activation.token.ttl:5m}")
    private String qrTokenTtl;

    private long getQrTokenTtlMs() {
        if (qrTokenTtl.endsWith("m")) {
            return Long.parseLong(qrTokenTtl.replace("m", "")) * 60 * 1000;
        } else if (qrTokenTtl.endsWith("s")) {
            return Long.parseLong(qrTokenTtl.replace("s", "")) * 1000;
        }
        return Long.parseLong(qrTokenTtl);
    }
    @Transactional
    public Activation activateLicense(ActivationRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        
        HttpServletRequest httpRequest = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        String ipAddress = getClientIP(httpRequest);
        
        io.github.bucket4j.Bucket bucket = rateLimitingService.resolveActivationAccountBucket(currentUser.getEmail());
        if (!bucket.tryConsume(1)) {
            throw new BusinessValidationException("Too many activation requests for this account. Try again later.");
        }
        if (!"CUSTOMER".equals(currentUser.getRole()) && !"BULK_BUYER".equals(currentUser.getRole())) {
            throw new ForbiddenException("Only customers and bulk buyers can activate licenses");
        }
        
        License license = licenseRepository.findByLicenseKey(request.getLicenseKey())
                .orElseThrow(() -> new ResourceNotFoundException("License not found: " + request.getLicenseKey()));
        
        try {
            boolean isOwner = license.getUserId().equals(currentUser.getId());
            boolean hasAssignment = licenseAssignmentRepository.existsByLicenseIdAndUserIdAndStatus(license.getId(), currentUser.getId(), "ACTIVE");
            
            if (!isOwner && !hasAssignment) {
                throw new ForbiddenException("You can only activate your own licenses or licenses assigned to you");
            }
            validationService.validateLicenseActive(license);

            Optional<Device> existingDevOpt = deviceRepository.findByMachineId(request.getMachineId());
            if (existingDevOpt.isPresent()) {
                if (Boolean.FALSE.equals(existingDevOpt.get().getIsActive())) {
                    throw new BusinessValidationException("This device has been suspended by an administrator and cannot activate licenses.");
                }
                Long existingDevId = existingDevOpt.get().getId();
                Optional<Activation> existingAct = activationRepository.findByLicenseIdAndDeviceIdAndIsActiveTrue(license.getId(), existingDevId);
                if (existingAct.isPresent()) {
                    existingDevOpt.get().setLastSeen(LocalDateTime.now());
                    deviceRepository.save(existingDevOpt.get());
                    return existingAct.get();
                }
            }

            long currentActivations = activationRepository.countByLicenseIdAndIsActiveTrue(license.getId());
            validationService.validateDeviceLimit(license, currentActivations);
            boolean isNewDevice = !existingDevOpt.isPresent();
            Device device = existingDevOpt.orElseGet(() -> {
                Device newDevice = new Device();
                newDevice.setUserId(currentUser.getId());
                newDevice.setMachineId(request.getMachineId());
                newDevice.setDeviceName(request.getDeviceName());
                newDevice.setOs(request.getOs());
                newDevice.setFingerprint(request.getMachineId());  
                newDevice.setLastSeen(LocalDateTime.now());
                newDevice.setIsActive(true);
                return deviceRepository.save(newDevice);
            });
            device.setLastSeen(LocalDateTime.now());
            deviceRepository.save(device);
            Long deviceId = device.getId();
            
            anomalyDetectionService.checkAndLogActivationAttempt(license.getLicenseKey(), ipAddress, true);
            
            license.setStatus("ACTIVE");
            licenseRepository.save(license);
            Activation activation = new Activation();
            activation.setLicenseId(license.getId());
            activation.setDeviceId(deviceId);
            activation.setActivatedAt(LocalDateTime.now());
            activation.setIsActive(true);
            Activation savedActivation = activationRepository.save(activation);
            
            // Log successful NEW activation
            UsageLog usageLog = new UsageLog();
            usageLog.setLicenseId(license.getId());
            usageLog.setDeviceId(deviceId);
            usageLog.setUserId(currentUser.getId());
            usageLog.setFeaturesUsed("Device Activated");
            usageLog.setActivationMethod("Online");
            usageLog.setIpAddress(ipAddress);
            usageLogRepository.save(usageLog);
            
            try {
                byte[] qrCode = QRCodeGenerator.generateActivationQRCode(license.getLicenseKey(), baseUrl);
                log.info("QR Code generated for license: {}", license.getLicenseKey());
            } catch (Exception e) {
                log.error("Failed to generate QR Code: {}", e.getMessage());
            }
            
            webhookService.sendCompanyAlert(license.getCompanyId(), 
                "✅ **License Activated**\nLicense Key: `" + NotificationService.maskLicenseKey(license.getLicenseKey()) + "`\nDevice: `" + device.getDeviceName() + "`");
                
            String productName = "Software Product";
            if (license.getProductId() != null) {
                productName = productRepository.findById(license.getProductId()).map(Product::getName).orElse("Software Product");
            }
            if (activityLogService != null && license.getCompanyId() != null) {
                activityLogService.logAction(
                    license.getCompanyId(),
                    "LICENSE_ACTIVATED",
                    "License activated on device '" + device.getDeviceName() + "' (" + (device.getOs() != null ? device.getOs() : "Unknown OS") + ") for product " + productName,
                    currentUser.getId(),
                    license.getId()
                );
            }
            String maskedKey = NotificationService.maskLicenseKey(license.getLicenseKey());
            final String finalProductName = productName;

            // 1. Dispatch License Activation Notification (respects activation & email preferences)
            try {
                notificationService.sendNotification(
                        currentUser,
                        "activation",
                        "LICENSE_ACTIVATION",
                        "License Activated",
                        "Your license for " + finalProductName + " (" + maskedKey + ") was successfully activated on " + device.getDeviceName() + ".",
                        "/licenses",
                        () -> emailService.sendActivationEmail(currentUser, license, finalProductName)
                );

                // Also notify vendor company if enabled in company notifications
                if (license.getCompanyId() != null) {
                    notificationService.notifyCompany(
                            license.getCompanyId(),
                            "activation",
                            "LICENSE_ACTIVATION",
                            "License Activated",
                            "Device '" + device.getDeviceName() + "' activated license (" + maskedKey + ") for " + finalProductName + " (" + currentUser.getFullName() + ").",
                            "/company-licenses"
                    );
                }
            } catch (Exception notifEx) {
                log.error("Failed to dispatch license activation notification: {}", notifEx.getMessage());
            }

            // 2. Dispatch Device Activation Notification if a new device was registered
            if (isNewDevice) {
                try {
                    notificationService.sendNotification(
                            currentUser,
                            "deviceActivation",
                            "DEVICE_ACTIVATION",
                            "New Device Connected",
                            "A new device '" + device.getDeviceName() + "' was activated on " + finalProductName + " (" + maskedKey + ").",
                            "/licenses",
                            () -> emailService.sendDeviceActivationEmail(currentUser, device, finalProductName, maskedKey)
                    );
                } catch (Exception devNotifEx) {
                    log.error("Failed to dispatch device activation notification: {}", devNotifEx.getMessage());
                }
            }

            return savedActivation;
        } catch (Exception e) {
            anomalyDetectionService.checkAndLogActivationAttempt(license.getLicenseKey(), ipAddress, false);
            try {
                String maskedKey = NotificationService.maskLicenseKey(license.getLicenseKey());
                String reason = e.getMessage() != null ? e.getMessage() : "Activation failed";
                notificationService.sendNotification(
                        currentUser,
                        "failedActivation",
                        "FAILED_ACTIVATION",
                        "Failed Activation Attempt",
                        "An activation attempt for license (" + maskedKey + ") failed: " + reason,
                        "/licenses",
                        () -> emailService.sendFailedActivationEmail(currentUser, maskedKey, reason)
                );
                notificationService.notifyAdmins(
                        "failedActivations",
                        "FAILED_ACTIVATION",
                        "License Activation Failed",
                        "Failed activation attempt for license " + maskedKey + ": " + reason,
                        "/dashboard/activations"
                );
            } catch (Exception notifEx) {
                log.warn("Could not dispatch failed activation notification: {}", notifEx.getMessage());
            }
            throw e;
        }
    }

    public com.licensemanagement.backend.dto.LicenseInfoResponse getQRTokenInfo(String token) {
        Cache qrCache = cacheManager.getCache("qrCodes");
        if (qrCache == null) throw new IllegalStateException("Cache error");
        
        String licenseKey = qrCache.get(token, String.class);
        if (licenseKey == null) {
            throw new BusinessValidationException("QR token is invalid or has expired.");
        }
        
        License license = licenseRepository.findByLicenseKey(licenseKey)
                .orElseThrow(() -> new ResourceNotFoundException("License not found"));
                
        User currentUser = currentUserProvider.getCurrentUser();
        boolean isOwner = license.getUserId().equals(currentUser.getId());
        boolean hasAssignment = licenseAssignmentRepository.existsByLicenseIdAndUserIdAndStatus(license.getId(), currentUser.getId(), "ACTIVE");
        if (!isOwner && !hasAssignment && !currentUser.getRole().equals("ADMIN")) {
            throw new ForbiddenException("You can only access information for your own licenses.");
        }
        
        return new com.licensemanagement.backend.dto.LicenseInfoResponse(
                license.getProduct() != null ? license.getProduct().getName() : "Unknown Product",
                license.getLicenseType().name(),
                license.getStatus()
        );
    }

    @Transactional
    public Activation activateLicenseViaQR(QRActivationRequest request) {
        Cache qrCache = cacheManager.getCache("qrCodes");
        if (qrCache == null) throw new IllegalStateException("Cache error");
        
        String licenseKey = qrCache.get(request.getQrToken(), String.class);
        if (licenseKey == null) {
            throw new BusinessValidationException("QR token is invalid, has expired, or has already been used.");
        }
        
        // Call standard activation logic
        ActivationRequest standardRequest = new ActivationRequest();
        standardRequest.setLicenseKey(licenseKey);
        standardRequest.setDeviceName(request.getDeviceName());
        standardRequest.setMachineId(request.getMachineId());
        standardRequest.setOs(request.getOs());
        
        Activation activation = activateLicense(standardRequest);
        
        // Evict only upon successful activation
        qrCache.evict(request.getQrToken());
        
        return activation;
    }

    public List<Activation> getActivationsByLicense(Long licenseId) {
        User currentUser = currentUserProvider.getCurrentUser();
        License license = licenseRepository.findById(licenseId)
                .orElseThrow(() -> new ResourceNotFoundException("License not found"));
        boolean isAdmin = "ADMIN".equals(currentUser.getRole());
        boolean isOwner = currentUser.getId().equals(license.getUserId());
        boolean isCompanyOwner = "COMPANY".equals(currentUser.getRole()) && currentUser.getCompanyId() != null && currentUser.getCompanyId().equals(license.getCompanyId());
        if (!isAdmin && !isOwner && !isCompanyOwner) {
            throw new ForbiddenException("You can only view your own license activations");
        }
        return activationRepository.findByLicenseIdWithDevice(licenseId);
    }

    public List<CompanyActivationResponse> getCompanyActivations(Long companyId) {
        List<Activation> activations = activationRepository.findByCompanyIdWithDetails(companyId);
        return activations.stream().map(act -> {
            License lic = act.getLicense();
            Device dev = act.getDevice();
            String prodName = "Software Product";
            if (lic != null && lic.getProductId() != null) {
                prodName = productRepository.findById(lic.getProductId()).map(Product::getName).orElse("Software Product");
            }
            User cust = null;
            if (lic != null && lic.getUserId() != null) {
                cust = userRepository.findById(lic.getUserId()).orElse(null);
            }
            String custName = cust != null ? (cust.getFullName() != null && !cust.getFullName().isEmpty() ? cust.getFullName() : cust.getUsername()) : "Unknown";
            String custEmail = cust != null ? cust.getEmail() : null;

            String rawKey = lic != null ? lic.getLicenseKey() : null;
            String masked = NotificationService.maskLicenseKey(rawKey);

            return CompanyActivationResponse.builder()
                    .id(act.getId())
                    .licenseId(act.getLicenseId())
                    .maskedLicenseKey(masked)
                    .productId(lic != null ? lic.getProductId() : null)
                    .productName(prodName)
                    .deviceId(act.getDeviceId())
                    .deviceName(dev != null ? dev.getDeviceName() : "Unknown Device")
                    .machineId(dev != null ? dev.getMachineId() : "N/A")
                    .os(dev != null ? dev.getOs() : "Unknown OS")
                    .ipAddress(dev != null ? dev.getIpAddress() : null)
                    .customerId(lic != null ? lic.getUserId() : null)
                    .customerName(custName)
                    .customerEmail(custEmail)
                    .isActive(act.getIsActive())
                    .status(Boolean.TRUE.equals(act.getIsActive()) ? "ACTIVE" : "DEACTIVATED")
                    .activatedAt(act.getActivatedAt())
                    .deactivatedAt(act.getDeactivatedAt())
                    .lastSeen(dev != null ? dev.getLastSeen() : null)
                    .expiryDate(lic != null ? lic.getExpiryDate() : null)
                    .activationMethod("Online")
                    .build();
        }).collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public Activation deactivateActivation(Long activationId, User currentUser) {
        Activation activation = activationRepository.findById(activationId)
                .orElseThrow(() -> new ResourceNotFoundException("Activation not found with id: " + activationId));
        
        License license = licenseRepository.findById(activation.getLicenseId())
                .orElseThrow(() -> new ResourceNotFoundException("Associated license not found"));

        if (!"ADMIN".equals(currentUser.getRole())) {
            if ("COMPANY".equals(currentUser.getRole())) {
                if (!currentUser.getCompanyId().equals(license.getCompanyId())) {
                    throw new ForbiddenException("Access denied! You can only manage activations for your company's licenses.");
                }
            } else if (!currentUser.getId().equals(license.getUserId())) {
                throw new ForbiddenException("Access denied! You can only deactivate your own activations.");
            }
        }

        activation.setIsActive(false);
        activation.setDeactivatedAt(LocalDateTime.now());
        Activation saved = activationRepository.save(activation);

        if (license.getCompanyId() != null && activityLogService != null) {
            Device dev = deviceRepository.findById(activation.getDeviceId()).orElse(null);
            String devName = dev != null ? dev.getDeviceName() : "Device";
            activityLogService.logAction(
                license.getCompanyId(),
                "ACTIVATION_DEACTIVATED",
                "Deactivated device '" + devName + "' on license LIC-" + license.getId(),
                currentUser.getId(),
                license.getId()
            );
        }

        return saved;
    }
    
    public List<Activation> getAllActivations() {
        User currentUser = currentUserProvider.getCurrentUser();
        if (!"ADMIN".equals(currentUser.getRole())) {
            throw new ForbiddenException("Only administrators can view all activations globally");
        }
        return activationRepository.findAllWithDetails();
    }
    
    @Transactional
    public Activation deactivateLicense(Long activationId) {
        Activation activation = activationRepository.findById(activationId)
                .orElseThrow(() -> new ResourceNotFoundException("Activation not found"));
        activation.setIsActive(false);
        activation.setDeactivatedAt(LocalDateTime.now());
        return activationRepository.save(activation);
    }
    public Activation getActivationById(Long id) {
        return activationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activation not found with id: " + id));
    }

    @Transactional
    public void deleteActivation(Long activationId) {
        User currentUser = currentUserProvider.getCurrentUser();
        if (!"ADMIN".equals(currentUser.getRole())) {
            throw new ForbiddenException("Only administrators can delete activations");
        }
        Activation activation = activationRepository.findById(activationId)
                .orElseThrow(() -> new ResourceNotFoundException("Activation not found"));
        activationRepository.delete(activation);
    }

    @Transactional
    public OfflineActivationResponse generateOfflineActivationPayload(ActivationRequest request) {
        Activation activation = activateLicense(request);
        return buildOfflineResponse(activation);
    }

    @Transactional
    public OfflineActivationResponse autoActivate(AutoActivationRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        
        HttpServletRequest httpRequest = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        String ipAddress = getClientIP(httpRequest);
        
        io.github.bucket4j.Bucket bucket = rateLimitingService.resolveActivationAccountBucket(currentUser.getEmail());
        if (!bucket.tryConsume(1)) {
            throw new BusinessValidationException("Too many activation requests for this account. Try again later.");
        }
        if (!"CUSTOMER".equals(currentUser.getRole()) && !"BULK_BUYER".equals(currentUser.getRole())) {
            throw new ForbiddenException("Only customers and bulk buyers can activate licenses");
        }

        List<License> userLicenses = licenseRepository.findByUserId(currentUser.getId());
        License targetLicense = null;
        
        // Filter by Product ID and find an available license owned by user
        for (License license : userLicenses) {
            if (!license.getProductId().equals(request.getProductId())) {
                continue;
            }
            if ("ACTIVE".equals(license.getStatus()) || "NOT_ACTIVATED".equals(license.getStatus())) {
                // Check if expiry date is valid (except for OPEN_SOURCE)
                if (license.getLicenseType() == LicenseType.OPEN_SOURCE || 
                   (license.getExpiryDate() != null && !license.getExpiryDate().isBefore(LocalDate.now()))) {
                    
                    java.util.Optional<Device> optDev = deviceRepository.findByMachineId(request.getMachineId());
                    if (optDev.isPresent() && activationRepository.existsByLicenseIdAndDeviceIdAndIsActiveTrue(license.getId(), optDev.get().getId())) {
                        targetLicense = license;
                        break;
                    }

                    if (license.getLicenseType() == LicenseType.OPEN_SOURCE) {
                        targetLicense = license;
                        break; // Open Source has no limits, pick immediately
                    }
                    
                    long currentActivations = activationRepository.countByLicenseIdAndIsActiveTrue(license.getId());
                    if (currentActivations < license.getMaxActivations()) {
                        targetLicense = license;
                        break;
                    }
                }
            }
        }
        
        // If not found in owned licenses, check assigned licenses
        if (targetLicense == null) {
            List<com.licensemanagement.backend.entity.LicenseAssignment> assignments = licenseAssignmentRepository.findByUserId(currentUser.getId());
            for (com.licensemanagement.backend.entity.LicenseAssignment assignment : assignments) {
                if (!"ACTIVE".equals(assignment.getStatus())) continue;
                
                License license = assignment.getLicense();
                if (!license.getProductId().equals(request.getProductId())) continue;
                
                if ("ACTIVE".equals(license.getStatus()) || "NOT_ACTIVATED".equals(license.getStatus())) {
                    if (license.getLicenseType() == LicenseType.OPEN_SOURCE || 
                       (license.getExpiryDate() != null && !license.getExpiryDate().isBefore(LocalDate.now()))) {
                        
                        java.util.Optional<Device> optDev = deviceRepository.findByMachineId(request.getMachineId());
                        if (optDev.isPresent() && activationRepository.existsByLicenseIdAndDeviceIdAndIsActiveTrue(license.getId(), optDev.get().getId())) {
                            targetLicense = license;
                            break;
                        }

                        if (license.getLicenseType() == LicenseType.OPEN_SOURCE) {
                            targetLicense = license;
                            break;
                        }
                        
                        long currentActivations = activationRepository.countByLicenseIdAndIsActiveTrue(license.getId());
                        if (currentActivations < license.getMaxActivations()) {
                            targetLicense = license;
                            break;
                        }
                    }
                }
            }
        }

        if (targetLicense == null) {
            throw new ResourceNotFoundException("No available active licenses found for your account.");
        }

        try {
            Device device = deviceRepository.findByMachineId(request.getMachineId())
                    .orElseGet(() -> {
                        Device newDevice = new Device();
                        newDevice.setUserId(currentUser.getId());
                        newDevice.setMachineId(request.getMachineId());
                        newDevice.setDeviceName(request.getDeviceName());
                        newDevice.setOs(request.getOs());
                        newDevice.setFingerprint(request.getMachineId());
                        newDevice.setLastSeen(LocalDateTime.now());
                        newDevice.setIsActive(true);
                        return deviceRepository.save(newDevice);
                    });
            device.setLastSeen(LocalDateTime.now());
            deviceRepository.save(device);
            Long deviceId = device.getId();

            boolean alreadyActivated = activationRepository.existsByLicenseIdAndDeviceIdAndIsActiveTrue(
                    targetLicense.getId(), deviceId
            );
            if (alreadyActivated) {
                Activation existingActivation = activationRepository.findByLicenseIdAndDeviceIdAndIsActiveTrue(targetLicense.getId(), deviceId).get();
                return buildOfflineResponseWithInfo(existingActivation, request.getInstallationId(), UUID.randomUUID().toString());
            }

            anomalyDetectionService.checkAndLogActivationAttempt(targetLicense.getLicenseKey(), ipAddress, true);

            targetLicense.setStatus("ACTIVE");
            licenseRepository.save(targetLicense);
            
            webhookService.sendCompanyAlert(targetLicense.getCompanyId(), 
                "✅ **License Auto-Activated**\nLicense Key: `" + targetLicense.getLicenseKey() + "`\nDevice: `" + device.getDeviceName() + "`");

            Activation activation = new Activation();
            activation.setLicenseId(targetLicense.getId());
            activation.setDeviceId(deviceId);
            activation.setActivatedAt(LocalDateTime.now());
            activation.setIsActive(true);
            Activation savedActivation = activationRepository.save(activation);
            
            UsageLog usageLog = new UsageLog();
            usageLog.setLicenseId(targetLicense.getId());
            usageLog.setDeviceId(deviceId);
            usageLog.setUserId(currentUser.getId());
            usageLog.setFeaturesUsed("Device Activated (Auto)");
            usageLog.setActivationMethod("Online");
            usageLog.setIpAddress(ipAddress);
            usageLogRepository.save(usageLog);
            
            String reqId = UUID.randomUUID().toString();
            return buildOfflineResponseWithInfo(savedActivation, request.getInstallationId(), reqId);
        } catch (Exception e) {
            anomalyDetectionService.checkAndLogActivationAttempt(targetLicense.getLicenseKey(), ipAddress, false);
            throw e;
        }
    }

    @Transactional
    public byte[] generateOfflineLicenseFile(OfflineFileRequest request) {
        AutoActivationRequest autoReq = new AutoActivationRequest();
        autoReq.setProductId(request.getProductId());
        autoReq.setMachineId(request.getMachineId());
        autoReq.setOs(request.getOs());
        autoReq.setDeviceName(request.getDeviceName() != null ? request.getDeviceName() : "Offline Device");
        OfflineActivationResponse response = autoActivate(autoReq);
        try {
            return objectMapper.writeValueAsBytes(response);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate license file", e);
        }
    }

    private OfflineActivationResponse buildOfflineResponse(Activation activation) {
        License license = licenseRepository.findById(activation.getLicenseId())
                .orElseThrow(() -> new ResourceNotFoundException("License not found"));
        
        try {
            OfflineActivationPayload payload = OfflineActivationPayload.builder()
                    .licenseKey(license.getLicenseKey())
                    .deviceFingerprint(deviceRepository.findById(activation.getDeviceId()).get().getMachineId())
                    .expiryDate(license.getExpiryDate().toString())
                    .productId(String.valueOf(license.getProductId()))
                    .companyId(String.valueOf(license.getCompanyId()))
                    .licenseType(license.getLicenseType().name())
                    .issuedAt(System.currentTimeMillis())
                    .build();
            
            String payloadJson = objectMapper.writeValueAsString(payload);
            String signature = cryptoUtil.sign(payloadJson);
            
            return OfflineActivationResponse.builder()
                    .payload(java.util.Base64.getEncoder().encodeToString(payloadJson.getBytes()))
                    .signature(signature)
                    .build();
        } catch (Exception e) {
            log.error("Failed to generate offline activation payload", e);
            throw new RuntimeException("Failed to generate offline activation payload", e);
        }
    }
    
    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty()) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }

    private String sha256Hash(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes("UTF-8"));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to hash string", e);
        }
    }

    @Transactional
    public QRRequestResponse requestQRActivation(QRRequestDto request) {
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        String requestId = UUID.randomUUID().toString();
        String publicToken = UUID.randomUUID().toString();
        String pollingSecret = UUID.randomUUID().toString();

        PendingQRActivation pending = PendingQRActivation.builder()
                .requestId(requestId)
                .publicApprovalTokenHash(sha256Hash(publicToken))
                .appPollingSecretHash(sha256Hash(pollingSecret))
                .productId(product.getId())
                .machineId(request.getMachineId())
                .installationId(request.getInstallationId())
                .deviceName(request.getDeviceName())
                .os(request.getOs())
                .status("PENDING")
                .expiresAt(LocalDateTime.now().plusMinutes(getQrTokenTtlMs() / 60000))
                .build();

        pendingQRActivationRepository.save(pending);

        return QRRequestResponse.builder()
                .requestId(requestId)
                .publicApprovalToken(publicToken)
                .appPollingSecret(pollingSecret)
                .approvalUrl(frontendUrl + "/customer/activate/qr/" + publicToken)
                .expiresAt(pending.getExpiresAt())
                .build();
    }

    public QRPendingInfoResponse getQRPendingInfo(String publicToken) {
        PendingQRActivation pending = pendingQRActivationRepository.findByPublicApprovalTokenHash(sha256Hash(publicToken))
                .orElseThrow(() -> new ResourceNotFoundException("Invalid or expired QR token"));
        
        if (pending.getExpiresAt().isBefore(LocalDateTime.now()) || "EXPIRED".equals(pending.getStatus())) {
            throw new BusinessValidationException("QR token has expired");
        }

        Product product = productRepository.findById(pending.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        return QRPendingInfoResponse.builder()
                .productName(product.getName())
                .deviceName(pending.getDeviceName())
                .machineId(pending.getMachineId())
                .os(pending.getOs())
                .status(pending.getStatus())
                .build();
    }

    @Transactional
    public void approveQRActivation(QRApproveRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();

        PendingQRActivation pending = pendingQRActivationRepository.findByPublicApprovalTokenHash(sha256Hash(request.getPublicApprovalToken()))
                .orElseThrow(() -> new ResourceNotFoundException("Invalid or expired QR token"));

        if (pending.getExpiresAt().isBefore(LocalDateTime.now()) || "EXPIRED".equals(pending.getStatus())) {
            throw new BusinessValidationException("QR token has expired");
        }
        if (!"PENDING".equals(pending.getStatus())) {
            throw new BusinessValidationException("QR token has already been processed");
        }

        License license = licenseRepository.findById(request.getLicenseId())
                .orElseThrow(() -> new ResourceNotFoundException("License not found"));
        
        boolean isOwner = license.getUserId().equals(currentUser.getId());
        boolean hasAssignment = licenseAssignmentRepository.existsByLicenseIdAndUserIdAndStatus(license.getId(), currentUser.getId(), "ACTIVE");
        if (!isOwner && !hasAssignment && !"ADMIN".equals(currentUser.getRole())) {
            throw new ForbiddenException("You can only activate using your own licenses or assigned licenses");
        }
        if (!license.getProductId().equals(pending.getProductId())) {
            throw new BusinessValidationException("Selected license is not for the requested product");
        }

        validationService.validateLicenseActive(license);
        long currentActivations = activationRepository.countByLicenseIdAndIsActiveTrue(license.getId());
        validationService.validateDeviceLimit(license, currentActivations);

        Device device = deviceRepository.findByMachineId(pending.getMachineId())
                .orElseGet(() -> {
                    Device newDevice = new Device();
                    newDevice.setUserId(currentUser.getId());
                    newDevice.setMachineId(pending.getMachineId());
                    newDevice.setDeviceName(pending.getDeviceName());
                    newDevice.setOs(pending.getOs());
                    newDevice.setFingerprint(pending.getMachineId());
                    newDevice.setLastSeen(LocalDateTime.now());
                    newDevice.setIsActive(true);
                    return deviceRepository.save(newDevice);
                });

        boolean alreadyActivated = activationRepository.existsByLicenseIdAndDeviceIdAndIsActiveTrue(
                license.getId(), device.getId()
        );
        if (alreadyActivated) {
            Activation existingActivation = activationRepository.findByLicenseIdAndDeviceIdAndIsActiveTrue(license.getId(), device.getId()).get();
            pending.setStatus("APPROVED");
            pending.setLicenseId(license.getId());
            pending.setActivationId(existingActivation.getId());
            pending.setApprovedAt(LocalDateTime.now());
            pendingQRActivationRepository.save(pending);
            return;
        }

        Activation activation = new Activation();
        activation.setLicenseId(license.getId());
        activation.setDeviceId(device.getId());
        activation.setActivatedAt(LocalDateTime.now());
        activation.setIsActive(true);
        Activation savedActivation = activationRepository.save(activation);

        license.setStatus("ACTIVE");
        licenseRepository.save(license);

        String ipAddress = null;
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                ipAddress = getClientIP(attrs.getRequest());
            }
        } catch (Exception ignored) {}

        UsageLog usageLog = new UsageLog();
        usageLog.setLicenseId(license.getId());
        usageLog.setDeviceId(device.getId());
        usageLog.setUserId(currentUser.getId());
        usageLog.setFeaturesUsed("Device Activated (QR)");
        usageLog.setActivationMethod("QR");
        usageLog.setIpAddress(ipAddress);
        usageLogRepository.save(usageLog);

        pending.setStatus("APPROVED");
        pending.setLicenseId(license.getId());
        pending.setActivationId(savedActivation.getId());
        pending.setApprovedAt(LocalDateTime.now());
        pendingQRActivationRepository.save(pending);
    }

    public QRPollResponse pollQRActivation(String requestId, String pollingSecret) {
        PendingQRActivation pending = pendingQRActivationRepository.findByRequestId(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));
        
        if (!pending.getAppPollingSecretHash().equals(sha256Hash(pollingSecret))) {
            throw new ForbiddenException("Invalid polling secret");
        }

        if (pending.getExpiresAt().isBefore(LocalDateTime.now()) && "PENDING".equals(pending.getStatus())) {
            pending.setStatus("EXPIRED");
            pendingQRActivationRepository.save(pending);
            return QRPollResponse.builder().status("EXPIRED").build();
        }

        if ("APPROVED".equals(pending.getStatus())) {
            Activation activation = activationRepository.findById(pending.getActivationId())
                    .orElseThrow(() -> new RuntimeException("Activation missing"));
            
            OfflineActivationResponse payload = buildOfflineResponseWithInfo(activation, pending.getInstallationId(), pending.getRequestId());
            return QRPollResponse.builder().status("APPROVED").activationResponse(payload).build();
        }

        return QRPollResponse.builder().status(pending.getStatus()).build();
    }

    @Transactional
    public byte[] processOfflineUpload(MultipartFile file, Long licenseId) {
        try {
            String content = new String(file.getBytes(), "UTF-8");
            String digest = sha256Hash(content);
            if (offlineRequestLogRepository.existsByRequestDigest(digest)) {
                throw new ResourceConflictException("This offline request file has already been processed.");
            }

            OfflineFileRequest request = objectMapper.readValue(content, OfflineFileRequest.class);

            if (request.getRequestExpiration() < System.currentTimeMillis()) {
                throw new BusinessValidationException("Offline request has expired.");
            }

            User currentUser = currentUserProvider.getCurrentUser();
            License license = licenseRepository.findById(licenseId)
                    .orElseThrow(() -> new ResourceNotFoundException("License not found"));
                    
            boolean isOwner = license.getUserId().equals(currentUser.getId());
            boolean hasAssignment = licenseAssignmentRepository.existsByLicenseIdAndUserIdAndStatus(license.getId(), currentUser.getId(), "ACTIVE");
            if (!isOwner && !hasAssignment && !"ADMIN".equals(currentUser.getRole())) {
                throw new ForbiddenException("You can only use your own licenses.");
            }
            if (!license.getProductId().equals(request.getProductId())) {
                throw new BusinessValidationException("Selected license is not compatible with this product.");
            }

            validationService.validateLicenseActive(license);
            long currentActivations = activationRepository.countByLicenseIdAndIsActiveTrue(license.getId());
            validationService.validateDeviceLimit(license, currentActivations);

            Device device = deviceRepository.findByMachineId(request.getMachineId())
                    .orElseGet(() -> {
                        Device newDevice = new Device();
                        newDevice.setUserId(currentUser.getId());
                        newDevice.setMachineId(request.getMachineId());
                        newDevice.setDeviceName(request.getDeviceName());
                        newDevice.setOs(request.getOs());
                        newDevice.setFingerprint(request.getMachineId());
                        newDevice.setLastSeen(LocalDateTime.now());
                        newDevice.setIsActive(true);
                        return deviceRepository.save(newDevice);
                    });

            device.setLastSeen(LocalDateTime.now());
            deviceRepository.save(device);

            boolean alreadyActivated = activationRepository.existsByLicenseIdAndDeviceIdAndIsActiveTrue(
                    license.getId(), device.getId()
            );
            if (alreadyActivated) {
                throw new ResourceConflictException("License already activated on this device");
            }

            Activation activation = new Activation();
            activation.setLicenseId(license.getId());
            activation.setDeviceId(device.getId());
            activation.setActivatedAt(LocalDateTime.now());
            activation.setIsActive(true);
            Activation savedActivation = activationRepository.save(activation);

            license.setStatus("ACTIVE");
            licenseRepository.save(license);
            
            UsageLog usageLog = new UsageLog();
            usageLog.setLicenseId(license.getId());
            usageLog.setDeviceId(device.getId());
            usageLog.setUserId(currentUser.getId());
            usageLog.setFeaturesUsed("Device Activated (Offline)");
            usageLog.setActivationMethod("Offline");
            usageLog.setIpAddress(null);
            usageLogRepository.save(usageLog);
            
            OfflineRequestLog log = new OfflineRequestLog();
            log.setRequestDigest(digest);
            offlineRequestLogRepository.save(log);

            OfflineActivationResponse response = buildOfflineResponseWithInfo(savedActivation, request.getInstallationId(), request.getRequestId());
            return objectMapper.writeValueAsBytes(response);

        } catch (BusinessValidationException | ResourceNotFoundException | ForbiddenException | ResourceConflictException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to process offline file upload: " + e.getMessage(), e);
        }
    }

    private OfflineActivationResponse buildOfflineResponseWithInfo(Activation activation, String installationId, String requestId) {
        License license = licenseRepository.findById(activation.getLicenseId())
                .orElseThrow(() -> new ResourceNotFoundException("License not found"));
        
        try {
            OfflineActivationPayload payload = OfflineActivationPayload.builder()
                    .licenseKey(license.getLicenseKey())
                    .deviceFingerprint(deviceRepository.findById(activation.getDeviceId()).get().getMachineId())
                    .installationId(installationId)
                    .requestId(requestId)
                    .formatVersion("1.0")
                    .keyId(cryptoUtil.getKeyId())
                    .activationStatus("ACTIVE")
                    .activationId(activation.getId())
                    .expiryDate(license.getExpiryDate() != null ? license.getExpiryDate().toString() : "PERPETUAL")
                    .productId(String.valueOf(license.getProductId()))
                    .companyId(String.valueOf(license.getCompanyId()))
                    .licenseType(license.getLicenseType().name())
                    .issuedAt(System.currentTimeMillis())
                    .build();
            
            String payloadJson = objectMapper.writeValueAsString(payload);
            String signature = cryptoUtil.sign(payloadJson);
            
            return OfflineActivationResponse.builder()
                    .payload(java.util.Base64.getEncoder().encodeToString(payloadJson.getBytes("UTF-8")))
                    .signature(signature)
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate offline activation payload", e);
        }
    }
}