package com.licensemanagement.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String fullName;
    private String phone;
    private String company;
    private String currentPassword;
    private String newPassword;
    private String confirmPassword;
    private String preferences;
}