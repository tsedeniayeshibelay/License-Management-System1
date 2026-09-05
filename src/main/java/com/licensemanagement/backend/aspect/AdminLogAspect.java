package com.licensemanagement.backend.aspect;

import com.licensemanagement.backend.annotation.LogAdminAction;
import com.licensemanagement.backend.entity.AdminLog;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.repository.AdminLogRepository;
import com.licensemanagement.backend.util.CurrentUserProvider;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Arrays;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminLogAspect {

    private final AdminLogRepository adminLogRepository;
    private final CurrentUserProvider currentUserProvider;

    @AfterReturning(value = "@annotation(com.licensemanagement.backend.annotation.LogAdminAction)", returning = "result")
    public void logAction(JoinPoint joinPoint, Object result) {
        try {
            org.aspectj.lang.reflect.MethodSignature signature = (org.aspectj.lang.reflect.MethodSignature) joinPoint.getSignature();
            LogAdminAction logAdminAction = signature.getMethod().getAnnotation(LogAdminAction.class);
            if (logAdminAction == null) return;

            User currentUser = currentUserProvider.getCurrentUser();
            
            if (currentUser != null && "ADMIN".equals(currentUser.getRole())) {
                HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
                String ipAddress = getClientIP(request);
                
                String methodName = signature.getName();
                String args = Arrays.toString(joinPoint.getArgs());
                
                String details = String.format("Method: %s | Args: %s", methodName, args);

                AdminLog adminLog = new AdminLog();
                adminLog.setAdminId(currentUser.getId());
                adminLog.setAction(logAdminAction.action());
                adminLog.setDetails(details);
                adminLog.setIpAddress(ipAddress);
                
                adminLogRepository.save(adminLog);
                log.info("Admin action logged: {} by admin {}", logAdminAction.action(), currentUser.getEmail());
            }
        } catch (Exception e) {
            log.error("Failed to log admin action", e);
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
