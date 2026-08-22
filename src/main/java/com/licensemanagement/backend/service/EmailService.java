package com.licensemanagement.backend.service;
import com.licensemanagement.backend.entity.EmailLog;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.Product;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.repository.EmailLogRepository;
import com.licensemanagement.backend.repository.LicenseRepository;
import com.licensemanagement.backend.repository.ProductRepository;
import com.licensemanagement.backend.repository.UserRepository;
import com.licensemanagement.backend.util.EmailUtil;
import com.licensemanagement.backend.util.QRCodeGenerator;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.util.ByteArrayDataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
@Service
@RequiredArgsConstructor
public class EmailService {
    private final JavaMailSender mailSender;
    private final EmailUtil emailUtil;
    private final UserRepository userRepository;
    private final LicenseRepository licenseRepository;
    private final ProductRepository productRepository;
    private final QRCodeGenerator qrCodeGenerator;
    private final EmailLogRepository emailLogRepository;  
    private final NotificationService notificationService;
    private final org.springframework.context.ApplicationContext applicationContext;
    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;
    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;
    @Value("${spring.mail.username}")
    private String fromEmail;
    
    @Async
    public void sendLicenseCreatedEmail(User customer, License license, Product product) {
        try {
            String subject = "Welcome! Your License is Ready!";
            String content = emailUtil.buildLicenseCreatedEmail(
                    customer.getFullName(),
                    product.getName(),
                    license.getExpiryDate().toString(),
                    customer.getEmail()
            );
            sendEmail(customer.getEmail(), subject, content);
            logEmail(customer.getEmail(), subject, "LICENSE_CREATED", license.getId(), customer.getId());
            System.out.println("License created email sent to: " + customer.getEmail());
        } catch (Exception e) {
            logEmailError(customer.getEmail(), "LICENSE_CREATED", e.getMessage());
            System.out.println("❌ Failed to send email: " + e.getMessage());
        }
    }
    
    @Async
    public void sendActivationEmail(User customer, License license, String productName) {
        try {
            String subject = "✅ License Activated Successfully!";
            String content = emailUtil.buildActivationEmail(
                    customer.getFullName(),
                    productName
            );
            sendEmail(customer.getEmail(), subject, content);
            logEmail(customer.getEmail(), subject, "ACTIVATION", license.getId(), customer.getId());
            System.out.println("✅ Activation email sent to: " + customer.getEmail());
        } catch (Exception e) {
            logEmailError(customer.getEmail(), "ACTIVATION", e.getMessage());
            System.out.println("❌ Failed to send activation email: " + e.getMessage());
        }
    }
    
    @Async
    public void sendExpiryEmail(User customer, License license, Product product, int daysLeft) {
        try {
            if (!notificationService.isEmailMethodEnabled(customer)) {
                System.out.println("User opted out of email notifications: " + customer.getEmail());
                return;
            }
            String recipient = notificationService.getNotificationEmail(customer);
            String subject = "⚠️ License Expires in " + daysLeft + " Days";
            String content = emailUtil.buildExpiryEmail(
                    customer.getFullName(),
                    product.getName(),
                    license.getExpiryDate().toString(),
                    daysLeft
            );
            sendEmail(recipient, subject, content);
            logEmail(recipient, subject, "EXPIRY_REMINDER_" + daysLeft, license.getId(), customer.getId());
            System.out.println("✅ Expiry reminder email sent to: " + recipient);
        } catch (Exception e) {
            logEmailError(customer.getEmail(), "EXPIRY_REMINDER_" + daysLeft, e.getMessage());
            System.out.println("❌ Failed to send expiry email: " + e.getMessage());
        }
    }
    
    @Async
    public void sendExpiredEmail(User customer, License license, Product product) {
        try {
            if (!notificationService.isEmailMethodEnabled(customer)) {
                System.out.println("User opted out of email notifications: " + customer.getEmail());
                return;
            }
            String recipient = notificationService.getNotificationEmail(customer);
            String subject = "❌ License Expired";
            String content = emailUtil.buildExpiredEmail(
                    customer.getFullName(),
                    product.getName()
            );
            sendEmail(recipient, subject, content);
            logEmail(recipient, subject, "EXPIRED", license.getId(), customer.getId());
            System.out.println("✅ Expired email sent to: " + recipient);
        } catch (Exception e) {
            logEmailError(customer.getEmail(), "EXPIRED", e.getMessage());
            System.out.println("❌ Failed to send expired email: " + e.getMessage());
        }
    }

    @Async
    public void sendEmployeeInvitationEmail(User employee, String companyName, String tempPassword) {
        try {
            String subject = "Welcome to LockStrata - Your Account from " + companyName;
            String loginUrl = frontendUrl + "/login";
            String content = emailUtil.buildEmployeeInvitationEmail(
                    employee.getFullName(),
                    companyName,
                    employee.getEmail(),
                    employee.getUsername(),
                    tempPassword,
                    loginUrl
            );
            sendEmail(employee.getEmail(), subject, content);
            logEmail(employee.getEmail(), subject, "EMPLOYEE_INVITATION", null, employee.getId());
            System.out.println("✅ Employee invitation email sent to: " + employee.getEmail());
        } catch (Exception e) {
            logEmailError(employee.getEmail(), "EMPLOYEE_INVITATION", e.getMessage());
            System.out.println("❌ Failed to send employee invitation email: " + e.getMessage());
        }
    }

    @Async
    public void sendLicenseAssignedEmail(User employee, String companyName, String productName, String expiryDate, Long licenseId) {
        try {
            String subject = "Your company has assigned you a " + productName + " license";
            String loginUrl = frontendUrl + "/login";
            String content = emailUtil.buildLicenseAssignedEmail(
                    employee.getFullName(),
                    companyName,
                    productName,
                    expiryDate,
                    employee.getEmail(),
                    loginUrl
            );
            sendEmail(employee.getEmail(), subject, content);
            logEmail(employee.getEmail(), subject, "LICENSE_ASSIGNED", licenseId, employee.getId());
            System.out.println("✅ License assignment email sent to: " + employee.getEmail());
        } catch (Exception e) {
            logEmailError(employee.getEmail(), "LICENSE_ASSIGNED", e.getMessage());
            System.out.println("❌ Failed to send license assignment email: " + e.getMessage());
        }
    }
    private void sendEmailWithQR(String to, String subject, String content, byte[] qrCode) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true);
        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(content, true);
        helper.addInline("qrcode", new ByteArrayDataSource(qrCode, "image/png"));
        mailSender.send(message);
    }
    public void sendEmail(String to, String subject, String content) {
        sendEmail(to, subject, content, false);
    }
    
    public void sendEmail(String to, String subject, String content, boolean isSecurity) {
        if (!isSecurity) {
            User user = userRepository.findByEmail(to).orElse(null);
            if (user != null && user.getPreferences() != null) {
                try {
                    com.fasterxml.jackson.databind.JsonNode prefs = new com.fasterxml.jackson.databind.ObjectMapper().readTree(user.getPreferences());
                    if (prefs.has("notifications") && prefs.get("notifications").has("email") && !prefs.get("notifications").get("email").asBoolean()) {
                        System.out.println("User opted out of email notifications: " + to);
                        return;
                    }
                } catch (Exception e) {
                    System.err.println("Failed to parse preferences for email check: " + e.getMessage());
                }
            }
        }
        
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(content, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send email to " + to + ": " + e.getMessage());
        }
    }
    private void logEmail(String recipient, String subject, String type, Long licenseId, Long userId) {
        if (licenseId == null) {
            return;
        }
        EmailLog log = new EmailLog();
        log.setUserId(userId);
        log.setLicenseId(licenseId);
        log.setEmailType(type);
        log.setSubject(subject);
        log.setContent("Email sent to: " + recipient);
        log.setSentAt(LocalDateTime.now());
        emailLogRepository.save(log);
    }
    private void logEmailError(String recipient, String type, String error) {
        System.err.println("Email failed for recipient " + recipient + " [" + type + "]: " + error);
    }
    @Scheduled(cron = "0 0 8 * * *")
    public void sendExpiryReminders() {
        System.out.println("⏰ Running expiry reminder job...");
        sendExpiryRemindersForDays(30);
        sendExpiryRemindersForDays(14);
        sendExpiryRemindersForDays(7);
        sendExpiryRemindersForDays(1);
        sendExpiredNotifications();
        try {
            BulkBuyerService bulkBuyerService = applicationContext.getBean(BulkBuyerService.class);
            bulkBuyerService.processAllBulkBuyerExpirations();
        } catch (Exception e) {
            System.err.println("❌ Failed to process bulk buyer expirations: " + e.getMessage());
        }
    }
    private void sendExpiryRemindersForDays(int days) {
        LocalDate expiryDate = LocalDate.now().plusDays(days);
        List<License> licenses = licenseRepository.findByExpiryDate(expiryDate);
        for (License license : licenses) {
            try {
                User customer = userRepository.findById(license.getUserId())
                        .orElseThrow(() -> new RuntimeException("User not found"));
                Product product = productRepository.findById(license.getProductId())
                        .orElseThrow(() -> new RuntimeException("Product not found"));
                if ("ACTIVE".equals(license.getStatus())) {
                    java.time.LocalDateTime cutoff = license.getExpiryDate().minusDays(days + 2).atStartOfDay();
                    boolean alreadySent = emailLogRepository.hasNotificationBeenSent(
                        license.getId(), customer.getId(), "EXPIRY_REMINDER_" + days, cutoff
                    );
                    if (!alreadySent) {
                        sendExpiryEmail(customer, license, product, days);
                        if (license.getCompanyId() != null) {
                            notificationService.notifyCompany(
                                license.getCompanyId(),
                                "expiration",
                                "LICENSE_EXPIRING",
                                "License Expiring Soon",
                                "License for " + product.getName() + " (" + NotificationService.maskLicenseKey(license.getLicenseKey()) + ") held by " + customer.getFullName() + " expires in " + days + " days.",
                                "/company-licenses"
                            );
                        }
                    }
                }
            } catch (Exception e) {
                System.out.println("❌ Failed to send expiry reminder for license: " + license.getLicenseKey());
            }
        }
    }
    private void sendExpiredNotifications() {
        LocalDate today = LocalDate.now();
        List<License> expiredLicenses = licenseRepository.findByExpiryDateBefore(today);
        for (License license : expiredLicenses) {
            try {
                if ("ACTIVE".equals(license.getStatus())) {
                    User customer = userRepository.findById(license.getUserId())
                            .orElseThrow(() -> new RuntimeException("User not found"));
                    Product product = productRepository.findById(license.getProductId())
                            .orElseThrow(() -> new RuntimeException("Product not found"));
                    sendExpiredEmail(customer, license, product);
                    license.setStatus("EXPIRED");
                    licenseRepository.save(license);
                    if (license.getCompanyId() != null) {
                        notificationService.notifyCompany(
                            license.getCompanyId(),
                            "expiration",
                            "LICENSE_EXPIRED",
                            "License Expired",
                            "License for " + product.getName() + " (" + NotificationService.maskLicenseKey(license.getLicenseKey()) + ") held by " + customer.getFullName() + " has expired.",
                            "/company-licenses"
                        );
                    }
                }
            } catch (Exception e) {
                System.out.println("❌ Failed to send expired notification for license: " + license.getLicenseKey());
            }
        }
    }

    @Async
    public void sendLoginAlertEmail(User user, String deviceName, String ipAddress) {
        try {
            String subject = "Security Alert: New Login from Unrecognized Device";
            String formattedTime = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm:ss"));
            String content = emailUtil.buildLoginAlertEmail(
                    user.getFullName() != null && !user.getFullName().isBlank() ? user.getFullName() : user.getUsername(),
                    deviceName != null && !deviceName.isBlank() ? deviceName : "Unknown Browser/Device",
                    ipAddress != null && !ipAddress.isBlank() ? ipAddress : "N/A",
                    formattedTime
            );
            System.out.println("Dispatching login alert email for user: " + user.getEmail() + " on device: " + deviceName);
            sendEmail(user.getEmail(), subject, content, false);
        } catch (Exception e) {
            System.err.println("Failed to dispatch login alert email to " + user.getEmail() + ": " + e.getMessage());
        }
    }

    @Async
    public void sendUnbindStatusEmail(User customer, String deviceName, String maskedKey, String status) {
        try {
            String subject = "APPROVED".equalsIgnoreCase(status)
                    ? "✅ Unbind Request Approved"
                    : "❌ Unbind Request Rejected";
            String content = emailUtil.buildUnbindStatusEmail(
                    customer.getFullName() != null && !customer.getFullName().isBlank() ? customer.getFullName() : customer.getUsername(),
                    deviceName,
                    maskedKey,
                    status
            );
            sendEmail(customer.getEmail(), subject, content, false);
            logEmail(customer.getEmail(), subject, "UNBIND_" + status, null, customer.getId());
            System.out.println("✅ Unbind status (" + status + ") email sent to: " + customer.getEmail());
        } catch (Exception e) {
            logEmailError(customer.getEmail(), "UNBIND_" + status, e.getMessage());
            System.err.println("Failed to send unbind status email: " + e.getMessage());
        }
    }

    @Async
    public void sendDeviceActivationEmail(User customer, com.licensemanagement.backend.entity.Device device, String productName, String maskedKey) {
        try {
            String subject = "💻 New Device Connected to License";
            String content = emailUtil.buildDeviceActivationEmail(
                    customer.getFullName() != null && !customer.getFullName().isBlank() ? customer.getFullName() : customer.getUsername(),
                    device.getDeviceName(),
                    device.getOs(),
                    productName,
                    maskedKey
            );
            sendEmail(customer.getEmail(), subject, content, false);
            logEmail(customer.getEmail(), subject, "DEVICE_ACTIVATION", null, customer.getId());
            System.out.println("✅ Device activation email sent to: " + customer.getEmail());
        } catch (Exception e) {
            logEmailError(customer.getEmail(), "DEVICE_ACTIVATION", e.getMessage());
            System.err.println("Failed to send device activation email: " + e.getMessage());
        }
    }

    @Async
    public void sendFailedActivationEmail(User customer, String maskedKey, String reason) {
        try {
            String subject = "⚠️ Failed License Activation Attempt";
            String content = emailUtil.buildFailedActivationEmail(
                    customer.getFullName() != null && !customer.getFullName().isBlank() ? customer.getFullName() : customer.getUsername(),
                    maskedKey,
                    reason
            );
            sendEmail(customer.getEmail(), subject, content, false);
            logEmail(customer.getEmail(), subject, "FAILED_ACTIVATION", null, customer.getId());
            System.out.println("✅ Failed activation email sent to: " + customer.getEmail());
        } catch (Exception e) {
            logEmailError(customer.getEmail(), "FAILED_ACTIVATION", e.getMessage());
            System.err.println("Failed to send failed activation email: " + e.getMessage());
        }
    }
}