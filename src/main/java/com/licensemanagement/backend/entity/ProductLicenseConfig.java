package com.licensemanagement.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "product_license_configs")
public class ProductLicenseConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "license_type", nullable = false)
    private String licenseType;

    @Column(name = "max_devices")
    private Integer maxDevices;

    @Column(name = "max_users")
    private Integer maxUsers;

    @Column(name = "duration_days")
    private Integer durationDays;

    @Column(name = "billing_period")
    private String billingPeriod;

    @Column(name = "grace_period_days")
    private Integer gracePeriodDays;

    @Column(name = "activation_limit")
    private Integer activationLimit;

    @Column(name = "volume_min_quantity")
    private Integer volumeMinQuantity;

    @Column(name = "volume_max_quantity")
    private Integer volumeMaxQuantity;

    @Column(name = "volume_discount")
    private java.math.BigDecimal volumeDiscount;

    @Column(name = "device_unbinding_policy")
    private String deviceUnbindingPolicy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "product_id", insertable = false, updatable = false)
    private Product product;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
