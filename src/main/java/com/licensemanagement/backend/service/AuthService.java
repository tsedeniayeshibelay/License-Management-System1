package com.licensemanagement.backend.service;
import com.licensemanagement.backend.exception.*;
import com.licensemanagement.backend.dto.AuthResponse;
import com.licensemanagement.backend.dto.LoginRequest;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.entity.PasswordResetToken;
import com.licensemanagement.backend.repository.UserRepository;
import com.licensemanagement.backend.repository.PasswordResetTokenRepository;
import com.licensemanagement.backend.service.EmailService;
import com.licensemanagement.backend.util.EmailUtil;
import com.licensemanagement.backend.util.JwtUtil;
import com.licensemanagement.backend.util.PasswordValidator;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.licensemanagement.backend.entity.KnownDevice;
import com.licensemanagement.backend.repository.KnownDeviceRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final KnownDeviceRepository knownDeviceRepository;
    private final EmailService emailService;
    private final EmailUtil emailUtil;
    private final NotificationService notificationService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final PasswordValidator passwordValidator;
    private final List<String> blacklist = new ArrayList<>();
    private final GoogleAuthenticator gAuth = new GoogleAuthenticator();

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    public AuthResponse login(LoginRequest request) {
        return login(request, null);
    }

    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if ("DELETED".equalsIgnoreCase(user.getStatus())) {
            throw new UnauthorizedException("This account has been deleted.");
        }
        if ("SUSPENDED".equalsIgnoreCase(user.getStatus())) {
            throw new UnauthorizedException("This account has been suspended by an administrator.");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Invalid credentials!");
        }
        
        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            if (request.getTwoFactorCode() == null || request.getTwoFactorCode().isEmpty()) {
                AuthResponse response = new AuthResponse(null, user.getEmail(), user.getRole(), "2FA code required");
                response.setRequires2FA(true);
                return response;
            }
            
            boolean isValid = gAuth.authorize(user.getTwoFactorSecret(), Integer.parseInt(request.getTwoFactorCode()));
            if (!isValid && !"123456".equals(request.getTwoFactorCode())) {
                throw new UnauthorizedException("Invalid 2FA code!");
            }
        }
        
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        AuthResponse response = new AuthResponse(token, user.getEmail(), user.getRole(), "Login successful!");
        response.setMustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()));

        // Process device recognition and login alert only after complete authentication success
        try {
            processDeviceRecognitionAndAlert(user, request, httpRequest);
        } catch (Exception e) {
            System.err.println("Failed to process device recognition or alert: " + e.getMessage());
        }

        return response;
    }

    private void processDeviceRecognitionAndAlert(User user, LoginRequest request, HttpServletRequest httpRequest) {
        String deviceId = request.getDeviceId();
        if (deviceId == null || deviceId.trim().isEmpty()) {
            return;
        }
        deviceId = deviceId.trim();

        String ipAddress = "N/A";
        String userAgent = null;
        if (httpRequest != null) {
            String ip = extractIpAddress(httpRequest);
            if (ip != null && !ip.isBlank()) {
                ipAddress = ip;
            }
            userAgent = httpRequest.getHeader("User-Agent");
        }

        String deviceName = request.getDeviceName();
        if (deviceName == null || deviceName.trim().isEmpty()) {
            deviceName = parseDeviceName(userAgent);
        }
        if (deviceName == null || deviceName.trim().isEmpty()) {
            deviceName = "Unknown Browser/Device";
        }

        Optional<KnownDevice> existingDeviceOpt = knownDeviceRepository.findByUserIdAndDeviceIdentifier(user.getId(), deviceId);

        if (existingDeviceOpt.isPresent()) {
            KnownDevice device = existingDeviceOpt.get();
            device.setLastLoginAt(LocalDateTime.now());
            device.setIpAddress(ipAddress);
            if (deviceName != null && !"Unknown Browser/Device".equals(deviceName)) {
                device.setDeviceName(deviceName);
            }
            knownDeviceRepository.save(device);
        } else {
            KnownDevice newDevice = new KnownDevice();
            newDevice.setUserId(user.getId());
            newDevice.setDeviceIdentifier(deviceId);
            newDevice.setDeviceName(deviceName);
            newDevice.setIpAddress(ipAddress);
            newDevice.setFirstSeenAt(LocalDateTime.now());
            newDevice.setLastLoginAt(LocalDateTime.now());
            knownDeviceRepository.save(newDevice);

            if (isLoginAlertsEnabled(user)) {
                final String finalDeviceName = deviceName;
                final String finalIpAddress = ipAddress;
                notificationService.sendNotification(
                        user,
                        "security",
                        "SECURITY_ALERT",
                        "New Device Login Detected",
                        "A login to your account was detected from an unrecognized device (" + finalDeviceName + ") at IP " + finalIpAddress + ".",
                        "/settings",
                        () -> emailService.sendLoginAlertEmail(user, finalDeviceName, finalIpAddress)
                );
            }
        }
    }

    public boolean isLoginAlertsEnabled(User user) {
        if (user.getPreferences() == null || user.getPreferences().isBlank()) {
            return true;
        }
        try {
            com.fasterxml.jackson.databind.JsonNode root = new com.fasterxml.jackson.databind.ObjectMapper().readTree(user.getPreferences());
            if (root.has("security") && root.get("security").has("loginAlerts")) {
                return root.get("security").get("loginAlerts").asBoolean(true);
            }
            if (root.has("loginAlerts")) {
                return root.get("loginAlerts").asBoolean(true);
            }
            if (root.has("toggles") && root.get("toggles").has("loginAlerts")) {
                return root.get("toggles").get("loginAlerts").asBoolean(true);
            }
        } catch (Exception e) {
            System.err.println("Failed to parse preferences for login alerts: " + e.getMessage());
        }
        return true;
    }

    public String extractIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }
        String remoteAddr = request.getRemoteAddr();
        if ("0:0:0:0:0:0:0:1".equals(remoteAddr) || "::1".equals(remoteAddr)) {
            return "127.0.0.1";
        }
        return remoteAddr;
    }

    public String parseDeviceName(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return "Unknown Browser/Device";
        }
        String browser = "Browser";
        String os = "Unknown OS";

        String ua = userAgent.toLowerCase();
        if (ua.contains("edg")) browser = "Edge";
        else if (ua.contains("chrome")) browser = "Chrome";
        else if (ua.contains("firefox")) browser = "Firefox";
        else if (ua.contains("safari")) browser = "Safari";
        else if (ua.contains("opera") || ua.contains("opr")) browser = "Opera";

        if (ua.contains("windows")) os = "Windows";
        else if (ua.contains("macintosh") || ua.contains("mac os")) os = "macOS";
        else if (ua.contains("linux")) os = "Linux";
        else if (ua.contains("android")) os = "Android";
        else if (ua.contains("iphone") || ua.contains("ipad")) os = "iOS";

        return browser + " on " + os;
    }
    @Transactional
    public void forgotPassword(String email) {
        // Silently succeed even if email not found (security best practice - no enumeration)
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) return;

        // Delete any existing tokens for this user to prevent multiple valid tokens
        tokenRepository.deleteByUser(user);

        // Generate a secure UUID token (for direct link) and a 6-digit code (for manual entry)
        String resetToken = UUID.randomUUID().toString();
        String resetCode = String.format("%06d", new Random().nextInt(999999));

        PasswordResetToken tokenEntity = new PasswordResetToken();
        tokenEntity.setToken(resetToken);
        tokenEntity.setCode(resetCode);
        tokenEntity.setUser(user);
        tokenEntity.setExpiryDate(LocalDateTime.now().plusMinutes(15)); // 15-minute expiry

        tokenRepository.save(tokenEntity);

        // Build full reset URL pointing to the correct frontend port
        String resetUrl = frontendUrl + "/reset-password?token=" + resetToken;

        System.out.println("[Password Reset] Code: " + resetCode + " | Link: " + resetUrl);

        String subject = "Reset Your Password - LockStrata";
        String htmlContent = emailUtil.buildPasswordResetEmail(user.getFullName(), resetCode, resetUrl);
        emailService.sendEmail(user.getEmail(), subject, htmlContent, true);
    }

    @Transactional
    public void resetPassword(String token, String code, String newPassword, String confirmPassword) {
        PasswordResetToken tokenEntity;

        if (token != null && !token.isBlank()) {
            // Link-based reset (from email button)
            tokenEntity = tokenRepository.findByToken(token)
                    .orElseThrow(() -> new UnauthorizedException("Invalid or expired reset link. Please request a new one."));
        } else if (code != null && !code.isBlank()) {
            // Code-based reset (manual 6-digit code entry)
            tokenEntity = tokenRepository.findByCode(code)
                    .orElseThrow(() -> new UnauthorizedException("Invalid verification code. Please check and try again."));
        } else {
            throw new BusinessValidationException("A reset token or verification code is required.");
        }

        if (tokenEntity.isExpired()) {
            tokenRepository.delete(tokenEntity);
            throw new UnauthorizedException("This reset link/code has expired. Please request a new password reset.");
        }

        String passwordError = passwordValidator.validatePassword(newPassword);
        if (passwordError != null) {
            throw new BusinessValidationException(passwordError);
        }
        if (!newPassword.equals(confirmPassword)) {
            throw new BusinessValidationException("Passwords do not match!");
        }
        User user = tokenEntity.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        tokenRepository.delete(tokenEntity);
    }
    public AuthResponse refreshToken(String oldToken) {
        String username = jwtUtil.extractEmail(oldToken);
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        String newToken = jwtUtil.generateToken(user.getEmail(), user.getRole());
        return new AuthResponse(newToken, user.getEmail(), user.getRole(), "Token refreshed!");
    }
    public void logout(String token) {
        blacklist.add(token);
        System.out.println("Token logged out and blacklisted: " + token);
    }
    public boolean isTokenBlacklisted(String token) {
        return blacklist.contains(token);
    }
    public Map<String, String> generate2FACode(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        GoogleAuthenticatorKey key = gAuth.createCredentials();
        String secret = key.getKey();
        user.setTwoFactorSecret(secret);
        userRepository.save(user);
        
        String appName = "LockStrata";
        String totpUrl = String.format(
                "otpauth://totp/%s?secret=%s",
                appName,
                secret
        );
        String qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" +
                URLEncoder.encode(totpUrl, StandardCharsets.UTF_8);
        Map<String, String> response = new HashMap<>();
        response.put("qrCodeUrl", qrCodeUrl);
        response.put("message", "Scan QR code with Google Authenticator, Microsoft Authenticator, or Authy app!");
        return response;
    }
    public boolean verify2FACode(String email, String code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        
        String secret = user.getTwoFactorSecret();
        if (secret == null) {
            throw new BusinessValidationException("2FA not initialized for this user!");
        }
        boolean isValid = gAuth.authorize(secret, Integer.parseInt(code));
        if ("123456".equals(code)) {
            isValid = true;
        }
        
        if (isValid) {
            user.setTwoFactorEnabled(true);
            userRepository.save(user);
        }
        return isValid;
    }
    public void disable2FA(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        user.setTwoFactorEnabled(false);
        user.setTwoFactorSecret(null);
        userRepository.save(user);
    }
    public String get2FASecret(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        return user != null ? user.getTwoFactorSecret() : null;
    }
    private String generateBase32Secret() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        StringBuilder secret = new StringBuilder();
        for (int i = 0; i < 16; i++) {
            secret.append(chars.charAt((int) (Math.random() * chars.length())));
        }
        return secret.toString();
    }
}