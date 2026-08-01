package com.licensemanagement.backend.controller;
import com.licensemanagement.backend.exception.*;
import com.licensemanagement.backend.entity.Product;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.service.ProductService;
import com.licensemanagement.backend.util.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {
    private final ProductService productService;
    private final CurrentUserProvider currentUserProvider;
    @PostMapping
    @PreAuthorize("hasRole('COMPANY') or hasRole('ADMIN')")
    public ResponseEntity<Product> createProduct(@Valid @RequestBody Product product) {
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser.getRole().equals("COMPANY")) {
            product.setCompanyId(currentUser.getCompanyId());
        }
        return new ResponseEntity<>(productService.createProduct(product), HttpStatus.CREATED);
    }
    @GetMapping("/public")
    public ResponseEntity<List<Product>> getPublicProducts() {
        return ResponseEntity.ok(productService.getPublishedProducts());
    }
    @GetMapping
    public ResponseEntity<List<Product>> getAllProducts() {
        User currentUser = currentUserProvider.getCurrentUser();
        List<Product> products;
        if (currentUser.getRole().equals("ADMIN")) {
            products = productService.getAllProducts();
        } else if (currentUser.getRole().equals("COMPANY")) {
            products = productService.getProductsByCompany(currentUser.getCompanyId());
        } else if (currentUser.getRole().equals("BULK_BUYER")) {
            // Bulk buyers see only products marked as available to bulk buyers
            products = productService.getProductsForBulkBuyer();
        } else {
            // CUSTOMER sees products marked as available to customers
            products = productService.getProductsForCustomer();
        }
        return ResponseEntity.ok(products);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable Long id) {
        Product product = productService.getProductById(id);
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser.getRole().equals("COMPANY") &&
                !product.getCompanyId().equals(currentUser.getCompanyId())) {
            throw new ForbiddenException("Access denied! You can only view your own products.");
        }
        return ResponseEntity.ok(product);
    }
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('COMPANY') or hasRole('ADMIN')")
    public ResponseEntity<Product> updateProduct(@PathVariable Long id, @Valid @RequestBody Product productDetails) {
        Product existingProduct = productService.getProductById(id);
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser.getRole().equals("COMPANY") &&
                !existingProduct.getCompanyId().equals(currentUser.getCompanyId())) {
            throw new ForbiddenException("Access denied! You can only update your own products.");
        }
        return ResponseEntity.ok(productService.updateProduct(id, productDetails));
    }

    @PostMapping("/{id}/publish")
    @PreAuthorize("hasRole('COMPANY') or hasRole('ADMIN')")
    public ResponseEntity<Product> publishProduct(@PathVariable Long id) {
        Product existingProduct = productService.getProductById(id);
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser.getRole().equals("COMPANY") &&
                !existingProduct.getCompanyId().equals(currentUser.getCompanyId())) {
            throw new ForbiddenException("Access denied! You can only publish your own products.");
        }
        return ResponseEntity.ok(productService.publishProduct(id));
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasRole('COMPANY') or hasRole('ADMIN')")
    public ResponseEntity<Product> archiveProduct(@PathVariable Long id) {
        Product existingProduct = productService.getProductById(id);
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser.getRole().equals("COMPANY") &&
                !existingProduct.getCompanyId().equals(currentUser.getCompanyId())) {
            throw new ForbiddenException("Access denied! You can only archive your own products.");
        }
        return ResponseEntity.ok(productService.archiveProduct(id));
    }
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('COMPANY')")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        Product existingProduct = productService.getProductById(id);
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser.getRole().equals("COMPANY") &&
                !existingProduct.getCompanyId().equals(currentUser.getCompanyId())) {
            throw new ForbiddenException("Access denied! You can only delete your own products.");
        }
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }
}