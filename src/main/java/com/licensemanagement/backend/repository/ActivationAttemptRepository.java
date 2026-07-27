package com.licensemanagement.backend.repository;

import com.licensemanagement.backend.entity.ActivationAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface ActivationAttemptRepository extends JpaRepository<ActivationAttempt, Long> {

    @Query("SELECT COUNT(DISTINCT a.country) FROM ActivationAttempt a WHERE a.licenseKey = :licenseKey AND a.attemptedAt >= :timestamp AND a.country != 'Unknown'")
    long countDistinctCountriesByLicenseKeyAndAttemptedAtAfter(
            @Param("licenseKey") String licenseKey, 
            @Param("timestamp") LocalDateTime timestamp
    );
    
    @Query("SELECT a.country, COUNT(a) FROM ActivationAttempt a WHERE a.successful = true AND a.country != 'Localhost' GROUP BY a.country ORDER BY COUNT(a) DESC LIMIT 5")
    java.util.List<Object[]> findTop5CountriesBySuccessfulTrue();
}
