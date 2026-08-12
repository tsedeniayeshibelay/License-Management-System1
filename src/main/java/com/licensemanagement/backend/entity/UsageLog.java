package com.licensemanagement.backend.entity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "usage_logs")
public class UsageLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "license_id", nullable = false)
    private Long licenseId;
    @Column(name = "device_id")
    private Long deviceId;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(name = "session_start")
    private LocalDateTime sessionStart;
    @Column(name = "session_end")
    private LocalDateTime sessionEnd;
    @Column(name = "duration_minutes")
    private Integer durationMinutes = 0;
    @Column(name = "features_used", columnDefinition = "TEXT")
    private String featuresUsed;
    @Column(name = "ip_address")
    private String ipAddress;
    @Column(name = "activation_method")
    private String activationMethod;
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne
    @JoinColumn(name = "license_id", insertable = false, updatable = false)
    private License license;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne
    @JoinColumn(name = "device_id", insertable = false, updatable = false)
    private Device device;

    public LocalDateTime getTimestamp() {
        return sessionStart != null ? sessionStart : createdAt;
    }

    public String getAction() {
        if (featuresUsed != null && !featuresUsed.trim().isEmpty()) {
            return featuresUsed;
        }
        if (activationMethod != null && !activationMethod.trim().isEmpty()) {
            return activationMethod + " Activation";
        }
        return "License Validation";
    }

    public String getDetails() {
        if (durationMinutes != null && durationMinutes > 0) {
            String methodSuffix = (activationMethod != null && !activationMethod.isEmpty()) ? " • " + activationMethod : "";
            return durationMinutes + " min duration" + methodSuffix;
        }
        if (featuresUsed != null && !featuresUsed.trim().isEmpty()) {
            return featuresUsed;
        }
        return (activationMethod != null && !activationMethod.isEmpty() ? activationMethod : "Online") + " session";
    }

    public String getUsername() {
        return user != null ? user.getUsername() : null;
    }

    public String getUserFullName() {
        if (user != null) {
            return user.getFullName() != null && !user.getFullName().trim().isEmpty()
                    ? user.getFullName()
                    : user.getUsername();
        }
        return null;
    }

    public String getDeviceName() {
        return device != null ? device.getDeviceName() : null;
    }

    public String getProductName() {
        if (license != null && license.getProduct() != null) {
            return license.getProduct().getName();
        }
        return null;
    }

    public String getFormattedIpAddress() {
        if (ipAddress != null && !ipAddress.trim().isEmpty() && !"Historical (Backfilled)".equalsIgnoreCase(ipAddress)) {
            return ipAddress;
        }
        if (device != null && device.getIpAddress() != null && !device.getIpAddress().trim().isEmpty()) {
            return device.getIpAddress();
        }
        if ("Offline".equalsIgnoreCase(activationMethod)) {
            return "Offline (Airgapped)";
        }
        if ("Historical (Backfilled)".equalsIgnoreCase(ipAddress)) {
            return "Local Network";
        }
        return "127.0.0.1 (Local)";
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (sessionStart == null) {
            sessionStart = LocalDateTime.now();
        }
        if (activationMethod == null) {
            activationMethod = "Online";
        }
    }
}