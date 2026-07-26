package com.licensemanagement.backend.repository;
import com.licensemanagement.backend.entity.Activation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public interface ActivationRepository extends JpaRepository<Activation, Long> {
    List<Activation> findByLicenseId(Long licenseId);
    long countByLicenseIdAndIsActiveTrue(Long licenseId);
    List<Activation> findAll();
    List<Activation> findByLicenseIdAndIsActiveTrue(Long licenseId);
    boolean existsByLicenseIdAndDeviceIdAndIsActiveTrue(Long licenseId, Long deviceId);
    java.util.Optional<Activation> findByLicenseIdAndDeviceIdAndIsActiveTrue(Long licenseId, Long deviceId);
    List<Activation> findByDeviceIdAndIsActiveTrue(Long deviceId);
    List<Activation> findByDeviceId(Long deviceId);
    List<Activation> findByLicenseIdInAndIsActiveTrue(List<Long> licenseIds);
    
    @org.springframework.data.jpa.repository.Query("SELECT DATE(a.activatedAt) as date, COUNT(a) FROM Activation a WHERE a.isActive = true AND a.activatedAt >= :startDate GROUP BY DATE(a.activatedAt) ORDER BY DATE(a.activatedAt) ASC")
    List<Object[]> countActivationsByDateAfter(@org.springframework.data.repository.query.Param("startDate") java.time.LocalDateTime startDate);

    @org.springframework.data.jpa.repository.Query("SELECT a FROM Activation a LEFT JOIN FETCH a.device d LEFT JOIN FETCH a.license l ORDER BY a.activatedAt DESC")
    List<Activation> findAllWithDetails();

    @org.springframework.data.jpa.repository.Query("SELECT a FROM Activation a LEFT JOIN FETCH a.device d WHERE a.licenseId = :licenseId ORDER BY a.activatedAt DESC")
    List<Activation> findByLicenseIdWithDevice(@org.springframework.data.repository.query.Param("licenseId") Long licenseId);

    @org.springframework.data.jpa.repository.Query("SELECT a FROM Activation a JOIN FETCH a.license l JOIN FETCH a.device d WHERE l.companyId = :companyId ORDER BY a.activatedAt DESC")
    List<Activation> findByCompanyIdWithDetails(@org.springframework.data.repository.query.Param("companyId") Long companyId);
}