package com.licensemanagement.backend.service;

import com.licensemanagement.backend.dto.AuthResponse;
import com.licensemanagement.backend.dto.LoginRequest;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.exception.BusinessValidationException;
import com.licensemanagement.backend.exception.ResourceNotFoundException;
import com.licensemanagement.backend.exception.UnauthorizedException;
import com.licensemanagement.backend.repository.UserRepository;
import com.licensemanagement.backend.util.JwtUtil;
import com.licensemanagement.backend.util.PasswordValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private PasswordValidator passwordValidator;

    @InjectMocks
    private AuthService authService;

    private User mockUser;

    @BeforeEach
    void setUp() {
        mockUser = new User();
        mockUser.setId(1L);
        mockUser.setEmail("test@example.com");
        mockUser.setPassword("encodedPassword");
        mockUser.setRole("CUSTOMER");
    }

    @Test
    void testLoginSuccess() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@example.com");
        request.setPassword("password");
        
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(mockUser));
        when(passwordEncoder.matches("password", "encodedPassword")).thenReturn(true);
        when(jwtUtil.generateToken("test@example.com", "CUSTOMER")).thenReturn("mock-jwt-token");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("mock-jwt-token", response.getToken());
        assertEquals("test@example.com", response.getEmail());
        assertEquals("CUSTOMER", response.getRole());
    }

    @Test
    void testLoginInvalidCredentials() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@example.com");
        request.setPassword("wrongpassword");
        
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(mockUser));
        when(passwordEncoder.matches("wrongpassword", "encodedPassword")).thenReturn(false);

        assertThrows(UnauthorizedException.class, () -> authService.login(request));
    }

    @Test
    void testLoginUserNotFound() {
        LoginRequest request = new LoginRequest();
        request.setEmail("unknown@example.com");
        request.setPassword("password");
        
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> authService.login(request));
    }

    @Test
    void testForgotPasswordUserNotFound() {
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> authService.forgotPassword("unknown@example.com"));
    }
}
