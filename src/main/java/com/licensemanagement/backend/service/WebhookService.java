package com.licensemanagement.backend.service;

import com.licensemanagement.backend.dto.WebhookPayload;
import com.licensemanagement.backend.dto.WebhookTestResult;
import com.licensemanagement.backend.entity.Company;
import com.licensemanagement.backend.entity.SystemSetting;
import com.licensemanagement.backend.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebhookService {

    private final RestTemplate restTemplate;
    private final CompanyRepository companyRepository;
    private final SystemSettingService systemSettingService;

    @Value("${app.admin.webhook-url:}")
    private String globalAdminWebhookUrl;

    public String resolveAdminWebhookUrl() {
        try {
            SystemSetting setting = systemSettingService.getSettings();
            if (setting != null && setting.getWebhookUrl() != null && !setting.getWebhookUrl().isBlank()) {
                return setting.getWebhookUrl().trim();
            }
        } catch (Exception e) {
            log.warn("Could not read dynamic admin webhook URL from system settings: {}", e.getMessage());
        }
        return (globalAdminWebhookUrl != null && !globalAdminWebhookUrl.isBlank()) ? globalAdminWebhookUrl.trim() : null;
    }

    @Async
    public void sendGlobalAlert(String message) {
        String adminUrl = resolveAdminWebhookUrl();
        if (adminUrl == null || adminUrl.isBlank()) {
            return;
        }

        try {
            WebhookPayload payload = new WebhookPayload("SYSTEM_ALERT", message);
            payload.setTimestamp(LocalDateTime.now().toString());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<WebhookPayload> entity = new HttpEntity<>(payload, headers);

            restTemplate.postForEntity(adminUrl, entity, String.class);
            log.info("Successfully sent global webhook alert to {}", adminUrl);
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
                    WebhookPayload payload = new WebhookPayload("COMPANY_ALERT", message);
                    payload.setCompanyId(companyId);
                    payload.setTimestamp(LocalDateTime.now().toString());

                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.APPLICATION_JSON);
                    HttpEntity<WebhookPayload> entity = new HttpEntity<>(payload, headers);

                    restTemplate.postForEntity(company.getWebhookUrl(), entity, String.class);
                    log.info("Successfully sent company webhook alert for company ID: {}", companyId);
                }
            });
        } catch (Exception e) {
            log.error("Failed to send company webhook alert for company ID {}: {}", companyId, e.getMessage());
        }
    }

    /**
     * Synchronously test delivers a sample test ping to verify a webhook URL.
     */
    public WebhookTestResult testWebhook(String webhookUrl) {
        if (webhookUrl == null || webhookUrl.trim().isBlank()) {
            return WebhookTestResult.builder()
                    .success(false)
                    .statusCode(400)
                    .message("Webhook URL cannot be empty.")
                    .build();
        }

        String targetUrl = webhookUrl.trim();
        if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
            return WebhookTestResult.builder()
                    .success(false)
                    .statusCode(400)
                    .message("Webhook URL must start with http:// or https://")
                    .build();
        }

        try {
            WebhookPayload payload = new WebhookPayload(
                    "WEBHOOK_VERIFICATION",
                    "🔔 LockStrata Webhook: Successfully connected to your webhook endpoint!"
            );
            payload.setTimestamp(LocalDateTime.now().toString());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("User-Agent", "LockStrata-Webhook-Engine/1.0");
            HttpEntity<WebhookPayload> entity = new HttpEntity<>(payload, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(targetUrl, entity, String.class);
            boolean isSuccess = response.getStatusCode().is2xxSuccessful();

            return WebhookTestResult.builder()
                    .success(isSuccess)
                    .statusCode(response.getStatusCode().value())
                    .message(isSuccess
                            ? "Webhook verification delivered successfully! (HTTP " + response.getStatusCode().value() + ")"
                            : "Server responded with HTTP " + response.getStatusCode().value())
                    .build();
        } catch (HttpStatusCodeException httpEx) {
            log.warn("Webhook verification returned HTTP error: {} for URL: {}", httpEx.getStatusCode(), targetUrl);
            return WebhookTestResult.builder()
                    .success(false)
                    .statusCode(httpEx.getStatusCode().value())
                    .message("Target server rejected webhook with HTTP " + httpEx.getStatusCode().value() + ": " + httpEx.getStatusText())
                    .build();
        } catch (Exception e) {
            log.warn("Webhook verification failed for URL {}: {}", targetUrl, e.getMessage());
            return WebhookTestResult.builder()
                    .success(false)
                    .statusCode(500)
                    .message("Connection failed: " + (e.getMessage() != null ? e.getMessage() : "Unable to reach endpoint"))
                    .build();
        }
    }
}
