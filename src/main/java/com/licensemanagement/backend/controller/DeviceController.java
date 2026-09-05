package com.licensemanagement.backend.controller;
import com.licensemanagement.backend.exception.*;
import com.licensemanagement.backend.entity.Device;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.service.DeviceService;
import com.licensemanagement.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import com.licensemanagement.backend.util.CurrentUserProvider;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import com.licensemanagement.backend.annotation.LogAdminAction;

@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
public class DeviceController {
    private final DeviceService deviceService;
    private final UserService userService;
    private final CurrentUserProvider currentUserProvider;
    @PostMapping
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BULK_BUYER')")
    public ResponseEntity<Device> createDevice(@Valid @RequestBody Device device) {
        User currentUser = currentUserProvider.getCurrentUser();
        device.setUserId(currentUser.getId());
        return new ResponseEntity<>(deviceService.createDevice(device), HttpStatus.CREATED);
    }
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Device>> getAllDevices() {
        return ResponseEntity.ok(deviceService.getAllDevices());
    }
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Device> getDeviceById(@PathVariable Long id) {
        Device device = deviceService.getDeviceById(id);
        User currentUser = currentUserProvider.getCurrentUser();
        if (!currentUser.getRole().equals("ADMIN") && !device.getUserId().equals(currentUser.getId())) {
            throw new ForbiddenException("Access denied! You can only view your own devices.");
        }
        return ResponseEntity.ok(device);
    }
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Device>> getDevicesByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(deviceService.getDevicesByUser(userId));
    }
    @GetMapping("/my-devices")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BULK_BUYER')")
    public ResponseEntity<List<Device>> getMyDevices() {
        User currentUser = currentUserProvider.getCurrentUser();
        return ResponseEntity.ok(deviceService.getDevicesByUser(currentUser.getId()));
    }
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Device> updateDevice(@PathVariable Long id, @Valid @RequestBody Device device) {
        Device existingDevice = deviceService.getDeviceById(id);
        User currentUser = currentUserProvider.getCurrentUser();
        if (!currentUser.getRole().equals("ADMIN") && !existingDevice.getUserId().equals(currentUser.getId())) {
            throw new ForbiddenException("Access denied! You can only update your own devices.");
        }
        return ResponseEntity.ok(deviceService.updateDevice(id, device));
    }
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @LogAdminAction(action = "DELETE_DEVICE")
    public ResponseEntity<Void> deleteDevice(@PathVariable Long id) {
        deviceService.deleteDevice(id);
        return ResponseEntity.noContent().build();
    }
}