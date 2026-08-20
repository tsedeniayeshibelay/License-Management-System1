package com.licensemanagement.backend.service;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
@Service
public class RateLimitingService {
    private final Cache<String, Bucket> bucketCache = Caffeine.newBuilder()
            .expireAfterAccess(1, TimeUnit.HOURS)
            .maximumSize(10000)
            .build();
    private Bucket createNewBucket(String key, int capacity, Duration duration) {
        Bandwidth limit = Bandwidth.classic(capacity, Refill.greedy(capacity, duration));
        return Bucket.builder().addLimit(limit).build();
    }
    public Bucket resolveBucket(String key, int capacity, Duration duration) {
        return bucketCache.get(key, k -> createNewBucket(k, capacity, duration));
    }
    public Bucket resolveGlobalIPBucket(String ip) {
        return resolveBucket("global_ip_" + ip, 60, Duration.ofMinutes(1));
    }
    public Bucket resolveLoginIPBucket(String ip) {
        return resolveBucket("login_ip_" + ip, 5, Duration.ofMinutes(1));
    }
    public Bucket resolveLoginAccountBucket(String username) {
        return resolveBucket("login_acc_" + username, 5, Duration.ofMinutes(1));
    }
    public Bucket resolveRegisterIPBucket(String ip) {
        return resolveBucket("register_ip_" + ip, 3, Duration.ofMinutes(10));
    }
    public Bucket resolvePasswordIPBucket(String ip) {
        return resolveBucket("password_ip_" + ip, 3, Duration.ofMinutes(10));
    }
    public Bucket resolvePasswordAccountBucket(String username) {
        return resolveBucket("password_acc_" + username, 3, Duration.ofMinutes(10));
    }
    public Bucket resolveActivationIPBucket(String ip) {
        return resolveBucket("activation_ip_" + ip, 5, Duration.ofMinutes(1));
    }
    public Bucket resolveActivationAccountBucket(String username) {
        return resolveBucket("activation_acc_" + username, 5, Duration.ofMinutes(1));
    }
}
