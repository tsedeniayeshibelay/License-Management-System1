package com.licensemanagement.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class AnalyticsDto {
    private long totalActiveDevices;
    private long totalActiveLicenses;
    private long totalEmployees;
    private Map<String, Long> osDistribution;
    private List<AnalyticsUserDto> topUsers;
    private List<com.licensemanagement.backend.entity.Device> recentActivations;
}
