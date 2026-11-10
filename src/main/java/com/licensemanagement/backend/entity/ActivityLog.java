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
@Table(name = "activity_logs")
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(nullable = false)
    private String action;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "license_id")
    private Long licenseId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // FR-09: Tamper-evident hash chain — SHA-256 of this entry's canonical fields
    @Column(name = "entry_hash", length = 64)
    private String entryHash;

    // FR-09: SHA-256 of the previous entry's entry_hash (chain link)
    @Column(name = "previous_hash", length = 64)
    private String previousHash;

    // FR-09: RSA signature over (entry_hash + previous_hash)
    @Column(name = "entry_signature", columnDefinition = "TEXT")
    private String entrySignature;

    @ManyToOne
    @JoinColumn(name = "company_id", insertable = false, updatable = false)
    private Company company;

    @ManyToOne
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "license_id", insertable = false, updatable = false)
    private License license;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
