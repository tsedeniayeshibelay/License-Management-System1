package com.licensemanagement.backend.controller;
import com.licensemanagement.backend.dto.AuthResponse;
import com.licensemanagement.backend.dto.LoginRequest;
import com.licensemanagement.backend.dto.RegisterRequest;
import com.licensemanagement.backend.dto.UpdateProfileRequest;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.service.AuthService;
import com.licensemanagement.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final UserService userService;
    private final com.licensemanagement.backend.service.SystemSettingService systemSettingService;
    private final com.licensemanagement.backend.service.NotificationService notificationService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        if (systemSettingService.isMaintenanceMode()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of(
                            "error", "SERVICE_UNAVAILABLE",
                            "message", "The platform is currently undergoing scheduled maintenance. Registration is temporarily disabled.",
                            "maintenance", true
                    ));
        }
        try {
            User user = new User();
            user.setUsername(request.getUsername());
            user.setEmail(request.getEmail());
            user.setPassword(request.getPassword());
            user.setFullName(request.getFullName());
            user.setCompany(request.getCompany());
            user.setRole(request.getRole() != null ? request.getRole() : "CUSTOMER");
            User registeredUser = userService.registerUser(user);

            try {
                String role = registeredUser.getRole() != null ? registeredUser.getRole() : "User";
                String entityLabel = "COMPANY".equalsIgnoreCase(role) ? "Company" : "User";
                notificationService.notifyAdmins(
                        "newUserAlerts",
                        "NEW_USER",
                        "New " + entityLabel + " Registered",
                        "New " + role.toLowerCase() + " registered: " + registeredUser.getUsername() + " (" + registeredUser.getEmail() + ")",
                        "COMPANY".equalsIgnoreCase(role) ? "/dashboard/companies" : "/dashboard/users"
                );
            } catch (Exception notifEx) {
                // non-blocking
            }

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of(
                            "message", "User registered successfully",
                            "id", registeredUser.getId(),
                            "username", registeredUser.getUsername(),
                            "email", registeredUser.getEmail()
                    ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, jakarta.servlet.http.HttpServletRequest httpRequest) {
        try {
            User user = userService.authenticate(request.getEmail(), request.getPassword());

            // If system is under maintenance, only allow administrators to log in
            if (systemSettingService.isMaintenanceMode() && !"ADMIN".equalsIgnoreCase(user.getRole())) {
                AuthResponse maintResponse = new AuthResponse(null, user.getEmail(), user.getRole(), 
                        "The platform is currently undergoing scheduled maintenance. Customer access is temporarily unavailable.");
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(maintResponse);
            }

            if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
                if (request.getTwoFactorCode() == null || request.getTwoFactorCode().isEmpty()) {
                    AuthResponse response = new AuthResponse(null, user.getEmail(), user.getRole(), "2FA code required");
                    response.setRequires2FA(true);
                    return ResponseEntity.ok(response);
                }
                
                boolean isValid = authService.verify2FACode(user.getEmail(), request.getTwoFactorCode());
                if (!isValid) {
                    throw new com.licensemanagement.backend.exception.UnauthorizedException("Invalid 2FA code!");
                }
            }

            AuthResponse response = authService.login(request, httpRequest);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            AuthResponse errorResponse = new AuthResponse(null, null, null, e.getMessage());
            return ResponseEntity.status(401).body(errorResponse);
        }
    }
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestParam String email) {
        authService.forgotPassword(email);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Password reset link sent to your email!");
        return ResponseEntity.ok(response);
    }
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestParam String token,
                                                             @Valid @RequestBody UpdateProfileRequest request) {
        authService.resetPassword(token, request.getNewPassword(), request.getConfirmPassword());
        Map<String, String> response = new HashMap<>();
        response.put("message", "Password reset successfully!");
        return ResponseEntity.ok(response);
    }
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.substring(7);
        return ResponseEntity.ok(authService.refreshToken(token));
    }
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.substring(7);
        authService.logout(token);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Logged out successfully!");
        return ResponseEntity.ok(response);
    }
    @PostMapping("/2fa/generate")
    public ResponseEntity<Map<String, String>> generate2FA(@RequestParam String email) {
        return ResponseEntity.ok(authService.generate2FACode(email));
    }
    @PostMapping("/2fa/verify")
    public ResponseEntity<Map<String, Object>> verify2FA(@RequestParam String email, @RequestParam String code) {
        boolean verified = authService.verify2FACode(email, code);
        return ResponseEntity.ok(Map.of("verified", verified));
    }
    @PostMapping("/2fa/disable")
    public ResponseEntity<Map<String, String>> disable2FA(@RequestParam String email) {
        authService.disable2FA(email);
        Map<String, String> response = new HashMap<>();
        response.put("message", "2FA has been successfully disabled!");
        return ResponseEntity.ok(response);
    }
}