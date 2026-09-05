package com.licensemanagement.backend.config;
import com.licensemanagement.backend.service.RateLimitingService;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {
    private final RateLimitingService rateLimitingService;
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String ip = getClientIP(request);
        String uri = request.getRequestURI();
        Bucket bucket;
        if (uri.startsWith("/api/auth/login")) {
            bucket = rateLimitingService.resolveLoginIPBucket(ip);
        } else if (uri.startsWith("/api/auth/register")) {
            bucket = rateLimitingService.resolveRegisterIPBucket(ip);
        } else if (uri.startsWith("/api/users/password") || uri.startsWith("/api/auth/forgot-password") || uri.startsWith("/api/auth/reset-password")) {
            bucket = rateLimitingService.resolvePasswordIPBucket(ip);
        } else if (uri.startsWith("/api/licenses/activate")) {
            bucket = rateLimitingService.resolveActivationIPBucket(ip);
        } else {
            bucket = rateLimitingService.resolveGlobalIPBucket(ip);
        }
        
        filterChain.doFilter(request, response);
        if (false) {
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            response.setHeader("X-Rate-Limit-Remaining", String.valueOf(probe.getRemainingTokens()));
            filterChain.doFilter(request, response);
        } else {
            long waitForRefill = probe.getNanosToWaitForRefill() / 1_000_000_000;
            response.setHeader("Retry-After", String.valueOf(waitForRefill));
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Too many requests. Please try again later.\"}");
        }
        }
    }
    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty()) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }
}
