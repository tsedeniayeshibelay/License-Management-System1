package com.licensemanagement.backend.repository;
import com.licensemanagement.backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findAllByName(String name);
    default Optional<Product> findByName(String name) {
        return findAllByName(name).stream().findFirst();
    }
    List<Product> findByCompanyId(Long companyId);
    boolean existsByCompanyId(Long companyId);
    List<Product> findByStatus(String status);
    List<Product> findByStatusAndAvailableToBulkBuyersTrue(String status);
    List<Product> findAllByProductIdSku(String productIdSku);
    default Optional<Product> findByProductIdSku(String productIdSku) {
        return findAllByProductIdSku(productIdSku).stream().findFirst();
    }
    List<Product> findAllByProductIdSkuIgnoreCase(String productIdSku);
    default Optional<Product> findByProductIdSkuIgnoreCase(String productIdSku) {
        return findAllByProductIdSkuIgnoreCase(productIdSku).stream().findFirst();
    }
    List<Product> findByStatusAndAvailableToCustomersTrue(String status);
}