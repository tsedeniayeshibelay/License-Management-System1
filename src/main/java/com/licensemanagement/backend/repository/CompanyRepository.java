package com.licensemanagement.backend.repository;
import com.licensemanagement.backend.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {
    Optional<Company> findByEmail(String email);
    List<Company> findByStatus(String status);
    Optional<Company> findByName(String name);
    boolean existsByEmail(String email);
}