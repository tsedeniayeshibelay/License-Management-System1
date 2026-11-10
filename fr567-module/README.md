# FR-05 / FR-06 / FR-07 Module

Standalone implementation of three functional requirements. Drop this into
your Spring Boot backend and Python desktop client.

## What's Inside

| FR | What it does | Backend files | Client file |
|----|-------------|---------------|------------|
| **FR-05** | Offline activation with sequence numbers + signed receipt confirmation (closed-loop exchange) | `OfflineSequenceService`, `OfflineReceiptController`, `OfflineRequestLog`, `OfflineActivationPayload`, `OfflineActivationResponse` | — |
| **FR-06** | Runtime agent that validates the license container at launch and periodically during execution | — | `client/fr06_heartbeat.py` |
| **FR-07** | Network license server with pooled seats, lease checkout/renew/checkin, and auto-cleanup of expired leases | `NetworkLicenseService`, `NetworkLicenseController`, `NetworkLease`, `NetworkLeaseRepository` | — |

## How to Integrate

### 1. Backend (Java / Spring Boot)

Copy the `backend/` subfolder into your project's source tree. The module uses
**SPI interfaces** (in `backend/spi/`) that you must implement so the module
can talk to your existing License, Device, and User entities without being
coupled to them.

**Steps:**

1. Copy `backend/entity/`, `backend/repository/`, `backend/dto/`,
   `backend/service/`, `backend/controller/`, `backend/spi/` into your
   `src/main/java/.../fr567/` package (adjust the package declarations).

2. Implement the 4 SPI interfaces (see below).

3. Run the two SQL migrations in `backend/migration/`.

4. Make sure `@EnableScheduling` is on your main application class (needed for
   FR-07's expired-lease cleanup job).

5. Ensure your `SecurityConfig` permits the new endpoints:
   - `POST /api/fr567/offline/receipt`
   - `POST /api/fr567/network-licenses/checkout`
   - `POST /api/fr567/network-licenses/renew`
   - `POST /api/fr567/network-licenses/checkin`
   - `GET  /api/fr567/network-licenses/pool/{licenseKey}`

### 2. SPI Interfaces to Implement

| Interface | What it provides |
|-----------|-----------------|
| `LicenseLookup` | Find a license by key; check type/status/expiry/seat pool |
| `DeviceLookup` | Find or register a device by machine ID |
| `UserContext` | Get the current authenticated user's ID and role |
| `SigningService` | Sign and verify data with your RSA key (for license containers and lease tokens) |

Each interface is a single-method or two-method interface. Implementations
are typically thin wrappers around your existing repositories and CryptoUtil.
See the files in `backend/spi/` for full Javadoc.

### 3. Client (Python)

Copy `client/fr06_heartbeat.py` into your desktop app project.

```python
from fr06_heartbeat import LicenseHeartbeat

heartbeat = LicenseHeartbeat(
    license_file_path="/path/to/license.lic",
    machine_id="HW-ABC123",
    public_key_pem="-----BEGIN PUBLIC KEY-----...",
    on_fail=lambda reason: app.show_error_and_exit(reason),
)

heartbeat.start(interval_seconds=300)  # re-validate every 5 minutes
heartbeat.stop()                        # stop when app closes
```

The heartbeat module is a plain Python class — no tkinter dependency, no
framework coupling. You wire the fail callback to whatever your UI uses.
