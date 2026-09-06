package com.licensemanagement.backend.repository;

import com.licensemanagement.backend.entity.PasswordResetToken;
import com.licensemanagement.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByToken(String token);
    Optional<PasswordResetToken> findByCode(String code);

    @Transactional
    @Modifying
    void deleteByUser(User user);
}
