package com.licensemanagement.backend.service;
import com.licensemanagement.backend.dto.LicenseRequest;
import com.licensemanagement.backend.entity.Company;
import com.licensemanagement.backend.entity.Product;
import com.licensemanagement.backend.repository.CompanyRepository;
import com.licensemanagement.backend.repository.ProductRepository;
import com.licensemanagement.backend.util.LicenseImportHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class LicenseImportService {
    private final LicenseImportHelper importHelper;
    private final LicenseService licenseService;
    private final ProductRepository productRepository;
    private final CompanyRepository companyRepository;
    public int importLicenses(MultipartFile file) {
        List<LicenseRequest> requests = importHelper.parseCSV(file);
        int importedCount = 0;
        for (LicenseRequest request : requests) {
            try {
                Product product = productRepository.findByName(request.getProductName())
                        .orElseThrow(() -> new RuntimeException("Product not found: " + request.getProductName()));
                Company company = companyRepository.findByName(request.getCustomerName())
                        .orElseThrow(() -> new RuntimeException("Company not found: " + request.getCustomerName()));
                request.setProductId(product.getId());
                request.setCompanyId(company.getId());
                licenseService.createLicense(request);
                importedCount++;
                log.info("Imported license for product: {}, company: {}", request.getProductName(), request.getCustomerName());
            } catch (Exception e) {
                log.error("Failed to import license for product: {}, error: {}", request.getProductName(), e.getMessage());
            }
        }
        return importedCount;
    }
}