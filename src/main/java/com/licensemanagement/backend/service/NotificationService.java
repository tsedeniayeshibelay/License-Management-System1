package com.licensemanagement.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.licensemanagement.backend.entity.Notification;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final com.licensemanagement.backend.repository.UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public void notifyCompany(Long companyId, String eventKey, String type, String title, String message, String linkUrl) {
        if (companyId == null) return;
        try {
            List<User> companyUsers = userRepository.findByCompanyId(companyId);
            for (User user : companyUsers) {
                if ("COMPANY".equals(user.getRole()) || "ADMIN".equals(user.getRole())) {
                    sendNotification(user, eventKey, type, title, message, linkUrl, null);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to notify company {}: {}", companyId, e.getMessage());
        }
    }

    public void notifyAdmins(String eventKey, String type, String title, String message, String linkUrl) {
        try {
            List<User> admins = userRepository.findByRole("ADMIN");
            for (User admin : admins) {
                sendNotification(admin, eventKey, type, title, message, linkUrl, null);
            }
        } catch (Exception e) {
            log.warn("Failed to notify admins: {}", e.getMessage());
        }
    }

    public static String maskLicenseKey(String key) {
        if (key == null || key.isBlank()) return "••••";
        String clean = key.trim();
        if (clean.length() <= 4) return "••••";
        return "••••-" + clean.substring(clean.length() - 4);
    }

    /**
     * Evaluates user notification preferences and dispatches in-app notification + email.
     * Hierarchy rules:
     * 1. If event toggle is OFF: suppress both in-app and email notification.
     * 2. If event toggle is ON: persist in-app notification.
     * 3. If Master Email is ON: trigger email dispatch action.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Notification sendNotification(User user, String eventKey, String type, String title, String message, String linkUrl, Runnable emailDispatchAction) {
        if (user == null) {
            log.warn("Cannot send notification to null user");
            return null;
        }

        // 1. Check if event is enabled
        if (!isEventEnabled(user, eventKey)) {
            log.info("Notification suppressed for user {} because event toggle '{}' is OFF", user.getEmail(), eventKey);
            return null;
        }

        // 2. Persist in-app notification
        Notification notification = new Notification();
        notification.setUserId(user.getId());
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setLinkUrl(linkUrl);
        notification.setRead(false);
        Notification saved = notificationRepository.save(notification);
        log.info("Saved in-app notification [{}] for user {}", type, user.getEmail());

        // 3. Check Master Email switch
        if (emailDispatchAction != null) {
            if (isEmailMethodEnabled(user)) {
                try {
                    emailDispatchAction.run();
                } catch (Exception e) {
                    log.error("Failed to execute email dispatch for {}: {}", user.getEmail(), e.getMessage());
                }
            } else {
                log.info("Email notification skipped for user {} because Master Email toggle is OFF", user.getEmail());
            }
        }

        return saved;
    }

    public boolean isEventEnabled(User user, String eventKey) {
        if (user == null || user.getPreferences() == null || eventKey == null) {
            return true; // default ON
        }
        try {
            JsonNode root = objectMapper.readTree(user.getPreferences());
            String normalizedKey = normalizeEventKey(eventKey);

            // 1. Check in "toggles" object (used by AdminSettings)
            if (root.has("toggles")) {
                Boolean val = findToggleBoolean(root.get("toggles"), normalizedKey, eventKey);
                if (val != null) return val;
            }

            // 2. Check in "notifications" object (used by Customer/Company Settings)
            if (root.has("notifications")) {
                Boolean val = findToggleBoolean(root.get("notifications"), normalizedKey, eventKey);
                if (val != null) return val;
            }

            // 3. Check directly at root level
            Boolean val = findToggleBoolean(root, normalizedKey, eventKey);
            if (val != null) return val;

        } catch (Exception e) {
            log.warn("Failed to parse preferences for event check '{}': {}", eventKey, e.getMessage());
        }
        return true;
    }

    public String normalizeEventKey(String eventKey) {
        if (eventKey == null) return "";
        String lower = eventKey.toLowerCase().replace("_", "").replace("-", "");
        if (lower.contains("expir")) return "expiration";
        if (lower.contains("assign")) return "assignment";
        if (lower.contains("revoc")) return "revocation";
        if (lower.contains("activ") || lower.contains("employee")) return "activity";
        if (lower.contains("purch") || lower.contains("order") || lower.contains("invoice")) return "purchases";
        if (lower.contains("security")) return "security";
        if (lower.contains("failedactivation")) return "failedActivations";
        if (lower.contains("unbind")) return "unbindRequests";
        if (lower.contains("user") || lower.contains("company")) return "newUserAlerts";
        if (lower.contains("system") || lower.contains("maint")) return "systemNotifications";
        return eventKey;
    }

    private Boolean findToggleBoolean(JsonNode node, String normalizedKey, String originalKey) {
        if (node == null || !node.isObject()) return null;
        if (node.has(normalizedKey)) return node.get(normalizedKey).asBoolean(true);
        if (originalKey != null && node.has(originalKey)) return node.get(originalKey).asBoolean(true);

        // Check common aliases for the 6 canonical notification topics
        if ("expiration".equals(normalizedKey) || "licenseExpiration".equals(normalizedKey)) {
            if (node.has("expiration")) return node.get("expiration").asBoolean(true);
            if (node.has("expirations")) return node.get("expirations").asBoolean(true);
            if (node.has("licenseExpiration")) return node.get("licenseExpiration").asBoolean(true);
        }
        if ("assignment".equals(normalizedKey) || "licenseAssignment".equals(normalizedKey)) {
            if (node.has("assignment")) return node.get("assignment").asBoolean(true);
            if (node.has("assignments")) return node.get("assignments").asBoolean(true);
            if (node.has("licenseAssignment")) return node.get("licenseAssignment").asBoolean(true);
        }
        if ("revocation".equals(normalizedKey) || "licenseRevocation".equals(normalizedKey)) {
            if (node.has("revocation")) return node.get("revocation").asBoolean(true);
            if (node.has("revocations")) return node.get("revocations").asBoolean(true);
            if (node.has("licenseRevocation")) return node.get("licenseRevocation").asBoolean(true);
        }
        if ("activity".equals(normalizedKey) || "employeeActivity".equals(normalizedKey)) {
            if (node.has("activity")) return node.get("activity").asBoolean(true);
            if (node.has("employeeActivity")) return node.get("employeeActivity").asBoolean(true);
            if (node.has("buyerActivity")) return node.get("buyerActivity").asBoolean(true);
        }
        if ("purchases".equals(normalizedKey)) {
            if (node.has("purchases")) return node.get("purchases").asBoolean(true);
            if (node.has("purchaseNotifications")) return node.get("purchaseNotifications").asBoolean(true);
            if (node.has("orders")) return node.get("orders").asBoolean(true);
        }
        if ("security".equals(normalizedKey) || "securityAlerts".equals(normalizedKey)) {
            if (node.has("security")) return node.get("security").asBoolean(true);
            if (node.has("securityAlerts")) return node.get("securityAlerts").asBoolean(true);
            if (node.has("loginAlerts")) return node.get("loginAlerts").asBoolean(true);
        }
        if ("failedActivations".equals(normalizedKey)) {
            if (node.has("failedActivation")) return node.get("failedActivation").asBoolean(true);
        }
        if ("unbindRequests".equals(normalizedKey)) {
            if (node.has("unbindUpdates")) return node.get("unbindUpdates").asBoolean(true);
        }
        if ("newUserAlerts".equals(normalizedKey)) {
            if (node.has("newCompany")) return node.get("newCompany").asBoolean(true);
            if (node.has("newUser")) return node.get("newUser").asBoolean(true);
        }
        if ("systemNotifications".equals(normalizedKey)) {
            if (node.has("system")) return node.get("system").asBoolean(true);
        }

        String lowerNorm = normalizedKey.toLowerCase();
        java.util.Iterator<String> it = node.fieldNames();
        while (it.hasNext()) {
            String f = it.next();
            if (f.equalsIgnoreCase(normalizedKey) || (originalKey != null && f.equalsIgnoreCase(originalKey)) || f.toLowerCase().equals(lowerNorm)) {
                return node.get(f).asBoolean(true);
            }
        }
        return null;
    }

    public boolean isEmailMethodEnabled(User user) {
        if (user == null || user.getPreferences() == null) {
            return true; // default ON
        }
        try {
            JsonNode root = objectMapper.readTree(user.getPreferences());
            if (root.has("notifications") && root.get("notifications").has("email")) {
                return root.get("notifications").get("email").asBoolean(true);
            }
        } catch (Exception e) {
            log.warn("Failed to parse preferences for email check: {}", e.getMessage());
        }
        return true;
    }

    public String getNotificationEmail(User user) {
        if (user == null) return null;
        if (user.getPreferences() != null) {
            try {
                JsonNode root = objectMapper.readTree(user.getPreferences());
                if (root.has("notifications") && root.get("notifications").has("emailAddress")) {
                    String addr = root.get("notifications").get("emailAddress").asText();
                    if (addr != null && !addr.isBlank() && addr.contains("@")) {
                        return addr.trim();
                    }
                }
            } catch (Exception ignored) {}
        }
        return user.getEmail();
    }

    @Transactional(readOnly = true)
    public List<Notification> getRecentNotifications(Long userId) {
        if (userId == null) return Collections.emptyList();
        return notificationRepository.findTop50ByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        if (userId == null) return 0;
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public boolean markAsRead(Long notificationId, Long userId) {
        Optional<Notification> opt = notificationRepository.findByIdAndUserId(notificationId, userId);
        if (opt.isPresent()) {
            Notification n = opt.get();
            n.setRead(true);
            notificationRepository.save(n);
            return true;
        }
        return false;
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        if (userId != null) {
            notificationRepository.markAllAsReadForUser(userId);
        }
    }

    @Transactional
    public boolean deleteNotification(Long notificationId, Long userId) {
        Optional<Notification> opt = notificationRepository.findByIdAndUserId(notificationId, userId);
        if (opt.isPresent()) {
            notificationRepository.deleteByIdAndUserId(notificationId, userId);
            return true;
        }
        return false;
    }
}
