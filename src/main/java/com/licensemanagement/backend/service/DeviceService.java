package com.licensemanagement.backend.service;

import com.licensemanagement.backend.entity.Activation;
import com.licensemanagement.backend.entity.Device;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.Product;
import com.licensemanagement.backend.repository.ActivationRepository;
import com.licensemanagement.backend.repository.DeviceRepository;
import com.licensemanagement.backend.repository.LicenseAssignmentRepository;
import com.licensemanagement.backend.repository.LicenseRepository;
import com.licensemanagement.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class DeviceService {
    private final DeviceRepository deviceRepository;
    private final ActivationRepository activationRepository;
    private final LicenseRepository licenseRepository;
    private final LicenseAssignmentRepository licenseAssignmentRepository;
    private final ProductRepository productRepository;
    
    public Device createDevice(Device device) {
        return deviceRepository.save(device);
    }
    public List<Device> getAllDevices() {
        List<Device> devices = deviceRepository.findAllWithUser();
        for (Device device : devices) {
            List<Activation> activations = activationRepository.findByDeviceIdAndIsActiveTrue(device.getId());
            if (activations != null && !activations.isEmpty()) {
                Activation act = activations.get(0);
                device.setActivationId(act.getId());
                if (act.getActivatedAt() != null) {
                    device.setActivatedAt(act.getActivatedAt());
                }
                License lic = act.getLicense() != null ? act.getLicense() 
                        : (act.getLicenseId() != null ? licenseRepository.findById(act.getLicenseId()).orElse(null) : null);
                if (lic != null) {
                    device.setLicenseId(lic.getId());
                    device.setLicenseKey(lic.getLicenseKey());
                    Product prod = lic.getProduct() != null ? lic.getProduct()
                            : (lic.getProductId() != null ? productRepository.findById(lic.getProductId()).orElse(null) : null);
                    if (prod != null) {
                        device.setProductName(prod.getName());
                    }
                }
            }
        }
        return devices;
    }
    public Device getDeviceById(Long id) {
        return deviceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Device not found"));
    }
    public Device getDeviceByMachineId(String machineId) {
        return deviceRepository.findByMachineId(machineId)
                .orElseThrow(() -> new RuntimeException("Device not found"));
    }
    public List<Device> getDevicesByUser(Long userId) {
        Set<Long> userLicenseIds = new HashSet<>();
        List<License> userLicenses = licenseRepository.findByUserId(userId);
        for (License lic : userLicenses) {
            userLicenseIds.add(lic.getId());
        }
        
        List<com.licensemanagement.backend.entity.LicenseAssignment> assignments = licenseAssignmentRepository.findByUserId(userId);
        for (com.licensemanagement.backend.entity.LicenseAssignment assignment : assignments) {
            if ("ACTIVE".equals(assignment.getStatus()) && assignment.getLicenseId() != null) {
                userLicenseIds.add(assignment.getLicenseId());
            }
        }

        Set<Long> deviceIds = new LinkedHashSet<>();
        
        // 1. Devices directly associated with this userId
        List<Device> userDevices = deviceRepository.findByUserId(userId);
        for (Device d : userDevices) {
            deviceIds.add(d.getId());
        }
        
        // 2. Devices activated with any license owned or assigned to this user
        for (Long licId : userLicenseIds) {
            List<Activation> activations = activationRepository.findByLicenseIdAndIsActiveTrue(licId);
            for (Activation act : activations) {
                if (act.getDeviceId() != null) {
                    deviceIds.add(act.getDeviceId());
                }
            }
        }
        
        List<Device> result = new ArrayList<>();
        for (Long devId : deviceIds) {
            deviceRepository.findById(devId).ifPresent(device -> {
                List<Activation> activations = activationRepository.findByDeviceIdAndIsActiveTrue(device.getId());
                
                // Find all active activations on this device that belong to this user's licenses
                List<Activation> userActivations = activations.stream()
                        .filter(a -> userLicenseIds.contains(a.getLicenseId()))
                        .sorted(Comparator.comparing(Activation::getActivatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                        .collect(java.util.stream.Collectors.toList());

                if (userActivations.isEmpty()) {
                    // Device exists for user but no active license activations found
                    result.add(device);
                } else {
                    for (Activation act : userActivations) {
                        Device devItem = copyDevice(device);
                        if (act.getActivatedAt() != null) {
                            devItem.setActivatedAt(act.getActivatedAt());
                        }
                        License lic = act.getLicense() != null ? act.getLicense() 
                                : licenseRepository.findById(act.getLicenseId()).orElse(null);
                        if (lic != null) {
                            devItem.setLicenseId(lic.getId());
                            devItem.setLicenseKey(lic.getLicenseKey());
                            
                            Product prod = lic.getProduct() != null ? lic.getProduct()
                                    : (lic.getProductId() != null ? productRepository.findById(lic.getProductId()).orElse(null) : null);
                            if (prod != null) {
                                devItem.setProductName(prod.getName());
                            }
                        }
                        result.add(devItem);
                    }
                }
            });
        }
        return result;
    }

    private Device copyDevice(Device orig) {
        Device d = new Device();
        d.setId(orig.getId());
        d.setUserId(orig.getUserId());
        d.setMachineId(orig.getMachineId());
        d.setDeviceName(orig.getDeviceName());
        d.setOs(orig.getOs());
        d.setOsVersion(orig.getOsVersion());
        d.setIpAddress(orig.getIpAddress());
        d.setIsActive(orig.getIsActive());
        d.setActivatedAt(orig.getActivatedAt());
        d.setFingerprint(orig.getFingerprint());
        d.setCreatedAt(orig.getCreatedAt());
        d.setLastSeen(orig.getLastSeen());
        return d;
    }
    public Device updateDevice(Long id, Device deviceDetails) {
        Device device = getDeviceById(id);
        if (deviceDetails.getDeviceName() != null) device.setDeviceName(deviceDetails.getDeviceName());
        if (deviceDetails.getOs() != null) device.setOs(deviceDetails.getOs());
        if (deviceDetails.getOsVersion() != null) device.setOsVersion(deviceDetails.getOsVersion());
        if (deviceDetails.getIpAddress() != null) device.setIpAddress(deviceDetails.getIpAddress());
        if (deviceDetails.getIsActive() != null) {
            device.setIsActive(deviceDetails.getIsActive());
        }
        return deviceRepository.save(device);
    }
    @org.springframework.transaction.annotation.Transactional
    public void deleteDevice(Long id) {
        Device device = getDeviceById(id);
        List<Activation> activations = activationRepository.findByDeviceId(id);
        if (activations != null && !activations.isEmpty()) {
            // Guarded deactivation: release active license seats and preserve audit history
            for (Activation act : activations) {
                if (Boolean.TRUE.equals(act.getIsActive())) {
                    act.setIsActive(false);
                    act.setDeactivatedAt(java.time.LocalDateTime.now());
                    activationRepository.save(act);
                }
            }
            device.setIsActive(false);
            deviceRepository.save(device);
        } else {
            deviceRepository.delete(device);
        }
    }
}