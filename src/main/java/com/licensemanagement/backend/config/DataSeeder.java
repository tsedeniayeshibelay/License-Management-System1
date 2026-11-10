package com.licensemanagement.backend.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import lombok.extern.slf4j.Slf4j;

@Configuration
@Slf4j
public class DataSeeder {

    // Sub-query matching mock test licenses by company or user
    private static final String MOCK_LICENSE_IDS =
        "(SELECT id FROM licenses WHERE company_id = 1 OR user_id IN " +
        "(SELECT id FROM users WHERE email IN ('test_user123@example.com')))";

    @Bean
    public CommandLineRunner seedUsageLogs(JdbcTemplate jdbcTemplate,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        return args -> {
            log.info("Removing all mock data...");
            try {
                // Delete every child table that references licenses, in FK-safe order

                jdbcTemplate.execute("DELETE FROM network_leases     WHERE license_id IN " + MOCK_LICENSE_IDS);
                jdbcTemplate.execute("DELETE FROM license_assignments WHERE license_id IN " + MOCK_LICENSE_IDS);
                jdbcTemplate.execute("DELETE FROM unbind_requests     WHERE license_id IN " + MOCK_LICENSE_IDS);
                jdbcTemplate.execute("DELETE FROM activations         WHERE license_id IN " + MOCK_LICENSE_IDS);
                jdbcTemplate.execute("DELETE FROM usage_logs          WHERE license_id IN " + MOCK_LICENSE_IDS);
                jdbcTemplate.execute("DELETE FROM email_logs          WHERE license_id IN " + MOCK_LICENSE_IDS);
                jdbcTemplate.execute("DELETE FROM activity_logs       WHERE license_id IN " + MOCK_LICENSE_IDS);

                // Also clean usage_logs owned by the mock user (no license_id)
                jdbcTemplate.execute(
                    "DELETE FROM usage_logs WHERE user_id IN " +
                    "(SELECT id FROM users WHERE email IN ('test_user123@example.com'))");

                // Now safe to delete licenses and mock products
                jdbcTemplate.execute(
                    "DELETE FROM licenses WHERE company_id = 1 OR user_id IN " +
                    "(SELECT id FROM users WHERE email IN ('test_user123@example.com'))");

                jdbcTemplate.execute(
                    "DELETE FROM products WHERE name IN " +
                    "('LockStrata Pro', 'Analytics Dashboard', 'Security Module')");

                log.info("Successfully removed all mock data!");
            } catch (Exception e) {
                log.error("Error removing mock data: {}", e.getMessage());
            }
        };
    }
}
