# LockStrata - Software License Management System

A robust, enterprise-grade Software Licensing and Digital Rights Management (DRM) platform built with **Spring Boot 3** and **React + Vite**. LockStrata provides end-to-end license provisioning, hardware device fingerprinting, online/offline (AirGap) activation, QR-code authorization, telemetry usage logging, and automated compliance auditing.

---

## Key Features

- **Multi-Tier License Management**: Node-locked, floating seat, time-based trial, perpetual, and enterprise volume licensing.
- **Cryptographic Security**:
  - HMAC-SHA256 license signature verification.
  - Asymmetric RSA digital signatures for AirGap and offline activations.
  - JWT-based stateless authentication with token invalidation and refresh flows.
  - Crockford Base32 readable license keys with check-digit validation.
- **Activation Protocols**:
  - **Online CloudSync**: Real-time validation, automatic machine heartbeat, and remote unbind capabilities.
  - **AirGap Offline Activation**: Signed activation payload generation for machines without internet access.
  - **Visual QR Activation**: Instant mobile/companion device handshake via scanned QR codes.
- **Enterprise Bulk Buyer & Organization Portal**:
  - Company accounts with seat allocations and employee invitation links.
  - Automated license assignment rules and corporate usage telemetry.
- **Administrative Control Suite**:
  - Real-time analytics dashboard with revenue, activation geography, and anomaly detection.
  - Dynamic maintenance mode filter and live system settings configuration.
  - Audit logs, support ticketing, and webhook alerts for critical security events.

---

## Architecture & Technology Stack

### Backend
- **Framework**: Spring Boot 3.3.x (Java 21)
- **Security**: Spring Security 6 with BCrypt & JWT Filters
- **Persistence**: Spring Data JPA / Hibernate with PostgreSQL
- **Database Migration**: Flyway (versioned migrations V1 through V20)
- **Caching**: Caffeine Cache for high-throughput license validation
- **Utilities**: ZXing (QR Code generation), iText / Apache POI (PDF & Excel reporting), Apache Commons

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS & Modern Vanilla CSS with dark/light theme support
- **State & Routing**: React Router v6, Context API
- **Icons**: Lucide React

---

## Getting Started

### Prerequisites
- **Java 21** or later
- **Maven 3.8+**
- **Node.js 18+** & npm
- **PostgreSQL 14+**

### Environment Configuration
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure database credentials, JWT secret, and email settings:
   ```env
   DB_PASSWORD=your_db_password
   JWT_SECRET=your_super_secure_jwt_secret
   HMAC_SECRET=your_hmac_secret
   MAIL_USERNAME=your_email@gmail.com
   MAIL_PASSWORD=your_app_password
   ```

### Running the Backend
```bash
mvn clean spring-boot:run
```
The server will initialize Flyway migrations automatically and start on `http://localhost:8080`.

### Running the Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend portal will be available at `http://localhost:3000`.

---

## API Documentation

Interactive API documentation and schema definitions are available via OpenAPI / Swagger at:
- **Swagger JSON**: `/v3/api-docs` or `swagger-api.json` in the project root.

---

## License

This project is licensed under the MIT License.
