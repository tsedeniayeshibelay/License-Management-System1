package com.licensemanagement.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.licensemanagement.backend.dto.AutoActivationRequest;
import com.licensemanagement.backend.dto.QRRequestDto;
import com.licensemanagement.backend.dto.QRRequestResponse;
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
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.util.UUID;
import java.util.zip.ZipInputStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "license.validation.hmac-secret=TestSecretKey123456789012345678901234567890",
    "qr.activation.token.ttl=5m",
    "spring.profiles.active=test"
})
public class ProductIdentificationActivationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private LicenseRepository licenseRepository;
    @Autowired private DeviceRepository deviceRepository;
    @Autowired private ActivationRepository activationRepository;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private LicenseAssignmentRepository licenseAssignmentRepository;
    @Autowired private JwtUtil jwtUtil;

    private User customer;
    private User employee;
    private User bulkBuyer;
    private Product productA;
    private Product productB;
    private License licenseA;
    private License enterpriseLicenseB;
    private String customerToken;
    private String employeeToken;

    @BeforeEach
    public void setup() {
        Company company = new Company();
        company.setName("Enterprise Corp " + UUID.randomUUID().toString().substring(0, 6));
        company.setEmail("corp_" + UUID.randomUUID().toString().substring(0, 6) + "@company.com");
        company = companyRepository.save(company);

        // Product A with canonical SKU
        productA = new Product();
        productA.setName("Nexora Accounting");
        productA.setProductIdSku("NX-ACC-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        productA.setStatus("PUBLISHED");
        productA.setAvailableToCustomers(true);
        productA.setAvailableToBulkBuyers(true);
        productA.setCompanyId(company.getId());
        productA.setLicenseType(LicenseType.PER_DEVICE.name());
        productA = productRepository.save(productA);

        // Product B with generated LS-PRODUCT-xxx SKU (simulates legacy product)
        productB = new Product();
        productB.setName("Enterprise Warehouse");
        productB.setStatus("PUBLISHED");
        productB.setAvailableToCustomers(false);
        productB.setAvailableToBulkBuyers(true);
        productB.setCompanyId(company.getId());
        productB.setLicenseType(LicenseType.PER_USER.name());
        productB = productRepository.save(productB);
        productB.setProductIdSku("LS-PRODUCT-" + productB.getId());
        productB = productRepository.save(productB);

        // Customer
        String custEmail = "cust_" + UUID.randomUUID().toString().substring(0, 6) + "@example.com";
        customer = new User();
        customer.setEmail(custEmail);
        customer.setUsername(custEmail);
        customer.setFullName("Regular Customer");
        customer.setPassword("password");
        customer.setRole("CUSTOMER");
        customer.setStatus("ACTIVE");
        customer = userRepository.save(customer);
        customerToken = jwtUtil.generateToken(customer.getEmail(), customer.getRole());

        // Bulk Buyer & Employee
        String bbEmail = "bb_" + UUID.randomUUID().toString().substring(0, 6) + "@company.com";
        bulkBuyer = new User();
        bulkBuyer.setEmail(bbEmail);
        bulkBuyer.setUsername(bbEmail);
        bulkBuyer.setFullName("Bulk Buyer Director");
        bulkBuyer.setPassword("password");
        bulkBuyer.setRole("BULK_BUYER");
        bulkBuyer.setCompanyId(company.getId());
        bulkBuyer.setStatus("ACTIVE");
        bulkBuyer = userRepository.save(bulkBuyer);

        String empEmail = "emp_" + UUID.randomUUID().toString().substring(0, 6) + "@company.com";
        employee = new User();
        employee.setEmail(empEmail);
        employee.setUsername(empEmail);
        employee.setFullName("Enterprise Employee");
        employee.setPassword("password");
        employee.setRole("CUSTOMER");
        employee.setCompanyId(company.getId());
        employee.setStatus("ACTIVE");
        employee = userRepository.save(employee);
        employeeToken = jwtUtil.generateToken(employee.getEmail(), employee.getRole());

        // License A owned by Customer
        licenseA = new License();
        licenseA.setLicenseKey("KEY-A-" + UUID.randomUUID().toString().substring(0, 8));
        licenseA.setUserId(customer.getId());
        licenseA.setCompanyId(company.getId());
        licenseA.setProductId(productA.getId());
        licenseA.setStatus("NOT_ACTIVATED");
        licenseA.setLicenseType(LicenseType.PER_DEVICE);
        licenseA.setMaxActivations(2);
        licenseA.setIssuedDate(LocalDate.now());
        licenseA.setExpiryDate(LocalDate.now().plusDays(365));
        licenseA = licenseRepository.save(licenseA);

        // Enterprise License B owned by Bulk Buyer, assigned to Employee
        enterpriseLicenseB = new License();
        enterpriseLicenseB.setLicenseKey("KEY-B-" + UUID.randomUUID().toString().substring(0, 8));
        enterpriseLicenseB.setUserId(bulkBuyer.getId());
        enterpriseLicenseB.setCompanyId(company.getId());
        enterpriseLicenseB.setProductId(productB.getId());
        enterpriseLicenseB.setStatus("ACTIVE");
        enterpriseLicenseB.setLicenseType(LicenseType.PER_USER);
        enterpriseLicenseB.setMaxActivations(10);
        enterpriseLicenseB.setIssuedDate(LocalDate.now());
        enterpriseLicenseB.setExpiryDate(LocalDate.now().plusDays(365));
        enterpriseLicenseB = licenseRepository.save(enterpriseLicenseB);

        LicenseAssignment assignment = new LicenseAssignment();
        assignment.setLicenseId(enterpriseLicenseB.getId());
        assignment.setLicense(enterpriseLicenseB);
        assignment.setUserId(employee.getId());
        assignment.setStatus("ACTIVE");
        assignment.setAssignedAt(java.time.LocalDateTime.now());
        licenseAssignmentRepository.save(assignment);
    }

    @Test
    public void testCustomerAutoActivation_CanonicalSku_CaseInsensitive() throws Exception {
        // App automatically identifies its product SKU (case-insensitive)
        AutoActivationRequest req = new AutoActivationRequest();
        req.setProductId(productA.getProductIdSku().toLowerCase());
        req.setMachineId("mach-auto-sku-" + UUID.randomUUID());
        req.setDeviceName("Laptop A");
        req.setOs("Windows");

        MvcResult result = mockMvc.perform(post("/api/activations/auto")
                .header("Authorization", "Bearer " + customerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.payload").isNotEmpty())
                .andExpect(jsonPath("$.signature").isNotEmpty())
                .andReturn();

        com.licensemanagement.backend.dto.OfflineActivationResponse resp = objectMapper.readValue(
                result.getResponse().getContentAsString(), com.licensemanagement.backend.dto.OfflineActivationResponse.class);
        String decoded = new String(java.util.Base64.getDecoder().decode(resp.getPayload()), java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(decoded.contains(licenseA.getLicenseKey()));
        assertTrue(decoded.contains("ACTIVE"));
    }

    @Test
    public void testCustomerAutoActivation_LegacyNumericIdCompatibility() throws Exception {
        // App sends legacy numeric product ID as string
        AutoActivationRequest req = new AutoActivationRequest();
        req.setProductId(String.valueOf(productA.getId()));
        req.setMachineId("mach-auto-num-" + UUID.randomUUID());
        req.setDeviceName("Laptop Legacy");
        req.setOs("Windows");

        MvcResult result = mockMvc.perform(post("/api/activations/auto")
                .header("Authorization", "Bearer " + customerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.payload").isNotEmpty())
                .andExpect(jsonPath("$.signature").isNotEmpty())
                .andReturn();

        com.licensemanagement.backend.dto.OfflineActivationResponse resp = objectMapper.readValue(
                result.getResponse().getContentAsString(), com.licensemanagement.backend.dto.OfflineActivationResponse.class);
        String decoded = new String(java.util.Base64.getDecoder().decode(resp.getPayload()), java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(decoded.contains(licenseA.getLicenseKey()));
    }

    @Test
    public void testCustomerAutoActivation_StableBackfilledSku() throws Exception {
        // Employee activating assigned enterprise product B using stable LS-PRODUCT-[id]
        AutoActivationRequest req = new AutoActivationRequest();
        req.setProductId("LS-PRODUCT-" + productB.getId());
        req.setMachineId("mach-emp-" + UUID.randomUUID());
        req.setDeviceName("Workstation Emp");
        req.setOs("Linux");

        MvcResult result = mockMvc.perform(post("/api/activations/auto")
                .header("Authorization", "Bearer " + employeeToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.payload").isNotEmpty())
                .andExpect(jsonPath("$.signature").isNotEmpty())
                .andReturn();

        com.licensemanagement.backend.dto.OfflineActivationResponse resp = objectMapper.readValue(
                result.getResponse().getContentAsString(), com.licensemanagement.backend.dto.OfflineActivationResponse.class);
        String decoded = new String(java.util.Base64.getDecoder().decode(resp.getPayload()), java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(decoded.contains(enterpriseLicenseB.getLicenseKey()));
    }

    @Test
    public void testUnknownProduct_RejectsGracefully() throws Exception {
        AutoActivationRequest req = new AutoActivationRequest();
        req.setProductId("NON-EXISTENT-SKU-9999");
        req.setMachineId("mach-unknown-" + UUID.randomUUID());
        req.setDeviceName("Unknown PC");
        req.setOs("Windows");

        mockMvc.perform(post("/api/activations/auto")
                .header("Authorization", "Bearer " + customerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("This software is not registered with LockStrata."));
    }

    @Test
    public void testMissingEligibleLicense_RejectsGracefully() throws Exception {
        // Create customer-facing product with no license owned by customer
        Product productC = new Product();
        productC.setName("Retail Photo Editor");
        productC.setProductIdSku("RPE-" + UUID.randomUUID().toString().substring(0, 6));
        productC.setStatus("PUBLISHED");
        productC.setAvailableToCustomers(true);
        productC.setCompanyId(productA.getCompanyId());
        productC.setLicenseType(LicenseType.PER_DEVICE.name());
        productC = productRepository.save(productC);

        AutoActivationRequest req = new AutoActivationRequest();
        req.setProductId(productC.getProductIdSku());
        req.setMachineId("mach-nolicense-" + UUID.randomUUID());
        req.setDeviceName("No License PC");
        req.setOs("Windows");

        mockMvc.perform(post("/api/activations/auto")
                .header("Authorization", "Bearer " + customerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("No eligible license was found for this software. Please purchase or obtain a license before activating."));
    }

    @Test
    public void testQRActivation_AutomaticProductId() throws Exception {
        QRRequestDto qrReq = new QRRequestDto();
        qrReq.setProductId(productA.getProductIdSku());
        qrReq.setMachineId("mach-qr-auto-" + UUID.randomUUID());
        qrReq.setDeviceName("QR Device");
        qrReq.setOs("Mac");

        MvcResult result = mockMvc.perform(post("/api/activations/qr/request")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(qrReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.publicApprovalToken").isNotEmpty())
                .andExpect(jsonPath("$.appPollingSecret").isNotEmpty())
                .andReturn();

        QRRequestResponse res = objectMapper.readValue(result.getResponse().getContentAsString(), QRRequestResponse.class);
        // Verify QR token contains no sensitive credentials or license key
        assertFalse(res.getApprovalUrl().contains(licenseA.getLicenseKey()));
        assertFalse(res.getApprovalUrl().contains("password"));
    }
}

