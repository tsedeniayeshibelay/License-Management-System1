package com.licensemanagement.backend.entity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.licensemanagement.backend.enums.LicenseType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "licenses")
public class License {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "license_key", unique = true, nullable = false, length = 50)
    private String licenseKey;
    @Column(name = "product_id", nullable = false)
    private Long productId;
    @Column(name = "company_id", nullable = false)
    private Long companyId;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "license_type", nullable = false)
    private LicenseType licenseType;
    
    @Column(name = "max_activations")
    private Integer maxActivations = 1;
    @Column(name = "total_seats")
    private Integer totalSeats;
    @Column(name = "used_seats")
    private Integer usedSeats = 0;
    @Column(name = "issued_date", nullable = false)
    private LocalDate issuedDate;
    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;
    @Column(name = "short_code", unique = true, length = 20)
    private String shortCode;
    @Column(nullable = false)
    private String status = "INACTIVE";
    @Column(name = "hardware_locked")
    private Boolean hardwareLocked = false;
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // FR-04: Feature-based licensing — comma-separated feature keys (e.g. "EXPORT,API,ANALYTICS")
    @Column(name = "feature_flags", length = 500)
    private String featureFlags;

    // FR-04: Usage-counted licensing — max allowed uses and current used count
    @Column(name = "usage_limit")
    private Integer usageLimit;

    @Column(name = "usage_count")
    private Integer usageCount = 0;

    // FR-02: Multi-attribute fingerprint tolerance — number of attributes that may differ
    @Column(name = "fingerprint_tolerance")
    private Integer fingerprintTolerance = 1;
    @ManyToOne
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;
    @ManyToOne
    @JoinColumn(name = "product_id", insertable = false, updatable = false)
    private Product product;
    @ManyToOne
    @JoinColumn(name = "company_id", insertable = false, updatable = false)
    private Company company;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "license", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Activation> activations;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "license", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<UsageLog> usageLogs;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "license", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<EmailLog> emailLogs;
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}