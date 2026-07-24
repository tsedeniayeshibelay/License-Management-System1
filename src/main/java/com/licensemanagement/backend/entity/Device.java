package com.licensemanagement.backend.entity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "devices")
public class Device {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(name = "machine_id", unique = true, nullable = false)
    private String machineId;
    @Column(name = "device_name")
    private String deviceName;
    private String os;
    @Column(name = "os_version")
    private String osVersion;
    @Column(name = "ip_address")
    private String ipAddress;
    @Column(name = "is_active")
    private Boolean isActive = true;
    @Column(name = "activated_at")
    private LocalDateTime activatedAt;
    @Column(name = "fingerprint", unique = true)
    private String fingerprint;
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    @Column(name = "last_seen")
    private LocalDateTime lastSeen;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "device", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Activation> activations;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "device", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<UsageLog> usageLogs;
    
    @Transient
    private String productName;
    
    @Transient
    private String licenseKey;
    
    @Transient
    private Long licenseId;

    @Transient
    private Long activationId;

    public String getUsername() {
        return user != null ? user.getUsername() : null;
    }

    public String getUserFullName() {
        return user != null ? (user.getFullName() != null && !user.getFullName().isEmpty() ? user.getFullName() : user.getUsername()) : null;
    }

    public String getUserEmail() {
        return user != null ? user.getEmail() : null;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        activatedAt = LocalDateTime.now();
    }
}