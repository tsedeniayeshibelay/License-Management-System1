package com.licensemanagement.backend.service;
import com.licensemanagement.backend.exception.*;
import com.licensemanagement.backend.entity.Company;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.repository.CompanyRepository;
import com.licensemanagement.backend.repository.UserRepository;
import com.licensemanagement.backend.repository.ProductRepository;
import com.licensemanagement.backend.repository.LicenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
@Service
@RequiredArgsConstructor
public class CompanyService {
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final LicenseRepository licenseRepository;
    @Transactional
    public Company createCompany(Company company) {
        if (companyRepository.existsByEmail(company.getEmail())) {
            throw new ResourceConflictException("Company with email " + company.getEmail() + " already exists!");
        }
        return companyRepository.save(company);
    }
    public List<Company> getAllCompanies() {
        return companyRepository.findAll();
    }
    public Company getCompanyById(Long id) {
        return companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found with id: " + id));
    }
    public Company getCompanyByEmail(String email) {
        return companyRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found with email: " + email));
    }
    @Transactional
    public Company updateCompany(Long id, Company companyDetails) {
        Company existingCompany = getCompanyById(id);
        if (companyDetails.getName() != null) {
            existingCompany.setName(companyDetails.getName());
        }
        if (companyDetails.getEmail() != null) {
            if (!existingCompany.getEmail().equals(companyDetails.getEmail()) &&
                    companyRepository.existsByEmail(companyDetails.getEmail())) {
                throw new ResourceConflictException("Email " + companyDetails.getEmail() + " is already taken!");
            }
            existingCompany.setEmail(companyDetails.getEmail());
        }
        if (companyDetails.getPhone() != null) {
            existingCompany.setPhone(companyDetails.getPhone());
        }
        if (companyDetails.getAddress() != null) {
            existingCompany.setAddress(companyDetails.getAddress());
        }
        if (companyDetails.getWebsite() != null) {
            existingCompany.setWebsite(companyDetails.getWebsite());
        }
        if (companyDetails.getIndustry() != null) {
            existingCompany.setIndustry(companyDetails.getIndustry());
        }
        if (companyDetails.getStatus() != null) {
            existingCompany.setStatus(companyDetails.getStatus());
        }
        return companyRepository.save(existingCompany);
    }
    @Transactional
    public void deleteCompany(Long id) {
        Company company = getCompanyById(id);
        boolean hasUsers = userRepository.existsByCompanyId(id);
        boolean hasProducts = productRepository.existsByCompanyId(id);
        boolean hasLicenses = licenseRepository.existsByCompanyId(id);
        if (hasUsers || hasProducts || hasLicenses) {
            company.setStatus("DEACTIVATED");
            companyRepository.save(company);
        } else {
            companyRepository.delete(company);
        }
    }
    public List<User> getCompanyMembers(Long companyId) {
        return userRepository.findByCompanyId(companyId);
    }
    @Transactional
    public Company updateStatus(Long id, String status) {
        Company company = getCompanyById(id);
        company.setStatus(status);
        return companyRepository.save(company);
    }
    public List<Company> getActiveCompanies() {
        return companyRepository.findByStatus("ACTIVE");
    }
}