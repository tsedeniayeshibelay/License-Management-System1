package com.licensemanagement.backend.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String email;
    private String role;
    private String message;
    private boolean requires2FA;
    private boolean mustChangePassword;
    
    public AuthResponse(String token, String email, String role, String message) {
        this.token = token;
        this.email = email;
        this.role = role;
        this.message = message;
        this.requires2FA = false;
        this.mustChangePassword = false;
    }
}