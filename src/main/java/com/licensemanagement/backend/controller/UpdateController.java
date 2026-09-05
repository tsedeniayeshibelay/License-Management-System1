package com.licensemanagement.backend.controller;

import com.licensemanagement.backend.entity.SoftwareRelease;
import com.licensemanagement.backend.service.SoftwareReleaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/updates")
@RequiredArgsConstructor
public class UpdateController {

    private final SoftwareReleaseService softwareReleaseService;

    @GetMapping("/check")
    public ResponseEntity<SoftwareRelease> checkForUpdates(
            @RequestParam Long productId,
            @RequestParam String currentVersion,
            @RequestParam String licenseKey
    ) {
        SoftwareRelease release = softwareReleaseService.checkForUpdates(productId, currentVersion, licenseKey);
        
        if (release == null) {
            return ResponseEntity.noContent().build();
        }
        
        return ResponseEntity.ok(release);
    }

}
