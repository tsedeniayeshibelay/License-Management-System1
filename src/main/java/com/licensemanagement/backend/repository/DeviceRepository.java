package com.licensemanagement.backend.repository;
import com.licensemanagement.backend.entity.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
@Repository
public interface DeviceRepository extends JpaRepository<Device, Long> {
    List<Device> findByUserId(Long userId);
    Optional<Device> findByMachineId(String machineId);
    List<Device> findByUserIdAndIsActiveTrue(Long userId);
    long countByUserIdAndIsActiveTrue(Long userId);
    List<Device> findByUserIdIn(List<Long> userIds);
    List<Device> findByUserIdInAndIsActiveTrue(List<Long> userIds);

    @org.springframework.data.jpa.repository.Query("SELECT d FROM Device d LEFT JOIN FETCH d.user ORDER BY d.createdAt DESC")
    List<Device> findAllWithUser();
}
