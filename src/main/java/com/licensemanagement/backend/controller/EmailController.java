package com.licensemanagement.backend.controller;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.Product;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.service.EmailService;
import com.licensemanagement.backend.service.LicenseService;
import com.licensemanagement.backend.service.ProductService;
import com.licensemanagement.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import com.licensemanagement.backend.util.CurrentUserProvider;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;
@RestController
@RequestMapping("/api/email")
@RequiredArgsConstructor
public class EmailController {
    private final EmailService emailService;
    private final LicenseService licenseService;
    private final UserService userService;
    private final ProductService productService;
    private final CurrentUserProvider currentUserProvider;
    @PostMapping("/license-created/{licenseId}")
    @PreAuthorize("hasRole('COMPANY')")
    public ResponseEntity<Map<String, String>> sendLicenseCreatedEmail(@PathVariable Long licenseId) {
        Map<String, String> response = new HashMap<>();
        try {
            License license = licenseService.getLicenseById(licenseId);
            User customer = userService.findById(license.getUserId());
            Product product = productService.getProductById(license.getProductId());
            User currentUser = currentUserProvider.getCurrentUser();
            if (!license.getCompanyId().equals(currentUser.getCompanyId())) {
                response.put("error", "❌ You don't own this license!");
                return ResponseEntity.status(403).body(response);
            }
            emailService.sendLicenseCreatedEmail(customer, license, product);
            response.put("message", "o. License email sent to: " + customer.getEmail());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("error", "?O " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("error", "?O Failed to send email: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}