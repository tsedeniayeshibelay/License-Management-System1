package com.licensemanagement.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QRRequestResponse {
    private String requestId;
    private String publicApprovalToken;
    private String appPollingSecret;
    private String approvalUrl;
    private LocalDateTime expiresAt;
}
