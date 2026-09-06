package com.licensemanagement.backend.service;

import com.licensemanagement.backend.entity.ActivationAttempt;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.exception.BusinessValidationException;
import com.licensemanagement.backend.repository.ActivationAttemptRepository;
import com.licensemanagement.backend.repository.LicenseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnomalyDetectionService {

    private final ActivationAttemptRepository activationAttemptRepository;
    private final LicenseRepository licenseRepository;
    private final GeoIpService geoIpService;
    private final WebhookService webhookService;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void checkAndLogActivationAttempt(String licenseKey, String ipAddress, boolean successful) {
        String country = geoIpService.getCountryByIp(ipAddress);

        ActivationAttempt attempt = new ActivationAttempt();
        attempt.setLicenseKey(licenseKey);
        attempt.setIpAddress(ipAddress);
        attempt.setCountry(country);
        attempt.setSuccessful(successful);
        activationAttemptRepository.save(attempt);

        if ("Unknown".equals(country) || "Localhost".equals(country)) {
            return;
        }

        LocalDateTime twentyFourHoursAgo = LocalDateTime.now().minusHours(24);
        long distinctCountries = activationAttemptRepository.countDistinctCountriesByLicenseKeyAndAttemptedAtAfter(
                licenseKey, twentyFourHoursAgo
        );

        if (distinctCountries >= 3) {
            log.warn("ANOMALY DETECTED: License {} attempted from {} distinct countries in 24h. Suspending license.", licenseKey, distinctCountries);
            
            License license = licenseRepository.findByLicenseKey(licenseKey).orElse(null);
            if (license != null && !"SUSPENDED".equals(license.getStatus())) {
                license.setStatus("SUSPENDED");
                licenseRepository.save(license);
                
                webhookService.sendCompanyAlert(license.getCompanyId(), 
                    "🚨 **SECURITY ALERT: LICENSE SUSPENDED**\nLicense: `" + NotificationService.maskLicenseKey(licenseKey) + "`\nReason: Attempted from " + distinctCountries + " distinct countries in 24 hours.");
            }
            
            throw new BusinessValidationException("License suspended due to suspicious activity from multiple countries. Please contact support.");
        }
    }
}
