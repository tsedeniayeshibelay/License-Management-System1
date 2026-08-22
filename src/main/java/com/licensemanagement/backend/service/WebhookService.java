package com.licensemanagement.backend.service;

import com.licensemanagement.backend.dto.WebhookPayload;
import com.licensemanagement.backend.entity.Company;
import com.licensemanagement.backend.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebhookService {

    private final RestTemplate restTemplate;
    private final CompanyRepository companyRepository;

    @Value("${app.admin.webhook-url:}")
    private String globalAdminWebhookUrl;

    @Async
    public void sendGlobalAlert(String message) {
        if (globalAdminWebhookUrl == null || globalAdminWebhookUrl.isBlank()) {
            return;
        }

        try {
            WebhookPayload payload = new WebhookPayload(message);
            restTemplate.postForEntity(globalAdminWebhookUrl, payload, String.class);
            log.info("Successfully sent global webhook alert");
        } catch (Exception e) {
            log.error("Failed to send global webhook alert: {}", e.getMessage());
        }
    }

    @Async
    public void sendCompanyAlert(Long companyId, String message) {
        // Always send to global admin as well
        sendGlobalAlert(message);

        if (companyId == null) {
            return;
        }

        try {
            companyRepository.findById(companyId).ifPresent(company -> {
                if (company.getWebhookUrl() != null && !company.getWebhookUrl().isBlank()) {
                    WebhookPayload payload = new WebhookPayload(message);
                    restTemplate.postForEntity(company.getWebhookUrl(), payload, String.class);
                    log.info("Successfully sent company webhook alert for company ID: {}", companyId);
                }
            });
        } catch (Exception e) {
            log.error("Failed to send company webhook alert for company ID {}: {}", companyId, e.getMessage());
        }
    }
}
