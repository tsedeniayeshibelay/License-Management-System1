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
@Table(name = "companies")
public class Company {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String name;
    @Column(unique = true, nullable = false)
    private String email;
    private String phone;
    @Column(columnDefinition = "TEXT")
    private String address;
    private String website;
    private String industry;
    @Column(nullable = false)
    private String status = "ACTIVE";
    
    @Column(name = "webhook_url")
    private String webhookUrl;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "companyEntity", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<User> users;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "company", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Product> products;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "company", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<License> licenses;
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}