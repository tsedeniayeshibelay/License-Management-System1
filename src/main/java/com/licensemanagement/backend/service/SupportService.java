package com.licensemanagement.backend.service;

import com.licensemanagement.backend.dto.SupportTicketRequest;
import com.licensemanagement.backend.entity.SupportTicket;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.repository.LicenseRepository;
import com.licensemanagement.backend.repository.SupportTicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SupportService {

    private final SupportTicketRepository supportTicketRepository;
    private final LicenseRepository licenseRepository;
    private final JdbcTemplate jdbcTemplate;
    private final JavaMailSender mailSender;

    @Transactional
    public SupportTicket createTicket(User user, SupportTicketRequest request) {
        SupportTicket ticket = new SupportTicket();
        ticket.setUserId(user.getId());
        ticket.setCategory(request.getCategory());
        ticket.setSubject(request.getSubject());
        ticket.setMessage(request.getMessage());
        ticket.setPriority(request.getPriority() != null ? request.getPriority().toUpperCase() : "MEDIUM");
        ticket.setStatus("OPEN");
        ticket.setCreatedAt(LocalDateTime.now());
        return supportTicketRepository.save(ticket);
    }

    public List<SupportTicket> getUserTickets(Long userId) {
        return supportTicketRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Map<String, Object> getSystemStatus() {
        Map<String, Object> response = new LinkedHashMap<>();
        List<Map<String, String>> services = new ArrayList<>();

        // 1. Core REST API & Security
        services.add(Map.of(
                "name", "Core API Gateway",
                "status", "OPERATIONAL",
                "description", "RESTful routing, rate limiting, and JWT authentication service"
        ));

        // 2. Database probe
        boolean dbOk = false;
        try {
            Integer check = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            dbOk = (check != null && check == 1);
        } catch (Exception e) {
            log.warn("Health check: Database probe failed: {}", e.getMessage());
        }
        services.add(Map.of(
                "name", "Database Engine",
                "status", dbOk ? "OPERATIONAL" : "DEGRADED",
                "description", "PostgreSQL transactional data store and query execution"
        ));

        // 3. Licensing Engine probe
        boolean licenseEngineOk = false;
        try {
            long count = licenseRepository.count();
            licenseEngineOk = (count >= 0);
        } catch (Exception e) {
            log.warn("Health check: Licensing engine probe failed: {}", e.getMessage());
        }
        services.add(Map.of(
                "name", "Licensing & Cryptography Engine",
                "status", licenseEngineOk ? "OPERATIONAL" : "DEGRADED",
                "description", "Hardware binding, license validation, and offline signature verification"
        ));

        // 4. Mailer Service probe
        boolean mailerOk = false;
        try {
            if (mailSender instanceof JavaMailSenderImpl mailSenderImpl) {
                // Check if host and port are configured
                String host = mailSenderImpl.getHost();
                if (host != null && !host.isBlank()) {
                    mailerOk = true;
                }
            } else if (mailSender != null) {
                mailerOk = true;
            }
        } catch (Exception e) {
            log.warn("Health check: Mailer probe failed: {}", e.getMessage());
        }
        services.add(Map.of(
                "name", "Mailer & Notification Relay",
                "status", mailerOk ? "OPERATIONAL" : "DEGRADED",
                "description", "SMTP transaction relay for security alerts and activation notifications"
        ));

        boolean allOperational = dbOk && licenseEngineOk && mailerOk;

        response.put("status", allOperational ? "OPERATIONAL" : "DEGRADED");
        response.put("timestamp", LocalDateTime.now().toString());
        response.put("services", services);

        return response;
    }
}
