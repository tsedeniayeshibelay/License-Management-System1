package com.licensemanagement.backend.service;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Service;
import java.util.concurrent.TimeUnit;
@Service
public class LoginAttemptService {
    private final int MAX_ATTEMPTS = 5;
    private final Cache<String, Integer> attemptsCache = Caffeine.newBuilder()
            .expireAfterWrite(15, TimeUnit.MINUTES) 
            .maximumSize(10000)
            .build();
    public void loginSucceeded(String key) {
        attemptsCache.invalidate(key);
    }
    public void loginFailed(String key) {
        int attempts = attemptsCache.get(key, k -> 0);
        attemptsCache.put(key, attempts + 1);
    }
    public boolean isBlocked(String key) {
        return attemptsCache.get(key, k -> 0) >= MAX_ATTEMPTS;
    }
}
