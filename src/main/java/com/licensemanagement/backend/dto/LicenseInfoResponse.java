package com.licensemanagement.backend.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LicenseInfoResponse {
    private String productName;
    private String licenseType;
    private String status;
}
