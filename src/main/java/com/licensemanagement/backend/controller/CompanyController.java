package com.licensemanagement.backend.controller;
import com.licensemanagement.backend.entity.Company;
import com.licensemanagement.backend.service.CompanyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import com.licensemanagement.backend.annotation.LogAdminAction;
import com.licensemanagement.backend.entity.ActivityLog;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.service.ActivityLogService;
import com.licensemanagement.backend.util.CurrentUserProvider;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
public class CompanyController {
    private final CompanyService companyService;
    private final ActivityLogService activityLogService;
    private final CurrentUserProvider currentUserProvider;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @LogAdminAction(action = "CREATE_COMPANY")
    public ResponseEntity<Company> createCompany(@Valid @RequestBody Company company) {
        return new ResponseEntity<>(companyService.createCompany(company), HttpStatus.CREATED);
    }
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Company>> getAllCompanies() {
        return ResponseEntity.ok(companyService.getAllCompanies());
    }
    @GetMapping("/active")
    public ResponseEntity<List<Company>> getActiveCompanies() {
        return ResponseEntity.ok(companyService.getActiveCompanies());
    }

    @GetMapping("/my-activity")
    @PreAuthorize("hasRole('COMPANY')")
    public ResponseEntity<List<ActivityLog>> getMyActivity() {
        User currentUser = currentUserProvider.getCurrentUser();
        return ResponseEntity.ok(activityLogService.getCompanyActivity(currentUser.getCompanyId()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Company> getCompanyById(@PathVariable Long id) {
        return ResponseEntity.ok(companyService.getCompanyById(id));
    }

    @GetMapping("/{id}/members")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getCompanyMembers(@PathVariable Long id) {
        return ResponseEntity.ok(companyService.getCompanyMembers(id));
    }
    @GetMapping("/email/{email}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Company> getCompanyByEmail(@PathVariable String email) {
        return ResponseEntity.ok(companyService.getCompanyByEmail(email));
    }
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @LogAdminAction(action = "UPDATE_COMPANY")
    public ResponseEntity<Company> updateCompany(@PathVariable Long id, @Valid @RequestBody Company company) {
        return ResponseEntity.ok(companyService.updateCompany(id, company));
    }
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @LogAdminAction(action = "UPDATE_COMPANY_STATUS")
    public ResponseEntity<Company> updateStatus(@PathVariable Long id, @RequestParam String status) {
        return ResponseEntity.ok(companyService.updateStatus(id, status));
    }
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @LogAdminAction(action = "DELETE_COMPANY")
    public ResponseEntity<Void> deleteCompany(@PathVariable Long id) {
        companyService.deleteCompany(id);
        return ResponseEntity.noContent().build();
    }
}