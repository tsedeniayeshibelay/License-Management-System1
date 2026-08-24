package com.licensemanagement.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.licensemanagement.backend.dto.QRActivationRequest;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.entity.Device;
import com.licensemanagement.backend.entity.Activation;
import com.licensemanagement.backend.entity.Company;
import com.licensemanagement.backend.entity.Product;
import com.licensemanagement.backend.enums.LicenseType;
import com.licensemanagement.backend.repository.CompanyRepository;
import com.licensemanagement.backend.repository.ProductRepository;
import com.licensemanagement.backend.repository.LicenseRepository;
import com.licensemanagement.backend.repository.UserRepository;
import com.licensemanagement.backend.repository.DeviceRepository;
import com.licensemanagement.backend.repository.ActivationRepository;
import com.licensemanagement.backend.util.JwtUtil;
import com.licensemanagement.backend.util.HmacUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import org.springframework.cache.CacheManager;
import java.util.UUID;
import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "license.validation.hmac-secret=TestSecretKey123456789012345678901234567890",
    "qr.activation.token.ttl=5m"
})
public class QRActivationSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LicenseRepository licenseRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private ActivationRepository activationRepository;
    
    @Autowired
    private CompanyRepository companyRepository;
    
    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CacheManager cacheManager;

    private User testUser;
    private License testLicense;
    private String userToken;

    @BeforeEach
    public void setup() {
        // Create user if not exists
        String email = "qrtest_" + UUID.randomUUID().toString().substring(0,8) + "@example.com";
        testUser = new User();
        testUser.setEmail(email);
        testUser.setUsername(email);
        testUser.setFullName("QR Tester");
        testUser.setPassword("password");
        testUser.setRole("CUSTOMER");
        testUser.setStatus("ACTIVE");
        testUser = userRepository.save(testUser);

        userToken = jwtUtil.generateToken(testUser.getEmail(), testUser.getRole());

        Company company = new Company();
        company.setName("Test Company");
        company.setEmail("test_" + UUID.randomUUID().toString().substring(0,8) + "@company.com");
        company = companyRepository.save(company);
        
        Product product = new Product();
        product.setName("Test Product");
        product.setCompanyId(company.getId());
        product.setLicenseType(LicenseType.PER_DEVICE.name());
        product = productRepository.save(product);

        // Create a license for the user
        testLicense = new License();
        testLicense.setLicenseKey("TEST-QR-" + UUID.randomUUID().toString().substring(0, 8));
        testLicense.setUserId(testUser.getId());
        testLicense.setCompanyId(company.getId());
        testLicense.setProductId(product.getId());
        testLicense.setStatus("ACTIVE");
        testLicense.setLicenseType(LicenseType.PER_DEVICE);
        testLicense.setMaxActivations(1);
        testLicense.setIssuedDate(java.time.LocalDate.now());
        testLicense.setExpiryDate(java.time.LocalDate.now().plusDays(365));
        testLicense = licenseRepository.save(testLicense);
    }

    @Test
    public void testValidQRToken_Success() throws Exception {
        String token = UUID.randomUUID().toString();
        cacheManager.getCache("qrCodes").put(token, testLicense.getLicenseKey());
        
        QRActivationRequest req = new QRActivationRequest();
        req.setQrToken(token);
        req.setDeviceName("Test Device");
        req.setMachineId("mach-1234");
        req.setOs("Windows");

        mockMvc.perform(post("/api/activations/qr")
                .header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());
                
        // Verify DB records
        Device device = deviceRepository.findByMachineId("mach-1234").orElse(null);
        assertNotNull(device);
        
        boolean isActivated = activationRepository.existsByLicenseIdAndDeviceIdAndIsActiveTrue(testLicense.getId(), device.getId());
        assertTrue(isActivated);
        
        // Verify token is evicted after success
        org.springframework.cache.Cache qrCache = cacheManager.getCache("qrCodes");
        assertTrue(qrCache.get(token) == null);
    }

    @Test
    public void testExpiredOrInvalidToken() throws Exception {
        String token = "invalid-token";
        
        QRActivationRequest req = new QRActivationRequest();
        req.setQrToken(token);
        req.setDeviceName("Hacker Device");
        req.setMachineId("mach-hacker");
        req.setOs("Linux");

        mockMvc.perform(post("/api/activations/qr")
                .header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("QR token is invalid, has expired, or has already been used."));
    }

    @Test
    public void testReplayAttack_Prevented() throws Exception {
        String token = UUID.randomUUID().toString();
        cacheManager.getCache("qrCodes").put(token, testLicense.getLicenseKey());
        
        QRActivationRequest req = new QRActivationRequest();
        req.setQrToken(token);
        req.setDeviceName("Replay Device");
        req.setMachineId("mach-replay-1");
        req.setOs("Windows");

        // First use - succeeds
        mockMvc.perform(post("/api/activations/qr")
                .header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        // Second use - fails (cache evicted)
        req.setMachineId("mach-replay-2");
        mockMvc.perform(post("/api/activations/qr")
                .header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("QR token is invalid, has expired, or has already been used."));
    }

    @Test
    public void testDifferentUser_Rejects() throws Exception {
        // Create another user
        User otherUser = new User();
        otherUser.setEmail("other_" + UUID.randomUUID().toString().substring(0,8) + "@example.com");
        otherUser.setUsername(otherUser.getEmail());
        otherUser.setFullName("Other User");
        otherUser.setPassword("password");
        otherUser.setRole("CUSTOMER");
        otherUser.setStatus("ACTIVE");
        otherUser = userRepository.save(otherUser);

        String otherToken = jwtUtil.generateToken(otherUser.getEmail(), otherUser.getRole());

        String token = UUID.randomUUID().toString();
        cacheManager.getCache("qrCodes").put(token, testLicense.getLicenseKey());

        QRActivationRequest req = new QRActivationRequest();
        req.setQrToken(token);
        req.setDeviceName("Test Device");
        req.setMachineId("mach-other");

        mockMvc.perform(post("/api/activations/qr")
                .header("Authorization", "Bearer " + otherToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You can only activate your own licenses or licenses assigned to you"));
    }
}
