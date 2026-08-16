package com.licensemanagement.backend.controller;

import com.licensemanagement.backend.dto.SupportTicketRequest;
import com.licensemanagement.backend.entity.SupportTicket;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.service.SupportService;
import com.licensemanagement.backend.util.CurrentUserProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class SupportController {

    private final SupportService supportService;
    private final CurrentUserProvider currentUserProvider;

    @PostMapping("/api/support/ticket")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SupportTicket> createTicket(@Valid @RequestBody SupportTicketRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        SupportTicket ticket = supportService.createTicket(currentUser, request);
        return ResponseEntity.ok(ticket);
    }

    @GetMapping("/api/support/tickets")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SupportTicket>> getMyTickets() {
        User currentUser = currentUserProvider.getCurrentUser();
        return ResponseEntity.ok(supportService.getUserTickets(currentUser.getId()));
    }

    @GetMapping(value = {"/api/system/status", "/api/support/system-status"})
    public ResponseEntity<Map<String, Object>> getSystemStatus() {
        return ResponseEntity.ok(supportService.getSystemStatus());
    }
}
