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
@Table(name = "email_logs")
public class EmailLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "license_id", nullable = false)
    private Long licenseId;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(name = "email_type", nullable = false)
    private String emailType;
    private String subject;
    @Column(columnDefinition = "TEXT")
    private String content;
    @Column(name = "sent_at")
    private LocalDateTime sentAt;
    @ManyToOne
    @JoinColumn(name = "license_id", insertable = false, updatable = false)
    private License license;
    @ManyToOne
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;
    @PrePersist
    protected void onCreate() {
        sentAt = LocalDateTime.now();
    }
}