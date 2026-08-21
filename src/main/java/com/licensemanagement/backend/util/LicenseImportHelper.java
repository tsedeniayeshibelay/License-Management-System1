package com.licensemanagement.backend.util;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.licensemanagement.backend.dto.LicenseRequest;
import com.licensemanagement.backend.enums.LicenseType;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import com.opencsv.exceptions.CsvValidationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.io.InputStreamReader;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
@Slf4j
@Component
public class LicenseImportHelper {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    public List<LicenseRequest> parseCSV(MultipartFile file) {
        List<LicenseRequest> requests = new ArrayList<>();
        try (CSVReader reader = new CSVReaderBuilder(
                new InputStreamReader(file.getInputStream()))
                .withSkipLines(1)
                .build()) {
            String[] row;
            while ((row = reader.readNext()) != null) {
                if (row.length < 6) {
                    log.warn("Skipping invalid row: {}", (Object) row);
                    continue;
                }
                LicenseRequest request = buildLicenseRequest(row);
                requests.add(request);
            }
        } catch (IOException | CsvValidationException e) {
            log.error("Failed to parse CSV file: {}", e.getMessage());
            throw new RuntimeException("CSV parsing failed", e);
        }
        return requests;
    }
    private LicenseRequest buildLicenseRequest(String[] row) {
        LicenseRequest request = LicenseRequest.builder()
                .productName(safeTrim(row, 0))
                .customerName(safeTrim(row, 1))
                .customerEmail(safeTrim(row, 2))
                .expiryDate(LocalDate.parse(safeTrim(row, 3), DATE_FORMATTER))  
                .maxActivations(parseIntSafe(safeTrim(row, 4), 1))
                .licenseType(LicenseType.valueOf(safeTrim(row, 5).toUpperCase()))
                .featureFlags(parseFeatureFlags(safeTrim(row, 6)))
                .hardwareLocked(parseBooleanSafe(safeTrim(row, 7), false))
                .allowedDomains(parseAllowedDomains(safeTrim(row, 8)))
                .customAttributes(parseCustomAttributes(safeTrim(row, 9)))
                .build();
        return request;
    }
    private String safeTrim(String[] row, int index) {
        if (row.length <= index) {
            return "";
        }
        return row[index] == null ? "" : row[index].trim();
    }
    private int parseIntSafe(String value, int defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
    private boolean parseBooleanSafe(String value, boolean defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        String lower = value.trim().toLowerCase();
        return lower.equals("true") || lower.equals("yes") || lower.equals("1");
    }
    private List<String> parseFeatureFlags(String value) {
        if (value == null || value.isBlank()) {
            return List.of("BASIC");
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .map(String::toUpperCase)
                .toList();
    }
    private List<String> parseAllowedDomains(String value) {
        if (value == null || value.isBlank()) {
            return new ArrayList<>();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();
    }
    private Map<String, Object> parseCustomAttributes(String value) {
        if (value == null || value.isBlank()) {
            return new HashMap<>();
        }
        try {
            return OBJECT_MAPPER.readValue(value, Map.class);
        } catch (Exception e) {
            log.warn("Failed to parse custom attributes as JSON: {}", value);
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("raw", value);
            return fallback;
        }
    }
}