package com.licensemanagement.backend.repository;
import com.licensemanagement.backend.entity.EmailLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {
    List<EmailLog> findByUserId(Long userId);
    List<EmailLog> findByLicenseId(Long licenseId);
    List<EmailLog> findByEmailType(String emailType);

    @Query("SELECT COUNT(e) > 0 FROM EmailLog e WHERE e.licenseId = :licenseId AND e.userId = :userId AND e.emailType = :emailType AND e.sentAt >= :after")
    boolean hasNotificationBeenSent(@Param("licenseId") Long licenseId, @Param("userId") Long userId, @Param("emailType") String emailType, @Param("after") LocalDateTime after);
}