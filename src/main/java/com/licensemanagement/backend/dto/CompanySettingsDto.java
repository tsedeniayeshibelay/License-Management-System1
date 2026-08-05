package com.licensemanagement.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanySettingsDto {
    private String name;
    private String email;
    private String phone;
    private String address;
    private String industry;
    private String website;
    private String webhookUrl;
}
