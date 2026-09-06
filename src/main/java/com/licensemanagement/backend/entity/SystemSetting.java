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
@Table(name = "system_settings")
public class SystemSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "platform_name", nullable = false)
    private String platformName = "LockStrata Enterprise";

    @Column(name = "support_email", nullable = false)
    private String supportEmail = "support@lockstrata.com";

    @Column(name = "admin_portal_url", nullable = false)
    private String adminPortalUrl = "https://admin.lockstrata.com";

    @Column(name = "maintenance_mode", nullable = false)
    private Boolean maintenanceMode = false;

    @Column(name = "debug_logging", nullable = false)
    private Boolean debugLogging = false;

    @Column(name = "webhook_url")
    private String webhookUrl;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onSave() {
        updatedAt = LocalDateTime.now();
    }
}
