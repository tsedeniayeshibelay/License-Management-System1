package com.licensemanagement.backend.fr567.spi;

/**
 * SPI: Your project must implement this interface so FR-07 knows
 * who is making the request. Typically wraps Spring Security's
 * SecurityContextHolder or your CurrentUserProvider.
 */
public interface UserContext {

    /**
     * @return The ID of the currently authenticated user.
     */
    Long getCurrentUserId();

    /**
     * @return The role string of the current user ("ADMIN", "CUSTOMER", etc.).
     */
    String getCurrentRole();
}
