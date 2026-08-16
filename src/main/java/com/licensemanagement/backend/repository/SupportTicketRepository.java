package com.licensemanagement.backend.repository;

import com.licensemanagement.backend.entity.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    List<SupportTicket> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<SupportTicket> findByUserId(Long userId);
    Optional<SupportTicket> findByIdAndUserId(Long id, Long userId);
}
