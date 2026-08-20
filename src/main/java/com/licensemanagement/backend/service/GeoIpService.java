package com.licensemanagement.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeoIpService {

    private final RestTemplate restTemplate;

    public String getCountryByIp(String ipAddress) {
        if (ipAddress == null || ipAddress.isEmpty() || ipAddress.equals("127.0.0.1") || ipAddress.equals("0:0:0:0:0:0:0:1")) {
            return "Localhost";
        }

        try {
            String url = "http://ip-api.com/json/" + ipAddress;
            Map response = restTemplate.getForObject(url, Map.class);
            
            if (response != null && "success".equals(response.get("status"))) {
                return (String) response.get("country");
            }
        } catch (Exception e) {
            log.error("Failed to fetch Geo-IP data for IP: {}. Error: {}", ipAddress, e.getMessage());
        }
        
        return "Unknown";
    }
}
