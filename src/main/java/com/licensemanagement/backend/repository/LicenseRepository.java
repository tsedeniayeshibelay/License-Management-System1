package com.licensemanagement.backend.repository;
import com.licensemanagement.backend.entity.License;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
public interface LicenseRepository extends JpaRepository<License, Long> {
    Optional<License> findByLicenseKey(String licenseKey);
    boolean existsByLicenseKey(String licenseKey);
    List<License> findByUserId(Long userId);
    List<License> findByCompanyId(Long companyId);
    List<License> findByProductId(Long productId);
    List<License> findByStatus(String status);
    List<License> findByExpiryDateBefore(LocalDate date);
    List<License> findByExpiryDate(LocalDate date);
    Page<License> findByUserId(Long userId, Pageable pageable);
    Page<License> findByCompanyId(Long companyId, Pageable pageable);
    @Query("SELECT COUNT(a) FROM Activation a WHERE a.licenseId = :licenseId AND a.isActive = true")
    long countActivationsByLicenseId(@Param("licenseId") Long licenseId);
    boolean existsByProductId(Long productId);
    boolean existsByCompanyId(Long companyId);

    @Query("SELECT l FROM License l JOIN FETCH l.product JOIN FETCH l.user")
    List<License> findAllWithDetails();

    @Query("SELECT l FROM License l JOIN FETCH l.product JOIN FETCH l.user WHERE l.companyId = :companyId")
    List<License> findByCompanyIdWithDetails(@Param("companyId") Long companyId);
}