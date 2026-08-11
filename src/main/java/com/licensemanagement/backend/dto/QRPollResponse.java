package com.licensemanagement.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QRPollResponse {
    private String status;
    private OfflineActivationResponse activationResponse;
}
