package com.licensemanagement.backend.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import lombok.extern.slf4j.Slf4j;

import java.util.Random;

@Configuration
@Slf4j
public class DataSeeder {

    @Bean
    public CommandLineRunner seedUsageLogs(JdbcTemplate jdbcTemplate, org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        return args -> {
            log.info("Removing all mock data...");
            try {
                // Delete usage logs
                jdbcTemplate.execute("DELETE FROM usage_logs WHERE user_id IN (SELECT id FROM users WHERE email IN ('test_user123@example.com'))");
                
                // Delete licenses
                jdbcTemplate.execute("DELETE FROM licenses WHERE company_id = 1 OR user_id IN (SELECT id FROM users WHERE email IN ('test_user123@example.com'))");
                
                // Delete mock products
                jdbcTemplate.execute("DELETE FROM products WHERE name IN ('LockStrata Pro', 'Analytics Dashboard', 'Security Module')");
                
                // Delete mock users
                
                log.info("Successfully removed all mock data!");
            } catch (Exception e) {
                log.error("Error removing mock data", e);
            }
        };
    }
}