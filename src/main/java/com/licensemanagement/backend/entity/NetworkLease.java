package com.licensemanagement.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * FR-07: Represents a time-limited seat checkout from a pooled (VOLUME) license.
 * A lease grants one seat to one device for a fixed duration. When it expires or
 * is released it returns to the pool automatically.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "network_leases")
public class NetworkLease {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "license_id", nullable = false)
    private Long licenseId;

    @Column(name = "device_id", nullable = false)
    private Long deviceId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Unique token the client uses to renew or return the lease. */
    @Column(name = "lease_token", unique = true, nullable = false, length = 64)
    private String leaseToken;

    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt;

    /** When the lease expires. Client must renew before this or seat is reclaimed. */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** Whether the lease has been explicitly returned by the client. */
    @Column(name = "returned")
    private Boolean returned = false;

    /** Machine ID of the checked-out device — used for offline validation. */
    @Column(name = "machine_id")
    private String machineId;

    @PrePersist
    protected void onCreate() {
        issuedAt = LocalDateTime.now();
    }
}
