package com.licensemanagement.backend.service;
import com.licensemanagement.backend.entity.Product;
import com.licensemanagement.backend.repository.ProductRepository;
import com.licensemanagement.backend.repository.LicenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
@Service
@RequiredArgsConstructor
public class ProductService {
    private final ProductRepository productRepository;
    private final ActivityLogService activityLogService;
    private final LicenseRepository licenseRepository;
    public Product createProduct(Product product) {
        Product saved = productRepository.save(product);
        if (saved.getCompanyId() != null) {
            activityLogService.logAction(saved.getCompanyId(), "PRODUCT_REGISTERED", "Registered product: " + saved.getName() + " (" + saved.getVersion() + ")", null, null);
        }
        return saved;
    }
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }
    
    public List<Product> getPublishedProducts() {
        return productRepository.findByStatus("PUBLISHED");
    }

    public List<Product> getProductsForBulkBuyer() {
        return productRepository.findByStatusAndAvailableToBulkBuyersTrue("PUBLISHED");
    }

    public List<Product> getProductsForCustomer() {
        return productRepository.findByStatusAndAvailableToCustomersTrue("PUBLISHED");
    }

    public Product getProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
    }
    public Product updateProduct(Long id, Product productDetails) {
        Product product = getProductById(id);
        product.setName(productDetails.getName());
        product.setVersion(productDetails.getVersion());
        product.setDescription(productDetails.getDescription());
        product.setLicenseType(productDetails.getLicenseType());
        product.setPrice(productDetails.getPrice());
        product.setProductIdSku(productDetails.getProductIdSku());
        product.setCategory(productDetails.getCategory());
        product.setPublisher(productDetails.getPublisher());
        product.setSupportedOs(productDetails.getSupportedOs());
        product.setCustomerPrice(productDetails.getCustomerPrice());
        product.setBulkBuyerPrice(productDetails.getBulkBuyerPrice());
        product.setMinBulkQuantity(productDetails.getMinBulkQuantity());
        product.setAvailableToCustomers(productDetails.getAvailableToCustomers());
        product.setAvailableToBulkBuyers(productDetails.getAvailableToBulkBuyers());
        
        Product saved = productRepository.save(product);
        if (saved.getCompanyId() != null) {
            activityLogService.logAction(saved.getCompanyId(), "PRODUCT_UPDATED", "Updated product: " + saved.getName(), null, null);
        }
        return saved;
    }

    public Product publishProduct(Long id) {
        Product product = getProductById(id);
        product.setStatus("PUBLISHED");
        Product saved = productRepository.save(product);
        if (saved.getCompanyId() != null) {
            activityLogService.logAction(saved.getCompanyId(), "PRODUCT_PUBLISHED", "Published product: " + saved.getName(), null, null);
        }
        return saved;
    }
    
    public Product archiveProduct(Long id) {
        Product product = getProductById(id);
        product.setStatus("ARCHIVED");
        Product saved = productRepository.save(product);
        if (saved.getCompanyId() != null) {
            activityLogService.logAction(saved.getCompanyId(), "PRODUCT_ARCHIVED", "Archived product: " + saved.getName(), null, null);
        }
        return saved;
    }
    public List<Product> getProductsByCompany(Long companyId) {
        return productRepository.findByCompanyId(companyId);
    }
    public void deleteProduct(Long id) {
        Product product = getProductById(id);
        boolean hasLicenses = licenseRepository.existsByProductId(id);
        if (hasLicenses) {
            product.setStatus("ARCHIVED");
            productRepository.save(product);
        } else {
            productRepository.delete(product);
        }
    }

    public Product resolveProduct(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return null;
        }
        String trimmed = identifier.trim();
        // 1. Check by Canonical Product SKU (e.g., NX-ACC-001, CS-AUTO-01)
        java.util.Optional<Product> productOpt = productRepository.findByProductIdSkuIgnoreCase(trimmed);
        if (productOpt.isPresent()) {
            return productOpt.get();
        }
        // 2. Check by Legacy Numeric Product ID for backward compatibility
        try {
            Long numericId = Long.parseLong(trimmed);
            productOpt = productRepository.findById(numericId);
            if (productOpt.isPresent()) {
                return productOpt.get();
            }
        } catch (NumberFormatException ignored) {}
        // Do NOT resolve products by name during activation per requirement
        return null;
    }
}