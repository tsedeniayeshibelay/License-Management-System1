package com.licensemanagement.backend.service.impl;

import com.licensemanagement.backend.entity.ActivityLog;
import com.licensemanagement.backend.repository.ActivityLogRepository;
import com.licensemanagement.backend.service.ActivityLogService;
import com.licensemanagement.backend.util.CryptoUtil;
import com.licensemanagement.backend.util.KeyHierarchyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityLogServiceImpl implements ActivityLogService {

    private final ActivityLogRepository activityLogRepository;
    private final CryptoUtil cryptoUtil;
    private final KeyHierarchyService keyHierarchyService;

    // FR-09: Genesis hash used as previousHash for the very first log entry
    private static final String GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

    @Override
    @Transactional
    public ActivityLog logAction(Long companyId, String action, String description, Long userId, Long licenseId) {
        ActivityLog entry = new ActivityLog();
        entry.setCompanyId(companyId);
        entry.setAction(action);
        entry.setDescription(description);
        entry.setUserId(userId);
        entry.setLicenseId(licenseId);

        // FR-09: Fetch previous hash for chain continuity
        Optional<ActivityLog> latest = activityLogRepository.findLatestEntry();
        String previousHash = latest.map(ActivityLog::getEntryHash)
                .filter(h -> h != null && !h.isBlank())
                .orElse(GENESIS_HASH);
        entry.setPreviousHash(previousHash);

        // FR-09: Compute SHA-256 over canonical fields: action|companyId|userId|licenseId|description|previousHash
        String canonical = String.join("|",
                nullSafe(action),
                String.valueOf(companyId),
                String.valueOf(userId),
                String.valueOf(licenseId),
                nullSafe(description),
                previousHash
        );
        String entryHash = sha256Hex(canonical);
        entry.setEntryHash(entryHash);

        // FR-09 + FR-10: Sign with dedicated audit key if hierarchy is unlocked, else fall back to root RSA key
        try {
            String sigPayload = entryHash + "|" + previousHash;
            String signature = null;
            if (keyHierarchyService.isUnlocked()) {
                signature = keyHierarchyService.signWithAuditKey(sigPayload);
            }
            if (signature == null) {
                // Fallback: root RSA key (CryptoUtil)
                signature = cryptoUtil.sign(sigPayload);
            }
            entry.setEntrySignature(signature);
        } catch (Exception e) {
            log.warn("Failed to sign audit log entry — proceeding without signature: {}", e.getMessage());
        }

        return activityLogRepository.save(entry);
    }

    @Override
    public List<ActivityLog> getCompanyActivity(Long companyId) {
        return activityLogRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
    }

    // FR-09: Verify the full chain integrity — call this from an admin endpoint
    @Override
    public boolean verifyAuditChain() {
        List<ActivityLog> all = activityLogRepository.findAllByOrderByIdAsc();
        String expectedPrevious = GENESIS_HASH;

        for (ActivityLog entry : all) {
            // 1. Recompute entry hash
            String canonical = String.join("|",
                    nullSafe(entry.getAction()),
                    String.valueOf(entry.getCompanyId()),
                    String.valueOf(entry.getUserId()),
                    String.valueOf(entry.getLicenseId()),
                    nullSafe(entry.getDescription()),
                    nullSafe(entry.getPreviousHash())
            );
            String computedHash = sha256Hex(canonical);

            if (!computedHash.equals(entry.getEntryHash())) {
                log.error("AUDIT TAMPER DETECTED: Entry {} has mismatched hash. Expected {} got {}",
                        entry.getId(), entry.getEntryHash(), computedHash);
                return false;
            }

            // 2. Verify chain link
            if (!expectedPrevious.equals(entry.getPreviousHash())) {
                log.error("AUDIT CHAIN BROKEN: Entry {} previousHash mismatch", entry.getId());
                return false;
            }

            // 3. Verify RSA signature
            if (entry.getEntrySignature() != null) {
                String sigPayload = entry.getEntryHash() + "|" + entry.getPreviousHash();
                boolean sigValid = cryptoUtil.verify(sigPayload, entry.getEntrySignature());
                if (!sigValid) {
                    log.error("AUDIT SIGNATURE INVALID: Entry {} signature verification failed", entry.getId());
                    return false;
                }
            }

            expectedPrevious = entry.getEntryHash();
        }
        return true;
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 failed", e);
        }
    }

    private static String nullSafe(String s) {
        return s == null ? "" : s;
    }
}
