package com.licensemanagement.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WebhookPayload {
    private String content; // Used by Discord
    private String text;    // Used by Slack/Teams
    
    public WebhookPayload(String message) {
        this.content = message;
        this.text = message;
    }
}
