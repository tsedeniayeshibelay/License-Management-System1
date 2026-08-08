package com.licensemanagement.backend.controller;

import com.licensemanagement.backend.entity.Order;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.exception.ForbiddenException;
import com.licensemanagement.backend.exception.ResourceNotFoundException;
import com.licensemanagement.backend.repository.OrderRepository;
import com.licensemanagement.backend.util.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderRepository orderRepository;
    private final CurrentUserProvider currentUserProvider;

    /**
     * Retrieve all orders belonging strictly to the authenticated customer or bulk buyer.
     * Enforces strict customer data isolation.
     */
    @GetMapping("/my-orders")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BULK_BUYER', 'COMPANY', 'ADMIN')")
    public ResponseEntity<List<Order>> getMyOrders() {
        User currentUser = currentUserProvider.getCurrentUser();
        
        // If a bulk buyer belongs to a company, return company-level purchases
        if ("BULK_BUYER".equals(currentUser.getRole()) && currentUser.getCompanyId() != null) {
            return ResponseEntity.ok(orderRepository.findByCompanyIdOrderByOrderDateDesc(currentUser.getCompanyId()));
        }

        // Retail customer or individual buyer: strictly return their own user orders
        return ResponseEntity.ok(orderRepository.findByUserIdOrderByOrderDateDesc(currentUser.getId()));
    }

    /**
     * Retrieve a specific order by ID with strict ownership validation.
     * Prevents ID enumeration and cross-tenant access.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BULK_BUYER', 'COMPANY', 'ADMIN')")
    public ResponseEntity<Order> getOrderById(@PathVariable Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + id));

        boolean isOwner = order.getUserId() != null && order.getUserId().equals(currentUser.getId());
        boolean isCompanyOwner = "BULK_BUYER".equals(currentUser.getRole())
                && currentUser.getCompanyId() != null
                && currentUser.getCompanyId().equals(order.getCompanyId());
        boolean isAdmin = "ADMIN".equals(currentUser.getRole());

        if (!isOwner && !isCompanyOwner && !isAdmin) {
            throw new ForbiddenException("Access denied: You do not have permission to view or download invoices for this order.");
        }

        return ResponseEntity.ok(order);
    }

    /**
     * Retrieve the latest order associated with a specific license ID with strict ownership validation.
     */
    @GetMapping("/license/{licenseId}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BULK_BUYER', 'COMPANY', 'ADMIN')")
    public ResponseEntity<Order> getOrderByLicenseId(@PathVariable Long licenseId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Order order = orderRepository.findTopByLicenseIdOrderByOrderDateDesc(licenseId)
                .orElseThrow(() -> new ResourceNotFoundException("No order found for license ID: " + licenseId));

        boolean isOwner = order.getUserId() != null && order.getUserId().equals(currentUser.getId());
        boolean isCompanyOwner = "BULK_BUYER".equals(currentUser.getRole())
                && currentUser.getCompanyId() != null
                && currentUser.getCompanyId().equals(order.getCompanyId());
        boolean isAdmin = "ADMIN".equals(currentUser.getRole());

        if (!isOwner && !isCompanyOwner && !isAdmin) {
            throw new ForbiddenException("Access denied: You do not have permission to view or download invoices for this license.");
        }

        return ResponseEntity.ok(order);
    }
}
