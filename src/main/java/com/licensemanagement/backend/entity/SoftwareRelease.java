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
@Table(name = "software_releases")
public class SoftwareRelease {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(nullable = false)
    private String version;

    @Column(name = "release_date", nullable = false)
    private LocalDateTime releaseDate;

    @Column(name = "download_url")
    private String downloadUrl;

    @Column(name = "release_notes")
    private String releaseNotes;
    
    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "sha256_hash")
    private String sha256Hash;

    @Column(name = "distribution_method")
    private String distributionMethod = "EXTERNAL";

    private String status = "DRAFT";

    @Column(name = "original_filename")
    private String originalFilename;

    @Column(name = "mime_type")
    private String mimeType;

    @Column(name = "internal_storage_path")
    private String internalStoragePath;

    @Column(name = "is_critical", nullable = false)
    private Boolean isCritical = false;

    @ManyToOne
    @JoinColumn(name = "product_id", insertable = false, updatable = false)
    private Product product;
    
    @PrePersist
    protected void onCreate() {
        if (releaseDate == null) {
            releaseDate = LocalDateTime.now();
        }
    }
}
