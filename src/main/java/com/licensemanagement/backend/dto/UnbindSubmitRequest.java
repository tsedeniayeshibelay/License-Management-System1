package com.licensemanagement.backend.dto;

import lombok.Data;

@Data
public class UnbindSubmitRequest {
    private Long licenseId;
    private String reason;
}
