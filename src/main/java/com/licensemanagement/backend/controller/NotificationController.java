package com.licensemanagement.backend.controller;

import com.licensemanagement.backend.entity.Notification;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.util.CurrentUserProvider;
import com.licensemanagement.backend.service.NotificationService;
import com.licensemanagement.backend.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    private final NotificationService notificationService;
    private final EmailService emailService;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getMyNotifications() {
        User user = currentUserProvider.getCurrentUser();
        List<Notification> notifications = notificationService.getRecentNotifications(user.getId());
        long unreadCount = notificationService.getUnreadCount(user.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("notifications", notifications);
        response.put("unreadCount", unreadCount);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> getUnreadCount() {
        User user = currentUserProvider.getCurrentUser();
        long unreadCount = notificationService.getUnreadCount(user.getId());
        return ResponseEntity.ok(Map.of("unreadCount", unreadCount));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Map<String, Object>> markAsRead(@PathVariable Long id) {
        User user = currentUserProvider.getCurrentUser();
        boolean success = notificationService.markAsRead(id, user.getId());
        long unreadCount = notificationService.getUnreadCount(user.getId());
        return ResponseEntity.ok(Map.of("success", success, "unreadCount", unreadCount));
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<Map<String, Object>> markAllAsRead() {
        User user = currentUserProvider.getCurrentUser();
        notificationService.markAllAsRead(user.getId());
        return ResponseEntity.ok(Map.of("success", true, "unreadCount", 0));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteNotification(@PathVariable Long id) {
        User user = currentUserProvider.getCurrentUser();
        boolean deleted = notificationService.deleteNotification(id, user.getId());
        long unreadCount = notificationService.getUnreadCount(user.getId());
        return ResponseEntity.ok(Map.of("success", deleted, "unreadCount", unreadCount));
    }

    @PostMapping("/test")
    public ResponseEntity<Map<String, Object>> sendTestNotification(@RequestParam(defaultValue = "expiration") String eventKey) {
        User user = currentUserProvider.getCurrentUser();
        String canonicalKey = notificationService.normalizeEventKey(eventKey);

        Notification n = notificationService.sendNotification(
                user,
                canonicalKey,
                "TEST_ALERT",
                "LockStrata Test Alert: " + canonicalKey.toUpperCase(),
                "This is a verified test alert for '" + canonicalKey + "' notifications. Your alert channel is active.",
                "/dashboard",
                () -> {
                    String recipient = notificationService.getNotificationEmail(user);
                    if (recipient != null && !recipient.isBlank()) {
                        emailService.sendEmail(
                                recipient,
                                "LockStrata Test Alert: " + canonicalKey.toUpperCase(),
                                "<p>This is a verified test alert for <b>" + canonicalKey + "</b> notifications.</p>",
                                false
                        );
                    }
                }
        );
        long unreadCount = notificationService.getUnreadCount(user.getId());
        return ResponseEntity.ok(Map.of(
                "success", n != null,
                "eventKey", canonicalKey,
                "notification", n != null ? n : "suppressed_by_preferences",
                "unreadCount", unreadCount
        ));
    }
}
