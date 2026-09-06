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
public class WebhookPayload {
    private String event;      // E.g. TEST_PING, LICENSE_CREATED, LICENSE_ACTIVATED, ANOMALY_ALERT
    private String content;    // Used by Discord
    private String text;       // Used by Slack/Teams
    private Long companyId;
    private String timestamp;
    private Object data;

    public WebhookPayload(String message) {
        this.content = message;
        this.text = message;
        this.timestamp = LocalDateTime.now().toString();
        this.event = "ALERT";
    }

    public WebhookPayload(String event, String message) {
        this.event = event;
        this.content = message;
        this.text = message;
        this.timestamp = LocalDateTime.now().toString();
    }
}
