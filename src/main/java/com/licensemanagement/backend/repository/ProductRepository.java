package com.licensemanagement.backend.repository;
import com.licensemanagement.backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findByName(String name);
    List<Product> findByCompanyId(Long companyId);
    boolean existsByCompanyId(Long companyId);
    List<Product> findByStatus(String status);
    List<Product> findByStatusAndAvailableToBulkBuyersTrue(String status);
    List<Product> findByStatusAndAvailableToCustomersTrue(String status);
}