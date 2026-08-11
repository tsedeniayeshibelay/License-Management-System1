package com.licensemanagement.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class QRApproveRequest {
    @NotBlank(message = "QR Token is required")
    private String publicApprovalToken;
    
    @NotNull(message = "License ID is required")
    private Long licenseId;
}
