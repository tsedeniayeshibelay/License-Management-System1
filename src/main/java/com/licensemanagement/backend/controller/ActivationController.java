package com.licensemanagement.backend.controller;

import com.licensemanagement.backend.dto.*;
import com.licensemanagement.backend.entity.Activation;
import com.licensemanagement.backend.service.ActivationService;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.util.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/activations")
@RequiredArgsConstructor
public class ActivationController {
    private final ActivationService activationService;
    private final CurrentUserProvider currentUserProvider;

    @PostMapping
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BULK_BUYER')")
    public ResponseEntity<Activation> activateLicense(@Valid @RequestBody ActivationRequest request) {
        return new ResponseEntity<>(activationService.activateLicense(request), HttpStatus.CREATED);
    }

    @PostMapping("/auto")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BULK_BUYER')")
    public ResponseEntity<OfflineActivationResponse> autoActivateLicense(@Valid @RequestBody AutoActivationRequest request) {
        return new ResponseEntity<>(activationService.autoActivate(request), HttpStatus.CREATED);
    }

    // --- QR Activation Endpoints ---

    @PostMapping("/qr/request")
    // Public (Installed App)
    public ResponseEntity<QRRequestResponse> requestQRActivation(@Valid @RequestBody QRRequestDto request) {
        return new ResponseEntity<>(activationService.requestQRActivation(request), HttpStatus.CREATED);
    }

    @GetMapping("/qr/info/{token}")
    // Public (Phone/Browser)
    public ResponseEntity<QRPendingInfoResponse> getQRTokenInfo(@PathVariable String token) {
        return ResponseEntity.ok(activationService.getQRPendingInfo(token));
    }

    @PostMapping("/qr/approve")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BULK_BUYER')")
    public ResponseEntity<Void> approveQRActivation(@Valid @RequestBody QRApproveRequest request) {
        activationService.approveQRActivation(request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/qr/poll/{requestId}")
    // Public (Installed App) - requires appPollingSecret via header or param
    public ResponseEntity<QRPollResponse> pollQRActivation(
            @PathVariable String requestId,
            @RequestHeader(value = "X-Polling-Secret", required = false) String headerSecret,
            @RequestParam(value = "secret", required = false) String paramSecret) {
        
        String secret = headerSecret != null ? headerSecret : paramSecret;
        if (secret == null || secret.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        return ResponseEntity.ok(activationService.pollQRActivation(requestId, secret));
    }

    @Deprecated
    @PostMapping("/qr")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BULK_BUYER')")
    public ResponseEntity<Activation> activateLicenseViaQR(@Valid @RequestBody QRActivationRequest request) {
        return new ResponseEntity<>(activationService.activateLicenseViaQR(request), HttpStatus.CREATED);
    }

    // --- Offline Activation Endpoints ---

    @PostMapping("/offline/upload")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BULK_BUYER')")
    public ResponseEntity<byte[]> uploadOfflineRequest(
            @RequestParam("file") MultipartFile file,
            @RequestParam("licenseId") Long licenseId) {
        byte[] responseFileBytes = activationService.processOfflineUpload(file, licenseId);
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData("attachment", "license.lic");
        return new ResponseEntity<>(responseFileBytes, headers, HttpStatus.CREATED);
    }

    @Deprecated
    @PostMapping("/offline")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BULK_BUYER')")
    public ResponseEntity<OfflineActivationResponse> activateLicenseOffline(@Valid @RequestBody ActivationRequest request) {
        return new ResponseEntity<>(activationService.generateOfflineActivationPayload(request), HttpStatus.CREATED);
    }

    @Deprecated
    @PostMapping("/offline/generate-file")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BULK_BUYER')")
    public ResponseEntity<byte[]> generateOfflineLicenseFile(@Valid @RequestBody OfflineFileRequest request) {
        byte[] fileBytes = activationService.generateOfflineLicenseFile(request);
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData("attachment", "license.lic");
        return new ResponseEntity<>(fileBytes, headers, HttpStatus.CREATED);
    }

    // --- Management Endpoints ---

    @GetMapping("/my-company")
    @PreAuthorize("hasRole('COMPANY')")
    public ResponseEntity<List<CompanyActivationResponse>> getCompanyActivations() {
        User currentUser = currentUserProvider.getCurrentUser();
        return ResponseEntity.ok(activationService.getCompanyActivations(currentUser.getCompanyId()));
    }

    @GetMapping("/license/{licenseId}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN', 'COMPANY')")
    public ResponseEntity<List<Activation>> getActivationsByLicense(@PathVariable Long licenseId) {
        return ResponseEntity.ok(activationService.getActivationsByLicense(licenseId));
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Activation>> getAllActivations() {
        return ResponseEntity.ok(activationService.getAllActivations());
    }

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPANY', 'CUSTOMER', 'BULK_BUYER')")
    public ResponseEntity<Void> deactivateActivation(@PathVariable Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        activationService.deactivateActivation(id, currentUser);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteActivation(@PathVariable Long id) {
        activationService.deleteActivation(id);
        return ResponseEntity.noContent().build();
    }
}