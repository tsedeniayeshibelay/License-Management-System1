package com.licensemanagement.backend.service;

import com.licensemanagement.backend.entity.Activation;
import com.licensemanagement.backend.entity.Device;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.UnbindRequest;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.exception.BusinessValidationException;
import com.licensemanagement.backend.exception.ForbiddenException;
import com.licensemanagement.backend.exception.ResourceNotFoundException;
import com.licensemanagement.backend.repository.ActivationRepository;
import com.licensemanagement.backend.repository.DeviceRepository;
import com.licensemanagement.backend.repository.LicenseRepository;
import com.licensemanagement.backend.repository.UnbindRequestRepository;
import com.licensemanagement.backend.util.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.licensemanagement.backend.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UnbindRequestService {

    private final UnbindRequestRepository unbindRequestRepository;
    private final ActivationRepository activationRepository;
    private final LicenseRepository licenseRepository;
    private final DeviceRepository deviceRepository;
    private final ActivationService activationService;
    private final CurrentUserProvider currentUserProvider;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final UserRepository userRepository;

    @Transactional
    public UnbindRequest createUnbindRequest(Long deviceId, Long licenseId, String reason) {
        User currentUser = currentUserProvider.getCurrentUser();

        if (!"CUSTOMER".equals(currentUser.getRole()) && !"BULK_BUYER".equals(currentUser.getRole())) {
            throw new ForbiddenException("Only customers and bulk buyers can request to unbind devices.");
        }

        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));

        List<Activation> acts = activationRepository.findByDeviceIdAndIsActiveTrue(deviceId);
        
        // If licenseId not provided or doesn't match, find the activation owned by current user
        if (licenseId == null) {
            if (acts.isEmpty()) {
                throw new BusinessValidationException("This device has no active licenses to unbind.");
            }
            // Find activation corresponding to user's license
            Activation userAct = acts.stream()
                    .filter(a -> {
                        Optional<License> licOpt = licenseRepository.findById(a.getLicenseId());
                        return licOpt.isPresent() && currentUser.getId().equals(licOpt.get().getUserId());
                    })
                    .findFirst()
                    .orElse(acts.get(0));
            licenseId = userAct.getLicenseId();
        }

        License license = licenseRepository.findById(licenseId)
                .orElseThrow(() -> new ResourceNotFoundException("License not found"));
        
        // Verify user either owns the license OR owns the device
        boolean ownsLicense = currentUser.getId().equals(license.getUserId());
        boolean ownsDevice = currentUser.getId().equals(device.getUserId());
        if (!ownsLicense && !ownsDevice) {
            throw new ForbiddenException("Access denied: You do not own this license or device.");
        }

        // Return existing pending request if already submitted
        Optional<UnbindRequest> pendingRequest = unbindRequestRepository.findByDeviceIdAndLicenseIdAndStatus(deviceId, licenseId, "PENDING");
        if (pendingRequest.isPresent()) {
            return pendingRequest.get();
        }

        UnbindRequest request = new UnbindRequest();
        request.setDeviceId(deviceId);
        request.setLicenseId(licenseId);
        request.setUserId(currentUser.getId());
        request.setReason(reason != null && !reason.trim().isEmpty() ? reason : "Hardware unbind requested by user");
        request.setStatus("PENDING");
        request = unbindRequestRepository.save(request);

        try {
            String devName = device.getDeviceName();
            String userDisplay = currentUser.getFullName() != null && !currentUser.getFullName().isBlank()
                    ? currentUser.getFullName()
                    : currentUser.getUsername();
            notificationService.notifyAdmins(
                    "unbindRequests",
                    "UNBIND_REQUEST",
                    "New Unbind Request",
                    "User '" + userDisplay + "' requested hardware unbind for device '" + devName + "'.",
                    "/dashboard/unbind-requests"
            );
        } catch (Exception ignored) {}
        
        return request;
    }

    public List<UnbindRequest> getPendingRequests() {
        return unbindRequestRepository.findAll();
    }

    public List<UnbindRequest> getMyRequests() {
        User currentUser = currentUserProvider.getCurrentUser();
        return unbindRequestRepository.findByUserId(currentUser.getId());
    }

    @Transactional
    public UnbindRequest approveRequest(Long requestId) {
        UnbindRequest request = unbindRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Unbind request not found"));

        if (!"PENDING".equals(request.getStatus())) {
            throw new BusinessValidationException("Request is not pending.");
        }

        // Find and deactivate the activation if still active
        Optional<Activation> optAct = activationRepository.findByLicenseIdAndDeviceIdAndIsActiveTrue(request.getLicenseId(), request.getDeviceId());
        if (optAct.isPresent()) {
            activationService.deactivateLicense(optAct.get().getId());
        }

        request.setStatus("APPROVED");
        request.setResolvedAt(LocalDateTime.now());
        UnbindRequest saved = unbindRequestRepository.save(request);

        notifyUnbindResolution(saved, "APPROVED");
        return saved;
    }

    @Transactional
    public UnbindRequest rejectRequest(Long requestId) {
        UnbindRequest request = unbindRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Unbind request not found"));

        if (!"PENDING".equals(request.getStatus())) {
            throw new BusinessValidationException("Request is not pending.");
        }

        request.setStatus("REJECTED");
        request.setResolvedAt(LocalDateTime.now());
        UnbindRequest saved = unbindRequestRepository.save(request);

        notifyUnbindResolution(saved, "REJECTED");
        return saved;
    }

    @Transactional
    public void deleteRequest(Long requestId) {
        unbindRequestRepository.deleteById(requestId);
    }

    private void notifyUnbindResolution(UnbindRequest request, String status) {
        try {
            User targetUser = request.getUser();
            if (targetUser == null && request.getUserId() != null) {
                targetUser = userRepository.findById(request.getUserId()).orElse(null);
            }
            if (targetUser == null) {
                return;
            }

            String deviceName = request.getDevice() != null ? request.getDevice().getDeviceName() : "Device";
            String licenseKey = request.getLicense() != null ? request.getLicense().getLicenseKey() : "";
            if (licenseKey.isBlank() && request.getLicenseId() != null) {
                licenseKey = licenseRepository.findById(request.getLicenseId()).map(License::getLicenseKey).orElse("");
            }
            String maskedKey = NotificationService.maskLicenseKey(licenseKey);

            boolean isApproved = "APPROVED".equalsIgnoreCase(status);
            String title = isApproved ? "Unbind Request Approved" : "Unbind Request Rejected";
            String message = isApproved
                    ? "Your unbind request for device '" + deviceName + "' on license (" + maskedKey + ") has been approved. You may now activate this license on a new device."
                    : "Your unbind request for device '" + deviceName + "' on license (" + maskedKey + ") was rejected by administrator.";

            User recipient = targetUser;
            notificationService.sendNotification(
                    recipient,
                    "unbindUpdates",
                    "UNBIND_UPDATE",
                    title,
                    message,
                    "/licenses",
                    () -> emailService.sendUnbindStatusEmail(recipient, deviceName, maskedKey, status)
            );
        } catch (Exception e) {
            log.error("Failed to notify user for unbind request {}: {}", request.getId(), e.getMessage());
        }
    }
}
