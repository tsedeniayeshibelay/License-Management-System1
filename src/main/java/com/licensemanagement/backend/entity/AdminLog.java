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
@Table(name = "admin_logs")
public class AdminLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "admin_id", nullable = false)
    private Long adminId;
    @Column(nullable = false)
    private String action;
    @Column(columnDefinition = "TEXT")
    private String details;
    @Column(name = "ip_address")
    private String ipAddress;
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    @ManyToOne
    @JoinColumn(name = "admin_id", insertable = false, updatable = false)
    private User admin;
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}