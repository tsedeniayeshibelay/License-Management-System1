package com.licensemanagement.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QRPendingInfoResponse {
    private String productName;
    private String deviceName;
    private String machineId;
    private String os;
    private String status;
}
