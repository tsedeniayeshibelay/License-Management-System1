package com.licensemanagement.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.licensemanagement.backend.dto.*;
import com.licensemanagement.backend.entity.*;
import com.licensemanagement.backend.enums.LicenseType;
import com.licensemanagement.backend.repository.*;
import com.licensemanagement.backend.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;
import java.security.MessageDigest;
import java.util.Base64;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "license.validation.hmac-secret=TestSecretKey123456789012345678901234567890",
    "qr.activation.token.ttl=5m",
    "spring.profiles.active=test"
})
public class ActivationModelTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private LicenseRepository licenseRepository;
    @Autowired private DeviceRepository deviceRepository;
    @Autowired private ActivationRepository activationRepository;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private PendingQRActivationRepository pendingQRActivationRepository;
    @Autowired private OfflineRequestLogRepository offlineRequestLogRepository;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private ObjectMapper objectMapper;

    private User testUser;
    private License testLicense;
    private Product testProduct;
    private String userToken;

    @BeforeEach
    public void setup() {
        String email = "modeltest_" + UUID.randomUUID().toString().substring(0,8) + "@example.com";
        testUser = new User();
        testUser.setEmail(email);
        testUser.setUsername(email);
        testUser.setFullName("Model Tester");
        testUser.setPassword("password");
        testUser.setRole("CUSTOMER");
        testUser.setStatus("ACTIVE");
        testUser = userRepository.save(testUser);

        userToken = jwtUtil.generateToken(testUser.getEmail(), testUser.getRole());

        Company company = new Company();
        company.setName("Model Company");
        company.setEmail("model_" + UUID.randomUUID().toString().substring(0,8) + "@company.com");
        company = companyRepository.save(company);
        
        testProduct = new Product();
        testProduct.setName("Model Product");
        testProduct.setCompanyId(company.getId());
        testProduct.setLicenseType(LicenseType.PER_DEVICE.name());
        testProduct = productRepository.save(testProduct);

        testLicense = new License();
        testLicense.setLicenseKey("TEST-MDL-" + UUID.randomUUID().toString().substring(0, 8));
        testLicense.setUserId(testUser.getId());
        testLicense.setCompanyId(company.getId());
        testLicense.setProductId(testProduct.getId());
        testLicense.setStatus("ACTIVE");
        testLicense.setLicenseType(LicenseType.PER_DEVICE);
        testLicense.setMaxActivations(1);
        testLicense.setIssuedDate(java.time.LocalDate.now());
        testLicense.setExpiryDate(java.time.LocalDate.now().plusDays(365));
        testLicense = licenseRepository.save(testLicense);
    }

    private String sha256(String input) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(input.getBytes("UTF-8"));
        return Base64.getEncoder().encodeToString(hash);
    }

    @Test
    public void testQRSecurityFlow_SuccessAndReplay() throws Exception {
        // 1. App requests QR token (public)
        QRRequestDto reqDto = new QRRequestDto();
        reqDto.setProductId(testProduct.getId());
        reqDto.setMachineId("mach-qr-123");
        reqDto.setInstallationId("inst-qr-123");
        reqDto.setDeviceName("QR App Device");
        reqDto.setOs("Linux");

        MvcResult requestResult = mockMvc.perform(post("/api/activations/qr/request")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqDto)))
                .andExpect(status().isCreated())
                .andReturn();

        QRRequestResponse qrResponse = objectMapper.readValue(requestResult.getResponse().getContentAsString(), QRRequestResponse.class);
        
        assertNotNull(qrResponse.getPublicApprovalToken());
        assertNotNull(qrResponse.getAppPollingSecret());
        
        // 2. Phone checks info (public)
        mockMvc.perform(get("/api/activations/qr/info/" + qrResponse.getPublicApprovalToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.machineId").value("mach-qr-123"));

        // 3. App polls before approval (public, using secret)
        mockMvc.perform(get("/api/activations/qr/poll/" + qrResponse.getRequestId())
                .header("X-Polling-Secret", qrResponse.getAppPollingSecret()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));

        // App tries to poll with public token instead of secret - should fail
        mockMvc.perform(get("/api/activations/qr/poll/" + qrResponse.getRequestId())
                .header("X-Polling-Secret", qrResponse.getPublicApprovalToken()))
                .andExpect(status().isForbidden());

        // 4. Phone approves (authenticated)
        QRApproveRequest approveReq = new QRApproveRequest();
        approveReq.setPublicApprovalToken(qrResponse.getPublicApprovalToken());
        approveReq.setLicenseId(testLicense.getId());

        mockMvc.perform(post("/api/activations/qr/approve")
                .header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(approveReq)))
                .andExpect(status().isOk());

        // Verify activation is bound to original device, not phone
        Device device = deviceRepository.findByMachineId("mach-qr-123").orElse(null);
        assertNotNull(device);
        assertTrue(activationRepository.existsByLicenseIdAndDeviceIdAndIsActiveTrue(testLicense.getId(), device.getId()));

        // 5. App polls again, sees APPROVED, gets signed response
        MvcResult pollResult = mockMvc.perform(get("/api/activations/qr/poll/" + qrResponse.getRequestId())
                .header("X-Polling-Secret", qrResponse.getAppPollingSecret()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andReturn();

        QRPollResponse finalResp = objectMapper.readValue(pollResult.getResponse().getContentAsString(), QRPollResponse.class);
        assertNotNull(finalResp.getActivationResponse());
        assertNotNull(finalResp.getActivationResponse().getSignature());
        
        // Decode payload to verify format
        String payloadStr = new String(Base64.getDecoder().decode(finalResp.getActivationResponse().getPayload()), "UTF-8");
        OfflineActivationPayload payload = objectMapper.readValue(payloadStr, OfflineActivationPayload.class);
        assertEquals("mach-qr-123", payload.getDeviceFingerprint());
        assertEquals("inst-qr-123", payload.getInstallationId());

        // 6. Idempotent poll returns same response
        mockMvc.perform(get("/api/activations/qr/poll/" + qrResponse.getRequestId())
                .header("X-Polling-Secret", qrResponse.getAppPollingSecret()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    public void testOfflineTamperingAndReplay() throws Exception {
        OfflineFileRequest fileReq = new OfflineFileRequest();
        fileReq.setProductId(testProduct.getId());
        fileReq.setMachineId("mach-off-123");
        fileReq.setInstallationId("inst-off-123");
        fileReq.setDeviceName("Offline Node");
        fileReq.setRequestId(UUID.randomUUID().toString());
        fileReq.setRequestExpiration(System.currentTimeMillis() + 600000); // 10 minutes from now

        String content = objectMapper.writeValueAsString(fileReq);
        MockMultipartFile file = new MockMultipartFile("file", "request.json", "application/json", content.getBytes());

        // 1. Upload valid file (success)
        MvcResult result = mockMvc.perform(multipart("/api/activations/offline/upload")
                .file(file)
                .param("licenseId", testLicense.getId().toString())
                .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isCreated())
                .andReturn();

        OfflineActivationResponse response = objectMapper.readValue(result.getResponse().getContentAsByteArray(), OfflineActivationResponse.class);
        assertNotNull(response.getSignature());

        // 2. Upload SAME exact file (replay attack via SHA-256 digest) -> Should fail
        mockMvc.perform(multipart("/api/activations/offline/upload")
                .file(file)
                .param("licenseId", testLicense.getId().toString())
                .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isConflict());

        // 3. Upload EXPIRED file -> Should fail
        OfflineFileRequest expiredReq = new OfflineFileRequest();
        expiredReq.setProductId(testProduct.getId());
        expiredReq.setMachineId("mach-off-456");
        expiredReq.setRequestId(UUID.randomUUID().toString());
        expiredReq.setRequestExpiration(System.currentTimeMillis() - 1000); // Expired
        
        MockMultipartFile expiredFile = new MockMultipartFile("file", "req.json", "application/json", objectMapper.writeValueAsBytes(expiredReq));

        mockMvc.perform(multipart("/api/activations/offline/upload")
                .file(expiredFile)
                .param("licenseId", testLicense.getId().toString())
                .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void testAutoActivationCompatibility() throws Exception {
        AutoActivationRequest autoReq = new AutoActivationRequest();
        autoReq.setProductId(testProduct.getId());
        autoReq.setMachineId("mach-auto-123");
        autoReq.setInstallationId("inst-auto-123");
        autoReq.setDeviceName("Auto PC");
        autoReq.setOs("Mac");

        mockMvc.perform(post("/api/activations/auto")
                .header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(autoReq)))
                .andExpect(status().isCreated());

        Device device = deviceRepository.findByMachineId("mach-auto-123").orElse(null);
        assertNotNull(device);
        assertTrue(activationRepository.existsByLicenseIdAndDeviceIdAndIsActiveTrue(testLicense.getId(), device.getId()));
    }
}
