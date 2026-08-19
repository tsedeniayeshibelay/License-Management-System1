package com.licensemanagement.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AnalyticsUserDto {
    private Long id;
    private String fullName;
    private String email;
    private long activeDevicesCount;
    private long activeLicensesCount;
}
