package com.licensemanagement.backend.service;
import com.licensemanagement.backend.exception.*;
import com.licensemanagement.backend.dto.ChangePasswordRequest;
import com.licensemanagement.backend.dto.UpdateProfileRequest;
import com.licensemanagement.backend.entity.*;
import com.licensemanagement.backend.repository.*;
import com.licensemanagement.backend.util.JwtUtil;
import com.licensemanagement.backend.util.PasswordValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final CompanyRepository companyRepository;
    private final PasswordValidator passwordValidator;
    private final LoginAttemptService loginAttemptService;
    private final RateLimitingService rateLimitingService;
    private final LicenseRepository licenseRepository;
    private final ActivationRepository activationRepository;
    private final DeviceRepository deviceRepository;
    private final KnownDeviceRepository knownDeviceRepository;
    private final NotificationRepository notificationRepository;
    private final UnbindRequestRepository unbindRequestRepository;
    private final SupportTicketRepository supportTicketRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final AdminLogRepository adminLogRepository;
    public User registerUser(User user) {
        if ("ADMIN".equalsIgnoreCase(user.getRole())) {
            throw new BusinessValidationException("Administrator accounts cannot be registered publicly. Administrators must log in directly.");
        }
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new ResourceConflictException("Email already in use!");
        }
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new ResourceConflictException("Username already taken!");
        }
        String passwordError = passwordValidator.validatePassword(user.getPassword());
        if (passwordError != null) {
            throw new BusinessValidationException(passwordError);
        }
        if ("COMPANY".equalsIgnoreCase(user.getRole()) || "BULK_BUYER".equalsIgnoreCase(user.getRole())) {
            Company company = new Company();
            company.setName(user.getCompany());
            company.setEmail(user.getEmail());
            company.setPhone(user.getPhone());
            company.setStatus("ACTIVE");
            Company savedCompany = companyRepository.save(company);
            user.setCompanyId(savedCompany.getId());
        }
        if (user.getStatus() == null || user.getStatus().isEmpty()) {
            user.setStatus("ACTIVE");
        }
        if (user.getRole() == null || user.getRole().isEmpty()) {
            user.setRole("CUSTOMER");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }
    @Cacheable(value = "users", key = "#email")
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }
    public User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
    @CacheEvict(value = "users", allEntries = true)
    public User updateUser(Long id, User updatedUser, boolean isAdmin) {
        User existingUser = findById(id);
        if (updatedUser.getFullName() != null) {
            existingUser.setFullName(updatedUser.getFullName());
        }
        if (updatedUser.getCompany() != null) {
            existingUser.setCompany(updatedUser.getCompany());
        }
        if (updatedUser.getPhone() != null) {
            existingUser.setPhone(updatedUser.getPhone());
        }
        if (isAdmin) {
            if (updatedUser.getRole() != null && !updatedUser.getRole().isEmpty()) {
                if ("ADMIN".equals(existingUser.getRole()) && !"ADMIN".equals(updatedUser.getRole())) {
                    if (userRepository.countByRole("ADMIN") <= 1) {
                        throw new BusinessValidationException("Cannot demote the only remaining administrator account.");
                    }
                }
                existingUser.setRole(updatedUser.getRole().toUpperCase());
            }
            if (updatedUser.getStatus() != null && !updatedUser.getStatus().isEmpty()) {
                if ("SUSPENDED".equalsIgnoreCase(updatedUser.getStatus()) && "ADMIN".equals(existingUser.getRole())) {
                    if (userRepository.countByRole("ADMIN") <= 1) {
                        throw new BusinessValidationException("Cannot suspend the only remaining administrator account.");
                    }
                }
                existingUser.setStatus(updatedUser.getStatus().toUpperCase());
            }
            if (updatedUser.getMustChangePassword() != null) {
                existingUser.setMustChangePassword(updatedUser.getMustChangePassword());
            }
        }
        return userRepository.save(existingUser);
    }

    public User updateUser(Long id, User updatedUser) {
        return updateUser(id, updatedUser, false);
    }

    @CacheEvict(value = "users", allEntries = true)
    public void updatePassword(Long id, String newPassword, Boolean forceChange) {
        User user = findById(id);
        String passwordError = passwordValidator.validatePassword(newPassword);
        if (passwordError != null) {
            throw new BusinessValidationException(passwordError);
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        if (forceChange != null) {
            user.setMustChangePassword(forceChange);
        }
        userRepository.save(user);
    }

    public void updatePassword(Long id, String newPassword) {
        updatePassword(id, newPassword, false);
    }

    @Transactional
    @CacheEvict(value = "users", allEntries = true)
    public void deleteUser(Long id, Long currentAdminId) {
        if (currentAdminId != null && currentAdminId.equals(id)) {
            throw new BusinessValidationException("You cannot delete your own administrator account.");
        }
        User user = findById(id);
        if ("ADMIN".equals(user.getRole()) && userRepository.countByRole("ADMIN") <= 1) {
            throw new BusinessValidationException("Cannot delete the only remaining administrator account.");
        }

        // Deactivate personal license activations so license seats are released
        List<License> licenses = licenseRepository.findByUserId(id);
        if (licenses != null && !licenses.isEmpty()) {
            List<Long> licIds = licenses.stream().map(License::getId).toList();
            List<Activation> acts = activationRepository.findByLicenseIdInAndIsActiveTrue(licIds);
            if (acts != null) {
                for (Activation a : acts) {
                    a.setIsActive(false);
                    a.setDeactivatedAt(LocalDateTime.now());
                    activationRepository.save(a);
                }
            }
            for (License l : licenses) {
                l.setStatus("REVOKED");
                licenseRepository.save(l);
            }
        }

        // Clean up sessions and notifications
        knownDeviceRepository.deleteByUserId(id);
        notificationRepository.deleteByUserId(id);

        // Check dependencies
        boolean hasDependencies = (licenses != null && !licenses.isEmpty())
                || (orderRepository.findByUserIdOrderByOrderDateDesc(id) != null && !orderRepository.findByUserIdOrderByOrderDateDesc(id).isEmpty())
                || (supportTicketRepository.findByUserIdOrderByCreatedAtDesc(id) != null && !supportTicketRepository.findByUserIdOrderByCreatedAtDesc(id).isEmpty());

        if (hasDependencies) {
            // Guarded soft-delete to preserve foreign keys and audit logs
            user.setStatus("DELETED");
            userRepository.save(user);
        } else {
            List<AdminLog> logs = adminLogRepository.findByAdminId(id);
            if (logs != null && !logs.isEmpty()) {
                adminLogRepository.deleteAll(logs);
            }
            userRepository.delete(user);
        }
    }

    public void deleteUser(Long id) {
        deleteUser(id, null);
    }

    public User authenticate(String email, String password) {
        if (loginAttemptService.isBlocked(email)) {
            throw new ForbiddenException("Account is temporarily locked due to too many failed login attempts. Try again later.");
        }
        io.github.bucket4j.Bucket bucket = rateLimitingService.resolveLoginAccountBucket(email);
        if (!bucket.tryConsume(1)) {
            throw new BusinessValidationException("Too many login requests for this account. Try again later.");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        if ("DELETED".equalsIgnoreCase(user.getStatus())) {
            throw new UnauthorizedException("This account has been deleted.");
        }
        if ("SUSPENDED".equalsIgnoreCase(user.getStatus())) {
            throw new UnauthorizedException("This account has been suspended by an administrator.");
        }
        if (!passwordEncoder.matches(password, user.getPassword())) {
            loginAttemptService.loginFailed(email);
            throw new UnauthorizedException("Invalid password!");
        }
        loginAttemptService.loginSucceeded(email);
        return user;
    }
    @Transactional
    @CacheEvict(value = "users", allEntries = true)
    public User updateProfile(Long userId, UpdateProfileRequest request) {
        User user = findById(userId);
        if (request.getFullName() != null && !request.getFullName().isEmpty()) {
            user.setFullName(request.getFullName());
        }
        if (request.getPhone() != null && !request.getPhone().isEmpty()) {
            user.setPhone(request.getPhone());
        }
        if (request.getCompany() != null && !request.getCompany().isEmpty()) {
            user.setCompany(request.getCompany());
        }
        if (request.getPreferences() != null) {
            user.setPreferences(sanitizeAndValidatePreferences(user, request.getPreferences()));
        }
        return userRepository.save(user);
    }

    private String sanitizeAndValidatePreferences(User user, String prefsJson) {
        if (prefsJson == null || prefsJson.isBlank()) return prefsJson;
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(prefsJson);
            if (root.isObject()) {
                com.fasterxml.jackson.databind.node.ObjectNode obj = (com.fasterxml.jackson.databind.node.ObjectNode) root;
                if (obj.has("notifications") && obj.get("notifications").isObject()) {
                    com.fasterxml.jackson.databind.node.ObjectNode notifs = (com.fasterxml.jackson.databind.node.ObjectNode) obj.get("notifications");
                    // 1. Completely remove SMS - do not allow SMS to be persisted
                    notifs.remove("sms");

                    // 2. Validate emailAddress if present
                    if (notifs.has("emailAddress")) {
                        String email = notifs.get("emailAddress").asText();
                        if (email != null && !email.isBlank()) {
                            email = email.trim();
                            String emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";
                            if (!email.matches(emailRegex)) {
                                throw new BusinessValidationException("Invalid notification email address format: " + email);
                            }
                            notifs.put("emailAddress", email);
                        } else if (user != null && user.getEmail() != null) {
                            notifs.put("emailAddress", user.getEmail());
                        }
                    } else if (user != null && user.getEmail() != null) {
                        notifs.put("emailAddress", user.getEmail());
                    }
                }
                return mapper.writeValueAsString(obj);
            }
        } catch (BusinessValidationException bve) {
            throw bve;
        } catch (Exception ignored) {
        }
        return prefsJson;
    }
    @CacheEvict(value = "users", allEntries = true)
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = findById(userId);
        if (request.getCurrentPassword() == null || request.getCurrentPassword().isEmpty()) {
            throw new BusinessValidationException("Current password is required!");
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new UnauthorizedException("Current password is incorrect!");
        }
        if (request.getNewPassword() == null || request.getNewPassword().isEmpty()) {
            throw new BusinessValidationException("New password is required!");
        }
        String passwordError = passwordValidator.validatePassword(request.getNewPassword());
        if (passwordError != null) {
            throw new BusinessValidationException(passwordError);
        }
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BusinessValidationException("Passwords do not match!");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);
    }

    @CacheEvict(value = "users", allEntries = true)
    public void changePassword(Long userId, UpdateProfileRequest request) {
        User user = findById(userId);
        if (request.getCurrentPassword() == null || request.getCurrentPassword().isEmpty()) {
            throw new BusinessValidationException("Current password is required!");
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new UnauthorizedException("Current password is incorrect!");
        }
        if (request.getNewPassword() == null || request.getNewPassword().isEmpty()) {
            throw new BusinessValidationException("New password is required!");
        }
        String passwordError = passwordValidator.validatePassword(request.getNewPassword());
        if (passwordError != null) {
            throw new BusinessValidationException(passwordError);
        }
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BusinessValidationException("Passwords do not match!");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);
    }
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
        if ("DELETED".equalsIgnoreCase(user.getStatus())) {
            throw new org.springframework.security.authentication.DisabledException("This account has been deleted.");
        }
        if ("SUSPENDED".equalsIgnoreCase(user.getStatus())) {
            throw new org.springframework.security.authentication.DisabledException("This account has been suspended by an administrator.");
        }
        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole()))
        );
    }

    public Map<String, Object> exportUserData(User user) {
        Map<String, Object> data = new LinkedHashMap<>();

        // Metadata
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("exportTimestamp", LocalDateTime.now().toString());
        metadata.put("exportedFor", user.getEmail());
        metadata.put("system", "LockStrata Licensing Management Platform");
        metadata.put("notice", "All sensitive credentials (passwords, tokens, 2FA secrets) have been excluded. License keys are masked for security.");
        data.put("metadata", metadata);

        // Profile (No password, no 2FA secret, no reset tokens)
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("id", user.getId());
        profile.put("username", user.getUsername());
        profile.put("email", user.getEmail());
        profile.put("fullName", user.getFullName());
        profile.put("company", user.getCompany());
        profile.put("phone", user.getPhone());
        profile.put("role", user.getRole());
        profile.put("status", user.getStatus());
        profile.put("createdAt", user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
        profile.put("preferences", user.getPreferences());
        data.put("profile", profile);

        // Licenses (masked keys)
        List<License> licenses = licenseRepository.findByUserId(user.getId());
        List<Map<String, Object>> licenseList = new ArrayList<>();
        List<Long> licenseIds = new ArrayList<>();
        if (licenses != null) {
            for (License l : licenses) {
                licenseIds.add(l.getId());
                Map<String, Object> licMap = new LinkedHashMap<>();
                licMap.put("id", l.getId());
                licMap.put("productName", l.getProduct() != null ? l.getProduct().getName() : "Product #" + l.getProductId());
                licMap.put("licenseKey", maskKey(l.getLicenseKey()));
                licMap.put("licenseType", l.getLicenseType());
                licMap.put("status", l.getStatus());
                licMap.put("maxActivations", l.getMaxActivations());
                licMap.put("expiryDate", l.getExpiryDate() != null ? l.getExpiryDate().toString() : null);
                licMap.put("createdAt", l.getCreatedAt() != null ? l.getCreatedAt().toString() : null);
                licenseList.add(licMap);
            }
        }
        data.put("licenses", licenseList);

        // Devices
        List<Device> devices = deviceRepository.findByUserId(user.getId());
        List<Map<String, Object>> deviceList = new ArrayList<>();
        if (devices != null) {
            for (Device d : devices) {
                Map<String, Object> devMap = new LinkedHashMap<>();
                devMap.put("id", d.getId());
                devMap.put("deviceName", d.getDeviceName());
                devMap.put("operatingSystem", d.getOs());
                devMap.put("isActive", d.getIsActive());
                devMap.put("lastSeen", d.getLastSeen() != null ? d.getLastSeen().toString() : null);
                deviceList.add(devMap);
            }
        }
        data.put("devices", deviceList);

        // Activations history
        List<Map<String, Object>> activationList = new ArrayList<>();
        if (!licenseIds.isEmpty()) {
            for (Long lid : licenseIds) {
                List<Activation> acts = activationRepository.findByLicenseId(lid);
                if (acts != null) {
                    for (Activation a : acts) {
                        Map<String, Object> actMap = new LinkedHashMap<>();
                        actMap.put("activationId", a.getId());
                        actMap.put("licenseId", a.getLicenseId());
                        actMap.put("deviceId", a.getDeviceId());
                        actMap.put("isActive", a.getIsActive());
                        actMap.put("activatedAt", a.getActivatedAt() != null ? a.getActivatedAt().toString() : null);
                        actMap.put("deactivatedAt", a.getDeactivatedAt() != null ? a.getDeactivatedAt().toString() : null);
                        activationList.add(actMap);
                    }
                }
            }
        }
        data.put("activations", activationList);

        // Unbind Requests
        List<UnbindRequest> unbinds = unbindRequestRepository.findByUserId(user.getId());
        List<Map<String, Object>> unbindList = new ArrayList<>();
        if (unbinds != null) {
            for (UnbindRequest u : unbinds) {
                Map<String, Object> uMap = new LinkedHashMap<>();
                uMap.put("id", u.getId());
                uMap.put("licenseId", u.getLicenseId());
                uMap.put("deviceId", u.getDeviceId());
                uMap.put("reason", u.getReason());
                uMap.put("status", u.getStatus());
                uMap.put("createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : null);
                uMap.put("resolvedAt", u.getResolvedAt() != null ? u.getResolvedAt().toString() : null);
                unbindList.add(uMap);
            }
        }
        data.put("unbindRequests", unbindList);

        // Support Tickets
        List<SupportTicket> tickets = supportTicketRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        List<Map<String, Object>> ticketList = new ArrayList<>();
        if (tickets != null) {
            for (SupportTicket t : tickets) {
                Map<String, Object> tMap = new LinkedHashMap<>();
                tMap.put("id", t.getId());
                tMap.put("category", t.getCategory());
                tMap.put("subject", t.getSubject());
                tMap.put("priority", t.getPriority());
                tMap.put("status", t.getStatus());
                tMap.put("createdAt", t.getCreatedAt() != null ? t.getCreatedAt().toString() : null);
                ticketList.add(tMap);
            }
        }
        data.put("supportTickets", ticketList);

        // If user is associated with a company, export all company data: profile, products, licenses, buyers, orders
        if (user.getCompanyId() != null) {
            companyRepository.findById(user.getCompanyId()).ifPresent(c -> {
                Map<String, Object> compMap = new LinkedHashMap<>();
                compMap.put("id", c.getId());
                compMap.put("name", c.getName());
                compMap.put("email", c.getEmail());
                compMap.put("phone", c.getPhone());
                compMap.put("status", c.getStatus());
                compMap.put("createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
                data.put("companyProfile", compMap);
            });

            List<Product> products = productRepository.findByCompanyId(user.getCompanyId());
            List<Map<String, Object>> productList = new ArrayList<>();
            if (products != null) {
                for (Product p : products) {
                    Map<String, Object> pMap = new LinkedHashMap<>();
                    pMap.put("id", p.getId());
                    pMap.put("name", p.getName());
                    pMap.put("description", p.getDescription());
                    pMap.put("category", p.getCategory());
                    pMap.put("version", p.getVersion());
                    pMap.put("price", p.getPrice());
                    pMap.put("status", p.getStatus());
                    pMap.put("createdAt", p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
                    productList.add(pMap);
                }
            }
            data.put("companyProducts", productList);

            List<License> compLicenses = licenseRepository.findByCompanyIdWithDetails(user.getCompanyId());
            List<Map<String, Object>> compLicenseList = new ArrayList<>();
            Map<Long, Map<String, Object>> buyersMap = new LinkedHashMap<>();
            if (compLicenses != null) {
                for (License l : compLicenses) {
                    Map<String, Object> lMap = new LinkedHashMap<>();
                    lMap.put("id", l.getId());
                    lMap.put("licenseKey", l.getLicenseKey());
                    lMap.put("productId", l.getProductId());
                    lMap.put("productName", l.getProduct() != null ? l.getProduct().getName() : "Product #" + l.getProductId());
                    lMap.put("licenseType", l.getLicenseType());
                    lMap.put("status", l.getStatus());
                    lMap.put("maxActivations", l.getMaxActivations());
                    lMap.put("usedSeats", l.getUsedSeats());
                    lMap.put("totalSeats", l.getTotalSeats());
                    lMap.put("issuedDate", l.getIssuedDate() != null ? l.getIssuedDate().toString() : null);
                    lMap.put("expiryDate", l.getExpiryDate() != null ? l.getExpiryDate().toString() : null);
                    lMap.put("buyerId", l.getUserId());
                    if (l.getUser() != null) {
                        lMap.put("buyerName", l.getUser().getFullName());
                        lMap.put("buyerEmail", l.getUser().getEmail());

                        if (!buyersMap.containsKey(l.getUserId())) {
                            Map<String, Object> bMap = new LinkedHashMap<>();
                            bMap.put("id", l.getUser().getId());
                            bMap.put("name", l.getUser().getFullName());
                            bMap.put("email", l.getUser().getEmail());
                            bMap.put("role", l.getUser().getRole());
                            bMap.put("company", l.getUser().getCompany());
                            bMap.put("licensesCount", 0);
                            buyersMap.put(l.getUserId(), bMap);
                        }
                        Map<String, Object> b = buyersMap.get(l.getUserId());
                        b.put("licensesCount", ((Integer) b.get("licensesCount")) + 1);
                    }
                    compLicenseList.add(lMap);
                }
            }
            data.put("companyLicenses", compLicenseList);
            data.put("companyBuyers", new ArrayList<>(buyersMap.values()));

            List<Order> orders = orderRepository.findByCompanyIdOrderByOrderDateDesc(user.getCompanyId());
            List<Map<String, Object>> orderList = new ArrayList<>();
            if (orders != null) {
                for (Order o : orders) {
                    Map<String, Object> oMap = new LinkedHashMap<>();
                    oMap.put("id", o.getId());
                    oMap.put("orderNumber", o.getOrderNumber());
                    oMap.put("userId", o.getUserId());
                    oMap.put("productId", o.getProductId());
                    oMap.put("licenseId", o.getLicenseId());
                    oMap.put("quantity", o.getQuantity());
                    oMap.put("amount", o.getAmount());
                    oMap.put("status", o.getStatus());
                    oMap.put("orderDate", o.getOrderDate() != null ? o.getOrderDate().toString() : null);
                    orderList.add(oMap);
                }
            }
            data.put("companyOrders", orderList);
        }

        return data;
    }

    private String maskKey(String key) {
        if (key == null || key.length() <= 8) return "••••-••••";
        return "••••-••••-" + key.substring(key.length() - 4);
    }

    @Transactional
    @CacheEvict(value = "users", allEntries = true)
    public void deleteAccount(Long userId, String password) {
        User user = findById(userId);
        if (password == null || password.trim().isEmpty()) {
            throw new BusinessValidationException("Password is required to confirm account deletion.");
        }
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new UnauthorizedException("Incorrect password. Account deletion rejected.");
        }

        // If user is associated with a company, cascade deactivation to company & company assets
        if (user.getCompanyId() != null) {
            companyRepository.findById(user.getCompanyId()).ifPresent(c -> {
                c.setStatus("DELETED");
                companyRepository.save(c);
            });

            // Revoke all company licenses and deactivate activations
            List<License> compLicenses = licenseRepository.findByCompanyId(user.getCompanyId());
            if (compLicenses != null && !compLicenses.isEmpty()) {
                List<Long> compLicenseIds = compLicenses.stream().map(License::getId).toList();
                List<Activation> compActivations = activationRepository.findByLicenseIdInAndIsActiveTrue(compLicenseIds);
                if (compActivations != null) {
                    for (Activation act : compActivations) {
                        act.setIsActive(false);
                        act.setDeactivatedAt(LocalDateTime.now());
                        activationRepository.save(act);
                    }
                }
                for (License lic : compLicenses) {
                    lic.setStatus("REVOKED");
                    licenseRepository.save(lic);
                }
            }

            // Archive company products
            List<Product> compProducts = productRepository.findByCompanyId(user.getCompanyId());
            if (compProducts != null) {
                for (Product prod : compProducts) {
                    prod.setStatus("ARCHIVED");
                    productRepository.save(prod);
                }
            }
        }

        // 1. Deactivate active license activations for user's personal licenses
        List<License> licenses = licenseRepository.findByUserId(userId);
        if (licenses != null && !licenses.isEmpty()) {
            List<Long> licenseIds = licenses.stream().map(License::getId).toList();
            List<Activation> activeActivations = activationRepository.findByLicenseIdInAndIsActiveTrue(licenseIds);
            if (activeActivations != null) {
                for (Activation act : activeActivations) {
                    act.setIsActive(false);
                    act.setDeactivatedAt(LocalDateTime.now());
                    activationRepository.save(act);
                }
            }
        }

        // 2. Remove or deactivate known login devices
        knownDeviceRepository.deleteByUserId(userId);

        // 3. Clean up non-essential notifications
        notificationRepository.deleteByUserId(userId);

        // 4. Soft delete user: set status to DELETED
        user.setStatus("DELETED");
        userRepository.save(user);
    }
}