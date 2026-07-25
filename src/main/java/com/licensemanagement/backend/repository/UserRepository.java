package com.licensemanagement.backend.repository;
import com.licensemanagement.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    List<User> findByCompanyId(Long companyId);
    boolean existsByCompanyId(Long companyId);
    List<User> findByRole(String role);
    long countByRole(String role);
}