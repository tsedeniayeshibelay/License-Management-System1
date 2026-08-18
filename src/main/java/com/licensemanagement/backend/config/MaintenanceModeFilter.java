package com.licensemanagement.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.licensemanagement.backend.entity.SystemSetting;
import com.licensemanagement.backend.service.SystemSettingService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class MaintenanceModeFilter extends OncePerRequestFilter {

    private final SystemSettingService systemSettingService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // If maintenance mode is NOT active, proceed normally
        if (!systemSettingService.isMaintenanceMode()) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();

        // 1. Whitelisted public & infrastructure endpoints that are always accessible
        if (isAlwaysAllowedPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 2. Check if current authenticated user has ADMIN role
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(a -> "ROLE_ADMIN".equalsIgnoreCase(a.getAuthority()) 
                                || "ADMIN".equalsIgnoreCase(a.getAuthority()));
            if (isAdmin) {
                // Admin has full uninterrupted access to manage platform & turn maintenance off
                filterChain.doFilter(request, response);
                return;
            }
        }

        // 3. For any other request, enforce HTTP 503 Maintenance
        log.info("Maintenance Mode active: Blocked access to {} for user: {}", 
                path, authentication != null ? authentication.getName() : "Anonymous");

        sendMaintenanceResponse(response);
    }

    private boolean isAlwaysAllowedPath(String path) {
        if (path == null) return false;
        return path.equals("/api/system/public-config")
                || path.equals("/api/system/status")
                || path.equals("/api/support/system-status")
                || path.startsWith("/api/auth/login")
                || path.startsWith("/api/auth/2fa")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/swagger-resources")
                || path.startsWith("/webjars")
                || path.equals("/error");
    }

    private void sendMaintenanceResponse(HttpServletResponse response) throws IOException {
        SystemSetting settings = systemSettingService.getSettings();
        response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE); // 503
        response.setContentType("application/json;charset=UTF-8");

        Map<String, Object> body = new HashMap<>();
        body.put("status", 503);
        body.put("error", "SERVICE_UNAVAILABLE");
        body.put("message", "The platform is currently undergoing scheduled maintenance. Please check back shortly.");
        body.put("maintenance", true);
        body.put("platformName", settings.getPlatformName());
        body.put("supportEmail", settings.getSupportEmail());

        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
