package com.licensemanagement.backend.util;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
public class EmailUtil {

    private String loadTemplate(String templateName) {
        try {
            ClassPathResource resource = new ClassPathResource("templates/" + templateName);
            return StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new RuntimeException("Could not load email template: " + templateName, e);
        }
    }

    public String buildLicenseCreatedEmail(String customerName, String productName, String expiryDate, String loginEmail) {
        String template = loadTemplate("email-license-created.html");
        return template
                .replace("{customerName}", customerName)
                .replace("{productName}", productName)
                .replace("{expiryDate}", expiryDate)
                .replace("{loginEmail}", loginEmail);
    }

    public String buildActivationEmail(String customerName, String productName) {
        String template = loadTemplate("email-activation.html");
        return template
                .replace("{customerName}", customerName)
                .replace("{productName}", productName);
    }

    public String buildExpiryEmail(String customerName, String productName, String expiryDate, int daysLeft) {
        String templateName = "email-expiry-" + daysLeft + ".html";
        String template = loadTemplate(templateName);
        return template
                .replace("{customerName}", customerName)
                .replace("{productName}", productName)
                .replace("{expiryDate}", expiryDate);
    }

    public String buildExpiredEmail(String customerName, String productName) {
        String template = loadTemplate("email-expired.html");
        return template
                .replace("{customerName}", customerName)
                .replace("{productName}", productName);
    }

    public String buildEmployeeInvitationEmail(String employeeName, String companyName, String loginEmail, String username, String tempPassword, String loginUrl) {
        String template = loadTemplate("email-employee-invitation.html");
        return template
                .replace("{employeeName}", employeeName != null ? employeeName : username)
                .replace("{companyName}", companyName != null ? companyName : "Your Company")
                .replace("{loginEmail}", loginEmail)
                .replace("{username}", username)
                .replace("{tempPassword}", tempPassword)
                .replace("{loginUrl}", loginUrl != null ? loginUrl : "http://localhost:3000/login");
    }

    public String buildLicenseAssignedEmail(String employeeName, String companyName, String productName, String expiryDate, String loginEmail, String loginUrl) {
        String template = loadTemplate("email-license-assigned.html");
        return template
                .replace("{employeeName}", employeeName != null ? employeeName : "Team Member")
                .replace("{companyName}", companyName != null ? companyName : "Your Company")
                .replace("{productName}", productName)
                .replace("{expiryDate}", expiryDate != null ? expiryDate : "Perpetual")
                .replace("{loginEmail}", loginEmail)
                .replace("{loginUrl}", loginUrl != null ? loginUrl : "http://localhost:3000/login");
    }

    public String buildLoginAlertEmail(String customerName, String deviceName, String ipAddress, String loginTime) {
        String template = loadTemplate("email-login-alert.html");
        return template
                .replace("{customerName}", customerName != null ? customerName : "Valued User")
                .replace("{deviceName}", deviceName != null && !deviceName.isBlank() ? deviceName : "Unknown Device")
                .replace("{ipAddress}", ipAddress != null && !ipAddress.isBlank() ? ipAddress : "N/A")
                .replace("{loginTime}", loginTime != null ? loginTime : "Just now");
    }

    public String buildUnbindStatusEmail(String customerName, String deviceName, String maskedKey, String status) {
        String template = loadTemplate("email-unbind-status.html");
        boolean approved = "APPROVED".equalsIgnoreCase(status);
        String statusClass = approved ? "badge-approved" : "badge-rejected";
        String statusText = approved ? "APPROVED" : "REJECTED";
        String statusMsg = approved 
                ? "The requested device has been unlinked from your license. You may now activate this license on another device."
                : "The request to unlink this device was rejected by the administrator. Contact support if you need assistance.";
        return template
                .replace("{customerName}", customerName != null ? customerName : "Valued User")
                .replace("{deviceName}", deviceName != null && !deviceName.isBlank() ? deviceName : "Device")
                .replace("{maskedKey}", maskedKey)
                .replace("{statusClass}", statusClass)
                .replace("{statusText}", statusText)
                .replace("{statusMessage}", statusMsg);
    }

    public String buildDeviceActivationEmail(String customerName, String deviceName, String deviceOs, String productName, String maskedKey) {
        String template = loadTemplate("email-device-activation.html");
        return template
                .replace("{customerName}", customerName != null ? customerName : "Valued User")
                .replace("{deviceName}", deviceName != null && !deviceName.isBlank() ? deviceName : "Device")
                .replace("{deviceOs}", deviceOs != null && !deviceOs.isBlank() ? deviceOs : "Unknown OS")
                .replace("{productName}", productName != null ? productName : "Software")
                .replace("{maskedKey}", maskedKey);
    }

    public String buildFailedActivationEmail(String customerName, String maskedKey, String reason) {
        String template = loadTemplate("email-failed-activation.html");
        return template
                .replace("{customerName}", customerName != null ? customerName : "Valued User")
                .replace("{maskedKey}", maskedKey)
                .replace("{reason}", reason != null && !reason.isBlank() ? reason : "Unknown validation failure");
    }
}