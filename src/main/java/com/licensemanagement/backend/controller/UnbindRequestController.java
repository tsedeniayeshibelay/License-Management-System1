package com.licensemanagement.backend.controller;

import com.licensemanagement.backend.dto.UnbindSubmitRequest;
import com.licensemanagement.backend.entity.UnbindRequest;
import com.licensemanagement.backend.service.UnbindRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UnbindRequestController {

    private final UnbindRequestService unbindRequestService;

    @PostMapping("/devices/{deviceId}/unbind")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BULK_BUYER')")
    public ResponseEntity<UnbindRequest> submitUnbindRequest(
            @PathVariable Long deviceId,
            @RequestBody(required = false) UnbindSubmitRequest request) {
        String reason = (request != null && request.getReason() != null) ? request.getReason() : "User requested hardware unbind";
        Long licenseId = (request != null) ? request.getLicenseId() : null;
        return ResponseEntity.ok(unbindRequestService.createUnbindRequest(deviceId, licenseId, reason));
    }

    @GetMapping("/unbind-requests/my-requests")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BULK_BUYER')")
    public ResponseEntity<List<UnbindRequest>> getMyUnbindRequests() {
        return ResponseEntity.ok(unbindRequestService.getMyRequests());
    }

    @GetMapping("/admin/unbind-requests")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UnbindRequest>> getPendingRequests() {
        return ResponseEntity.ok(unbindRequestService.getPendingRequests());
    }

    @PostMapping("/admin/unbind-requests/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UnbindRequest> approveRequest(@PathVariable Long id) {
        return ResponseEntity.ok(unbindRequestService.approveRequest(id));
    }

    @PostMapping("/admin/unbind-requests/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UnbindRequest> rejectRequest(@PathVariable Long id) {
        return ResponseEntity.ok(unbindRequestService.rejectRequest(id));
    }

    @DeleteMapping("/admin/unbind-requests/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteRequest(@PathVariable Long id) {
        unbindRequestService.deleteRequest(id);
        return ResponseEntity.noContent().build();
    }
}
