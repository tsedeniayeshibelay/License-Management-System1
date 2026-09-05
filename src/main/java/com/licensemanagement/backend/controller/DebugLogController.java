package com.licensemanagement.backend.controller;
import com.licensemanagement.backend.entity.UsageLog;
import com.licensemanagement.backend.repository.UsageLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/debug-logs")
@RequiredArgsConstructor
public class DebugLogController {
    private final UsageLogRepository usageLogRepository;

    @GetMapping
    public List<UsageLog> getAll() {
        return usageLogRepository.findAll();
    }
}
