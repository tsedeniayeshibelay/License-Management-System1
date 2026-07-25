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
@Table(name = "activations")
public class Activation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "license_id", nullable = false)
    private Long licenseId;
    @Column(name = "device_id", nullable = false)
    private Long deviceId;
    @Column(name = "activated_at")
    private LocalDateTime activatedAt;
    @Column(name = "deactivated_at")
    private LocalDateTime deactivatedAt;
    @Column(name = "is_active")
    private Boolean isActive = true;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne
    @JoinColumn(name = "license_id", insertable = false, updatable = false)
    private License license;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne
    @JoinColumn(name = "device_id", insertable = false, updatable = false)
    private Device device;

    public String getDeviceName() {
        return device != null ? device.getDeviceName() : null;
    }

    public String getMachineId() {
        return device != null ? device.getMachineId() : null;
    }

    public String getLicenseKey() {
        return license != null ? license.getLicenseKey() : null;
    }

    public String getProductName() {
        return license != null && license.getProduct() != null ? license.getProduct().getName() : null;
    }

    public String getUserEmail() {
        if (device != null && device.getUser() != null) return device.getUser().getEmail();
        if (license != null && license.getUser() != null) return license.getUser().getEmail();
        return null;
    }

    public String getIpAddress() {
        return device != null ? device.getIpAddress() : null;
    }

    public String getOs() {
        return device != null ? device.getOs() : null;
    }

    @PrePersist
    protected void onCreate() {
        activatedAt = LocalDateTime.now();
    }
}