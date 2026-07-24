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
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "company_id", nullable = false)
    private Long companyId;
    @Column(nullable = false)
    private String name;
    private String version;
    private String description;
    
    @Column(name = "product_id_sku")
    private String productIdSku;
    
    private String category;
    
    private String publisher;
    
    @Column(name = "supported_os")
    private String supportedOs;
    
    private String status = "DRAFT";

    @Column(name = "license_type", nullable = false)
    private String licenseType;
    
    private Double price;
    
    @Column(name = "customer_price")
    private java.math.BigDecimal customerPrice;
    
    @Column(name = "bulk_buyer_price")
    private java.math.BigDecimal bulkBuyerPrice;
    
    @Column(name = "min_bulk_quantity")
    private Integer minBulkQuantity = 1;
    
    @Column(name = "available_to_customers")
    private Boolean availableToCustomers = true;
    
    @Column(name = "available_to_bulk_buyers")
    private Boolean availableToBulkBuyers = false;

    @Column(name = "max_activations")
    private Integer maxActivations = 1;
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    @ManyToOne
    @JoinColumn(name = "company_id", insertable = false, updatable = false)
    private Company company;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<License> licenses;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ProductLicenseConfig> licenseConfigs;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<SoftwareRelease> releases;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}