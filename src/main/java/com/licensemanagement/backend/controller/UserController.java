package com.licensemanagement.backend.controller;
import com.licensemanagement.backend.dto.AuthResponse;
import com.licensemanagement.backend.dto.ChangePasswordRequest;
import com.licensemanagement.backend.dto.LoginRequest;
import com.licensemanagement.backend.dto.RegisterRequest;
import com.licensemanagement.backend.dto.UpdateProfileRequest;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.exception.ForbiddenException;
import com.licensemanagement.backend.service.UserService;
import com.licensemanagement.backend.util.CurrentUserProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.licensemanagement.backend.annotation.LogAdminAction;

import com.licensemanagement.backend.repository.KnownDeviceRepository;
import com.licensemanagement.backend.service.AuthService;
import com.licensemanagement.backend.util.JwtUtil;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    private final CurrentUserProvider currentUserProvider;
    private final AuthService authService;
    private final JwtUtil jwtUtil;
    private final KnownDeviceRepository knownDeviceRepository;
    // Registration and Login endpoints have been moved to AuthController to ensure a single source of truth at /api/auth
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        if (!currentUser.getRole().equals("ADMIN") && !currentUser.getId().equals(id)) {
            throw new ForbiddenException("Access denied! You can only view your own profile.");
        }
        return ResponseEntity.ok(userService.findById(id));
    }
    @GetMapping("/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<User> getProfile() {
        User user = currentUserProvider.getCurrentUser();
        return ResponseEntity.ok(user);
    }
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @Valid @RequestBody User user) {
        User currentUser = currentUserProvider.getCurrentUser();
        if (!currentUser.getRole().equals("ADMIN") && !currentUser.getId().equals(id)) {
            throw new ForbiddenException("Access denied! You can only update your own profile.");
        }
        boolean isAdmin = "ADMIN".equals(currentUser.getRole());
        return ResponseEntity.ok(userService.updateUser(id, user, isAdmin));
    }
    @PutMapping("/{id}/password")
    public ResponseEntity<Void> updatePassword(
            @PathVariable Long id, 
            @RequestParam String newPassword,
            @RequestParam(required = false) Boolean forceChange) {
        User currentUser = currentUserProvider.getCurrentUser();
        if (!currentUser.getRole().equals("ADMIN") && !currentUser.getId().equals(id)) {
            throw new ForbiddenException("Access denied! You can only update your own password.");
        }
        userService.updatePassword(id, newPassword, forceChange);
        return ResponseEntity.ok().build();
    }
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @LogAdminAction(action = "DELETE_USER")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        userService.deleteUser(id, currentUser != null ? currentUser.getId() : null);
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/exists/email")
    public ResponseEntity<Boolean> existsByEmail(@RequestParam String email) {
        return ResponseEntity.ok(userService.existsByEmail(email));
    }
    @PutMapping("/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<User> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        User updatedUser = userService.updateProfile(currentUser.getId(), request);
        return ResponseEntity.ok(updatedUser);
    }
    @PutMapping("/profile/password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        userService.changePassword(currentUser.getId(), request);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Password updated successfully!");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profile/devices")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<com.licensemanagement.backend.entity.KnownDevice>> getMyDevices(jakarta.servlet.http.HttpServletRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        List<com.licensemanagement.backend.entity.KnownDevice> devices = knownDeviceRepository.findByUserIdOrderByLastLoginAtDesc(currentUser.getId());
        if (devices.isEmpty()) {
            com.licensemanagement.backend.entity.KnownDevice currentDevice = new com.licensemanagement.backend.entity.KnownDevice();
            currentDevice.setUserId(currentUser.getId());
            currentDevice.setDeviceIdentifier(java.util.UUID.randomUUID().toString());
            String ua = request.getHeader("User-Agent");
            currentDevice.setDeviceName(authService.parseDeviceName(ua));
            String ip = authService.extractIpAddress(request);
            currentDevice.setIpAddress(ip);
            currentDevice.setFirstSeenAt(java.time.LocalDateTime.now());
            currentDevice.setLastLoginAt(java.time.LocalDateTime.now());
            knownDeviceRepository.save(currentDevice);
            devices = java.util.Collections.singletonList(currentDevice);
        }
        return ResponseEntity.ok(devices);
    }

    @DeleteMapping("/profile/devices/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> revokeDevice(@PathVariable Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        knownDeviceRepository.deleteByUserIdAndId(currentUser.getId(), id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Session revoked successfully.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/profile/devices/revoke-others")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> revokeOtherDevices(
            @RequestParam(required = false) String currentDeviceId,
            @RequestParam(required = false) Long keepDeviceId) {
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentDeviceId != null && !currentDeviceId.isBlank()) {
            knownDeviceRepository.deleteByUserIdAndDeviceIdentifierNot(currentUser.getId(), currentDeviceId);
        } else if (keepDeviceId != null) {
            knownDeviceRepository.deleteByUserIdAndIdNot(currentUser.getId(), keepDeviceId);
        } else {
            List<com.licensemanagement.backend.entity.KnownDevice> devices = knownDeviceRepository.findByUserIdOrderByLastLoginAtDesc(currentUser.getId());
            if (!devices.isEmpty()) {
                knownDeviceRepository.deleteByUserIdAndIdNot(currentUser.getId(), devices.get(0).getId());
            }
        }
        Map<String, String> response = new HashMap<>();
        response.put("message", "Signed out of all other sessions successfully.");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/export-data")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> exportMyData() {
        User currentUser = currentUserProvider.getCurrentUser();
        return ResponseEntity.ok(userService.exportUserData(currentUser));
    }

    @GetMapping("/login-history/csv")
    @PreAuthorize("isAuthenticated()")
    public void exportLoginHistoryCSV(jakarta.servlet.http.HttpServletResponse response) throws Exception {
        User currentUser = currentUserProvider.getCurrentUser();
        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=\"login-history.csv\"");

        List<com.licensemanagement.backend.entity.KnownDevice> devices = knownDeviceRepository.findByUserIdOrderByLastLoginAtDesc(currentUser.getId());
        java.io.PrintWriter writer = response.getWriter();
        writer.println("Timestamp,Device / Browser,IP Address,Status,Device Identifier,First Seen");

        java.time.LocalDateTime ninetyDaysAgo = java.time.LocalDateTime.now().minusDays(90);
        boolean written = false;

        if (devices != null && !devices.isEmpty()) {
            for (com.licensemanagement.backend.entity.KnownDevice dev : devices) {
                java.time.LocalDateTime lastLogin = dev.getLastLoginAt() != null ? dev.getLastLoginAt() : dev.getFirstSeenAt();
                if (lastLogin == null || lastLogin.isAfter(ninetyDaysAgo)) {
                    String time = lastLogin != null ? lastLogin.toString() : "N/A";
                    String name = dev.getDeviceName() != null ? dev.getDeviceName().replace("\"", "\"\"") : "Browser Session";
                    String ip = dev.getIpAddress() != null ? dev.getIpAddress() : "127.0.0.1";
                    String status = "Successful Login";
                    String devId = dev.getDeviceIdentifier() != null ? dev.getDeviceIdentifier() : "N/A";
                    String firstSeen = dev.getFirstSeenAt() != null ? dev.getFirstSeenAt().toString() : "N/A";

                    writer.println(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"",
                            time, name, ip, status, devId, firstSeen));
                    written = true;
                }
            }
        }

        if (!written) {
            writer.println(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"",
                    java.time.LocalDateTime.now().toString(), "Current Admin Session", "127.0.0.1", "Successful Login", "current-device", java.time.LocalDateTime.now().toString()));
        }
        writer.flush();
    }

    @PostMapping("/delete-account")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> deleteAccount(
            @Valid @RequestBody com.licensemanagement.backend.dto.DeleteAccountRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User currentUser = currentUserProvider.getCurrentUser();
        userService.deleteAccount(currentUser.getId(), request.getPassword());
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            authService.logout(authHeader.substring(7));
        }
        Map<String, String> response = new HashMap<>();
        response.put("message", "Account successfully deleted. All active sessions and activations have been terminated.");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/exists/username")
    public ResponseEntity<Boolean> existsByUsername(@RequestParam String username) {
        return ResponseEntity.ok(userService.existsByUsername(username));
    }
}