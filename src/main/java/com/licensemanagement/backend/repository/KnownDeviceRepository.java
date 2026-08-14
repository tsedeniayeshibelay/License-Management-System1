package com.licensemanagement.backend.repository;

import com.licensemanagement.backend.entity.KnownDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface KnownDeviceRepository extends JpaRepository<KnownDevice, Long> {
    Optional<KnownDevice> findByUserIdAndDeviceIdentifier(Long userId, String deviceIdentifier);
    List<KnownDevice> findByUserIdOrderByLastLoginAtDesc(Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("DELETE FROM KnownDevice kd WHERE kd.userId = :userId")
    void deleteByUserId(@org.springframework.data.repository.query.Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("DELETE FROM KnownDevice kd WHERE kd.userId = :userId AND kd.id = :deviceId")
    int deleteByUserIdAndId(@org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("deviceId") Long deviceId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("DELETE FROM KnownDevice kd WHERE kd.userId = :userId AND kd.deviceIdentifier <> :currentDeviceId")
    int deleteByUserIdAndDeviceIdentifierNot(@org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("currentDeviceId") String currentDeviceId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("DELETE FROM KnownDevice kd WHERE kd.userId = :userId AND kd.id <> :keepDeviceId")
    int deleteByUserIdAndIdNot(@org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("keepDeviceId") Long keepDeviceId);
}
