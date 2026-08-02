package com.licensemanagement.backend.service;

import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.SoftwareRelease;
import com.licensemanagement.backend.exception.BusinessValidationException;
import com.licensemanagement.backend.exception.ForbiddenException;
import com.licensemanagement.backend.exception.ResourceNotFoundException;
import com.licensemanagement.backend.repository.LicenseRepository;
import com.licensemanagement.backend.repository.SoftwareReleaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class SoftwareReleaseService {

    private final SoftwareReleaseRepository softwareReleaseRepository;
    private final LicenseRepository licenseRepository;
    private final StorageService storageService;

    public SoftwareRelease createExternalRelease(SoftwareRelease release) {
        release.setDistributionMethod("EXTERNAL");
        return softwareReleaseRepository.save(release);
    }
    
    public SoftwareRelease createLockStrataHostedRelease(SoftwareRelease release, org.springframework.web.multipart.MultipartFile file) {
        release.setDistributionMethod("LOCKSTRATA");
        release.setOriginalFilename(file.getOriginalFilename());
        release.setMimeType(file.getContentType());
        release.setFileSize(file.getSize());
        release.setSha256Hash(storageService.calculateSha256(file));
        
        String internalFilename = java.util.UUID.randomUUID().toString() + "-" + file.getOriginalFilename();
        String path = storageService.store(file, internalFilename);
        release.setInternalStoragePath(internalFilename);
        
        return softwareReleaseRepository.save(release);
    }

    public org.springframework.core.io.Resource getReleaseResource(Long releaseId) {
        SoftwareRelease release = softwareReleaseRepository.findById(releaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Release not found."));
        if (!"LOCKSTRATA".equals(release.getDistributionMethod())) {
            throw new BusinessValidationException("This release is not hosted by LockStrata.");
        }
        return storageService.loadAsResource(release.getInternalStoragePath());
    }

    public SoftwareRelease checkForUpdates(Long productId, String currentVersion, String licenseKey) {
        License license = licenseRepository.findByLicenseKey(licenseKey)
                .orElseThrow(() -> new ResourceNotFoundException("License not found."));

        if (!license.getProductId().equals(productId)) {
            throw new BusinessValidationException("License key does not belong to this product.");
        }

        if (!"ACTIVE".equals(license.getStatus())) {
            throw new ForbiddenException("License is not active. Cannot check for updates.");
        }

        if (license.getExpiryDate() != null && license.getExpiryDate().isBefore(LocalDate.now())) {
            throw new ForbiddenException("License has expired. Renew your license to receive updates.");
        }

        SoftwareRelease latestRelease = softwareReleaseRepository.findFirstByProductIdOrderByReleaseDateDesc(productId)
                .orElse(null);

        if (latestRelease == null) {
            return null; // No updates exist
        }

        if (latestRelease.getVersion().equals(currentVersion)) {
            return null; // Already on the latest version
        }

        return latestRelease;
    }

    public SoftwareRelease getLatestReleaseByProductId(Long productId) {
        return softwareReleaseRepository.findFirstByProductIdOrderByReleaseDateDesc(productId).orElse(null);
    }
}
