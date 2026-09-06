package com.licensemanagement.backend.service;

import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.SoftwareRelease;
import com.licensemanagement.backend.exception.BusinessValidationException;
import com.licensemanagement.backend.exception.ForbiddenException;
import com.licensemanagement.backend.exception.ResourceNotFoundException;
import com.licensemanagement.backend.repository.LicenseRepository;
import com.licensemanagement.backend.repository.SoftwareReleaseRepository;
import com.licensemanagement.backend.entity.Product;
import com.licensemanagement.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@RequiredArgsConstructor
public class SoftwareReleaseService {

    private final SoftwareReleaseRepository softwareReleaseRepository;
    private final LicenseRepository licenseRepository;
    private final ProductRepository productRepository;
    private final ProductService productService;
    private final StorageService storageService;

    public record BundledRelease(org.springframework.core.io.Resource resource, String filename) {}

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

    public Map<String, String> getProductConfigForRelease(Long releaseId) {
        SoftwareRelease release = softwareReleaseRepository.findById(releaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Release not found."));
        Product product = productRepository.findById(release.getProductId()).orElse(null);
        String canonicalSku = product != null ? productService.getCanonicalProductId(product) : ("LS-PRODUCT-" + release.getProductId());
        String prodName = product != null ? product.getName() : "LockStrata Software";

        Map<String, String> config = new HashMap<>();
        config.put("productId", canonicalSku);
        config.put("productName", prodName);
        return config;
    }

    public BundledRelease getBundledRelease(Long releaseId, boolean bundle) {
        SoftwareRelease release = softwareReleaseRepository.findById(releaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Release not found."));
        if (!"LOCKSTRATA".equals(release.getDistributionMethod())) {
            throw new BusinessValidationException("This release is not hosted by LockStrata.");
        }

        Product product = productRepository.findById(release.getProductId()).orElse(null);
        String canonicalSku = product != null ? productService.getCanonicalProductId(product) : ("LS-PRODUCT-" + release.getProductId());
        String prodName = product != null ? product.getName() : "LockStrata Software";

        org.springframework.core.io.Resource rawResource = storageService.loadAsResource(release.getInternalStoragePath());
        String origFilename = release.getOriginalFilename() != null ? release.getOriginalFilename() : "software.exe";

        if (!bundle) {
            return new BundledRelease(rawResource, origFilename);
        }

        // Bundle packaging: produce a .zip containing the software binary AND product_config.json
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            try (ZipOutputStream zos = new ZipOutputStream(baos)) {
                // 1. Add product_config.json configured for this exact product
                String configJson = String.format("{\n  \"productId\": \"%s\",\n  \"productName\": \"%s\"\n}\n",
                        canonicalSku.replace("\"", "\\\""), prodName.replace("\"", "\\\""));
                ZipEntry configEntry = new ZipEntry("product_config.json");
                zos.putNextEntry(configEntry);
                zos.write(configJson.getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();

                // 2. Add original release file
                ZipEntry binaryEntry = new ZipEntry(origFilename);
                zos.putNextEntry(binaryEntry);
                try (InputStream is = rawResource.getInputStream()) {
                    is.transferTo(zos);
                }
                zos.closeEntry();
            }

            byte[] zipBytes = baos.toByteArray();
            ByteArrayResource zipResource = new ByteArrayResource(zipBytes);
            String zipFilename = origFilename.endsWith(".zip")
                    ? origFilename
                    : (origFilename.contains(".") ? origFilename.substring(0, origFilename.lastIndexOf('.')) + "-setup.zip" : origFilename + "-setup.zip");
            return new BundledRelease(zipResource, zipFilename);
        } catch (Exception e) {
            return new BundledRelease(rawResource, origFilename);
        }
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
