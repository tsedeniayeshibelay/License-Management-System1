package com.licensemanagement.backend.service;

import com.licensemanagement.backend.entity.Device;
import com.licensemanagement.backend.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * FR-02: Multi-attribute device fingerprint scoring with tolerance.
 * FR-11: Clone / VM / identifier-spoofing detection.
 *
 * The fingerprint is composed of up to 5 hardware attributes:
 *   1. machineId  (hostname + OS + arch hash — always present)
 *   2. macAddress (primary NIC MAC)
 *   3. cpuId      (CPU identifier string)
 *   4. motherboardId (DMI/SMBIOS board serial)
 *   5. installId  (UUID written once at first install)
 *
 * A score out of 5 is computed. License.fingerprintTolerance defines how many
 * attributes may differ before the license is considered invalid for this device.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FingerprintService {

    private final DeviceRepository deviceRepository;
    private final NotificationService notificationService;
    private final ActivityLogService activityLogService;

    /** FR-02: Score how well an incoming request matches a stored device fingerprint. */
    public int computeMatchScore(Device stored, FingerprintAttributes incoming) {
        int score = 0;
        if (matches(stored.getMachineId(), incoming.getMachineId()))     score++;
        if (matches(stored.getMacAddress(), incoming.getMacAddress()))   score++;
        if (matches(stored.getCpuId(), incoming.getCpuId()))             score++;
        if (matches(stored.getMotherboardId(), incoming.getMotherboardId())) score++;
        if (matches(stored.getInstallId(), incoming.getInstallId()))     score++;
        return score;
    }

    /**
     * FR-02: Returns true if the incoming attributes are close enough to the stored device
     * given the license's tolerance setting.
     * tolerance=0 → all 5 must match exactly
     * tolerance=1 → 4 of 5 must match (default — handles single hardware swaps)
     * tolerance=2 → 3 of 5 must match
     */
    public boolean isWithinTolerance(Device stored, FingerprintAttributes incoming, int tolerance) {
        int score = computeMatchScore(stored, incoming);
        int totalAttributes = 5;
        int required = totalAttributes - tolerance;
        boolean ok = score >= required;
        log.debug("Fingerprint match: {}/{} attributes (tolerance={}, required={}, result={})",
                score, totalAttributes, tolerance, required, ok ? "PASS" : "FAIL");
        return ok;
    }

    /**
     * FR-11: Detect if an incoming installId is already registered on a DIFFERENT device.
     * This indicates a disk-image clone (two machines with the same installId).
     */
    public Optional<Device> detectCloneByInstallId(String installId, String currentMachineId) {
        if (installId == null || installId.isBlank()) return Optional.empty();
        return deviceRepository.findByInstallId(installId)
                .filter(d -> !d.getMachineId().equals(currentMachineId));
    }

    /**
     * FR-11: Flag a device as a clone, deactivate its activations, and notify admins.
     */
    public void flagAsClone(Device suspect, Device original, Long companyId) {
        suspect.setCloneDetected(true);
        suspect.setCloneOfDeviceId(original.getId());
        suspect.setIsActive(false);
        deviceRepository.save(suspect);

        String message = String.format(
            "🚨 CLONE DETECTED: Device '%s' (ID %d) appears to be a disk-image clone of device '%s' (ID %d). " +
            "Suspect device has been deactivated.",
            suspect.getDeviceName(), suspect.getId(),
            original.getDeviceName(), original.getId()
        );
        log.warn(message);

        try {
            notificationService.notifyAdmins(
                "cloneDetected",
                "CLONE_DETECTED",
                "Clone Installation Detected",
                message,
                "/dashboard/devices"
            );
            if (companyId != null) {
                activityLogService.logAction(companyId, "CLONE_DETECTED", message, null, null);
            }
        } catch (Exception e) {
            log.error("Failed to notify about clone detection: {}", e.getMessage());
        }
    }

    /**
     * FR-11: Heuristic VM detection from client-reported data.
     * Checks known VM vendor strings in cpuId, motherboardId, macAddress.
     */
    public boolean detectVirtualMachine(FingerprintAttributes attrs) {
        List<String> vmIndicators = List.of(
            "vmware", "virtualbox", "vbox", "qemu", "kvm", "hyper-v",
            "hypervisor", "parallels", "xen", "innotek", "bochs",
            "00:0c:29", "00:50:56", "08:00:27", "52:54:00"  // VM MAC prefixes
        );

        String combined = String.join(" ",
            nullSafe(attrs.getCpuId()),
            nullSafe(attrs.getMotherboardId()),
            nullSafe(attrs.getMacAddress()),
            nullSafe(attrs.getVmHint())
        ).toLowerCase();

        for (String indicator : vmIndicators) {
            if (combined.contains(indicator)) {
                log.info("VM indicator '{}' detected in fingerprint attributes", indicator);
                return true;
            }
        }
        return false;
    }

    private boolean matches(String stored, String incoming) {
        if (stored == null || stored.isBlank()) return true; // not collected yet — don't penalise
        if (incoming == null || incoming.isBlank()) return false;
        return stored.equalsIgnoreCase(incoming.trim());
    }

    private String nullSafe(String s) { return s == null ? "" : s; }

    /** DTO carrying all hardware attributes from the client. */
    public static class FingerprintAttributes {
        private String machineId;
        private String macAddress;
        private String cpuId;
        private String motherboardId;
        private String installId;
        private String vmHint;      // e.g. hypervisor brand string reported by client
        private boolean isVm;

        public FingerprintAttributes() {}

        public FingerprintAttributes(String machineId, String macAddress, String cpuId,
                                      String motherboardId, String installId, String vmHint, boolean isVm) {
            this.machineId = machineId;
            this.macAddress = macAddress;
            this.cpuId = cpuId;
            this.motherboardId = motherboardId;
            this.installId = installId;
            this.vmHint = vmHint;
            this.isVm = isVm;
        }

        public String getMachineId()      { return machineId; }
        public void setMachineId(String v) { machineId = v; }
        public String getMacAddress()     { return macAddress; }
        public void setMacAddress(String v){ macAddress = v; }
        public String getCpuId()          { return cpuId; }
        public void setCpuId(String v)    { cpuId = v; }
        public String getMotherboardId()  { return motherboardId; }
        public void setMotherboardId(String v){ motherboardId = v; }
        public String getInstallId()      { return installId; }
        public void setInstallId(String v){ installId = v; }
        public String getVmHint()         { return vmHint; }
        public void setVmHint(String v)   { vmHint = v; }
        public boolean isVm()             { return isVm; }
        public void setVm(boolean v)      { isVm = v; }
    }
}
