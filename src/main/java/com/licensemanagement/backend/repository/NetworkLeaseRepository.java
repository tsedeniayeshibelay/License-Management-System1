package com.licensemanagement.backend.repository;

import com.licensemanagement.backend.entity.NetworkLease;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface NetworkLeaseRepository extends JpaRepository<NetworkLease, Long> {

    Optional<NetworkLease> findByLeaseToken(String leaseToken);

    // Count active (not returned, not expired) leases for a license
    @Query("SELECT COUNT(l) FROM NetworkLease l WHERE l.licenseId = :licenseId " +
           "AND l.returned = false AND l.expiresAt > :now")
    long countActiveLeases(@Param("licenseId") Long licenseId,
                           @Param("now") LocalDateTime now);

    // Find expired leases that haven't been returned yet (for cleanup scheduler)
    @Query("SELECT l FROM NetworkLease l WHERE l.returned = false AND l.expiresAt <= :now")
    List<NetworkLease> findExpiredLeases(@Param("now") LocalDateTime now);

    // Find all active leases for a license (for pool status reporting)
    @Query("SELECT l FROM NetworkLease l WHERE l.licenseId = :licenseId " +
           "AND l.returned = false AND l.expiresAt > :now")
    List<NetworkLease> findActiveLeasesByLicense(@Param("licenseId") Long licenseId,
                                                  @Param("now") LocalDateTime now);

    // Check if a device already holds an active lease for a given license
    @Query("SELECT l FROM NetworkLease l WHERE l.licenseId = :licenseId " +
           "AND l.deviceId = :deviceId AND l.returned = false AND l.expiresAt > :now")
    Optional<NetworkLease> findActiveLease(@Param("licenseId") Long licenseId,
                                            @Param("deviceId") Long deviceId,
                                            @Param("now") LocalDateTime now);
}
