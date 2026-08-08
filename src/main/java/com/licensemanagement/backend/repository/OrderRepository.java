package com.licensemanagement.backend.repository;

import com.licensemanagement.backend.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByCompanyIdOrderByOrderDateDesc(Long companyId);
    List<Order> findByUserIdOrderByOrderDateDesc(Long userId);
    List<Order> findByLicenseIdOrderByOrderDateDesc(Long licenseId);
    java.util.Optional<Order> findTopByLicenseIdOrderByOrderDateDesc(Long licenseId);
}
