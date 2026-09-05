package com.licensemanagement.backend.controller;

import com.licensemanagement.backend.entity.SoftwareRelease;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.exception.ForbiddenException;
import com.licensemanagement.backend.service.SoftwareReleaseService;
import com.licensemanagement.backend.util.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/releases")
@RequiredArgsConstructor
public class SoftwareReleaseController {

    private final SoftwareReleaseService softwareReleaseService;
    private final CurrentUserProvider currentUserProvider;

    @PostMapping("/external")
    @PreAuthorize("hasRole('COMPANY')")
    public ResponseEntity<SoftwareRelease> createExternalRelease(@RequestBody SoftwareRelease release) {
        return ResponseEntity.ok(softwareReleaseService.createExternalRelease(release));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('COMPANY')")
    public ResponseEntity<SoftwareRelease> createLockStrataHostedRelease(
            @RequestPart("release") SoftwareRelease release,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(softwareReleaseService.createLockStrataHostedRelease(release, file));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadRelease(@PathVariable Long id) {
        // Validate authorization before returning the file resource
        // (A fully robust system would verify the user holds a license for this product)
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser == null) {
            throw new ForbiddenException("Must be logged in to download.");
        }

        Resource resource = softwareReleaseService.getReleaseResource(id);
        
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    @GetMapping("/product/{productId}/latest")
    public ResponseEntity<SoftwareRelease> getLatestRelease(@PathVariable Long productId) {
        SoftwareRelease release = softwareReleaseService.getLatestReleaseByProductId(productId);
        if (release == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(release);
    }
}
