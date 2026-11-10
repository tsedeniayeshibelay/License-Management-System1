"""
FR-06 Test Script — Run this with ONE command:
    python test_fr06.py

It does everything for you:
  1. Creates a valid signed license file using your real RSA key from .env
  2. Runs 5 tests against the LicenseHeartbeat module
  3. Prints PASS/FAIL for each test
  4. Cleans up temp files

No backend, no database, no frontend needed. Just Python + cryptography package.
"""

import json
import base64
import os
import sys
import tempfile
import datetime

# Add the client folder to path so we can import fr06_heartbeat
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fr06_heartbeat import LicenseHeartbeat

# ---------------------------------------------------------------------------
# Step 1: Load the RSA keys from the project .env file
# ---------------------------------------------------------------------------

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.join(PROJECT_ROOT, ".env")

print("=" * 60)
print("FR-06 HEARTBEAT TEST")
print("=" * 60)

# Parse .env manually (no python-dotenv dependency needed)
env_vars = {}
if os.path.exists(ENV_PATH):
    with open(ENV_PATH, "r") as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                key, val = line.split("=", 1)
                env_vars[key.strip()] = val.strip()

PRIVATE_KEY_B64 = env_vars.get("RSA_PRIVATE_KEY", "")
PUBLIC_KEY_B64  = env_vars.get("RSA_PUBLIC_KEY", "")

if not PRIVATE_KEY_B64 or not PUBLIC_KEY_B64:
    print("ERROR: RSA keys not found in .env file at:", ENV_PATH)
    sys.exit(1)

# Convert the Base64 DER keys to PEM format for the heartbeat module
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import rsa

# Load private key (for signing test licenses)
private_key = serialization.load_der_private_key(
    base64.b64decode(PRIVATE_KEY_B64),
    password=None,
    backend=default_backend()
)

# Load public key → export as PEM (the heartbeat module takes PEM)
public_key_obj = serialization.load_der_public_key(
    base64.b64decode(PUBLIC_KEY_B64),
    backend=default_backend()
)
PUBLIC_KEY_PEM = public_key_obj.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
).decode("utf-8")

print(f"Keys loaded successfully from .env")
print(f"  Private key: RSA-{private_key.key_size}")
print(f"  Public key:  RSA-{public_key_obj.key_size}")
print()

# ---------------------------------------------------------------------------
# Helper: create a signed license file
# ---------------------------------------------------------------------------

def create_license_file(filepath, machine_id, expiry_date="2099-12-31"):
    """Create a valid signed .lic file."""
    payload = {
        "licenseKey": "TEST-KEY-1234",
        "deviceFingerprint": machine_id,
        "expiryDate": expiry_date,
        "productId": "TEST-PRODUCT",
        "licenseType": "SUBSCRIPTION",
        "activationStatus": "ACTIVE",
        "issuedAt": 1700000000000
    }
    payload_json = json.dumps(payload)

    # Sign with RSA private key (SHA256withRSA, PKCS1v15)
    signature_bytes = private_key.sign(
        payload_json.encode("utf-8"),
        padding.PKCS1v15(),
        hashes.SHA256()
    )

    lic_data = {
        "payload": base64.b64encode(payload_json.encode("utf-8")).decode("utf-8"),
        "signature": base64.b64encode(signature_bytes).decode("utf-8"),
        "formatVersion": "1"
    }

    with open(filepath, "w") as f:
        json.dump(lic_data, f)

def create_tampered_license_file(filepath, machine_id):
    """Create a .lic file with a corrupted signature."""
    create_license_file(filepath, machine_id)
    with open(filepath, "r") as f:
        data = json.load(f)
    data["signature"] = data["signature"][:-4] + "XXXX"  # corrupt last 4 chars
    with open(filepath, "w") as f:
        json.dump(data, f)

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

TEST_MACHINE_ID = "HW-TESTMACHINE12345"
results = []

def test(name, ok, reason):
    status = "PASS" if ok else "FAIL"
    results.append((ok, name))
    print(f"  [{status}] {name}")
    if not ok:
        print(f"         Reason: {reason}")
    print()


print("-" * 60)
print("TEST 1: Valid license should pass")
print("-" * 60)
tmpdir = tempfile.mkdtemp()
valid_lic = os.path.join(tmpdir, "valid.lic")
create_license_file(valid_lic, TEST_MACHINE_ID)

hb = LicenseHeartbeat(
    license_file_path=valid_lic,
    machine_id=TEST_MACHINE_ID,
    public_key_pem=PUBLIC_KEY_PEM,
    on_fail=lambda r: print(f"  [FAIL CALLBACK] {r}"),
)
ok, reason = hb.validate_now()
test("Valid license passes validation", ok, reason)


print("-" * 60)
print("TEST 2: Tampered signature should fail")
print("-" * 60)
tampered_lic = os.path.join(tmpdir, "tampered.lic")
create_tampered_license_file(tampered_lic, TEST_MACHINE_ID)

hb2 = LicenseHeartbeat(
    license_file_path=tampered_lic,
    machine_id=TEST_MACHINE_ID,
    public_key_pem=PUBLIC_KEY_PEM,
    on_fail=lambda r: print(f"  [FAIL CALLBACK] {r}"),
)
ok, reason = hb2.validate_now()
test("Tampered signature is rejected", not ok, reason)
# Note: we expect ok=False, so test passes if NOT ok


print("-" * 60)
print("TEST 3: Wrong machine ID should fail")
print("-" * 60)
wrong_machine_lic = os.path.join(tmpdir, "wrong_machine.lic")
create_license_file(wrong_machine_lic, "HW-CORRECT-MACHINE")

hb3 = LicenseHeartbeat(
    license_file_path=wrong_machine_lic,
    machine_id="HW-WRONG-MACHINE",
    public_key_pem=PUBLIC_KEY_PEM,
    on_fail=lambda r: print(f"  [FAIL CALLBACK] {r}"),
)
ok, reason = hb3.validate_now()
test("Wrong machine ID is rejected", not ok, reason)


print("-" * 60)
print("TEST 4: Missing file should fail")
print("-" * 60)
hb4 = LicenseHeartbeat(
    license_file_path=os.path.join(tmpdir, "does_not_exist.lic"),
    machine_id=TEST_MACHINE_ID,
    public_key_pem=PUBLIC_KEY_PEM,
    on_fail=lambda r: print(f"  [FAIL CALLBACK] {r}"),
)
ok, reason = hb4.validate_now()
test("Missing file is rejected", not ok, reason)


print("-" * 60)
print("TEST 5: Expired license should fail")
print("-" * 60)
expired_lic = os.path.join(tmpdir, "expired.lic")
create_license_file(expired_lic, TEST_MACHINE_ID, expiry_date="2020-01-01")

hb5 = LicenseHeartbeat(
    license_file_path=expired_lic,
    machine_id=TEST_MACHINE_ID,
    public_key_pem=PUBLIC_KEY_PEM,
    on_fail=lambda r: print(f"  [FAIL CALLBACK] {r}"),
)
ok, reason = hb5.validate_now()
test("Expired license is rejected", not ok, reason)


print("-" * 60)
print("TEST 6: Periodic heartbeat detects tamper at runtime")
print("-" * 60)
runtime_lic = os.path.join(tmpdir, "runtime.lic")
create_license_file(runtime_lic, TEST_MACHINE_ID)

heartbeat_triggered = {"failed": False, "reason": ""}

def on_runtime_fail(reason):
    heartbeat_triggered["failed"] = True
    heartbeat_triggered["reason"] = reason
    print(f"  [FAIL CALLBACK TRIGGERED] {reason}")

hb6 = LicenseHeartbeat(
    license_file_path=runtime_lic,
    machine_id=TEST_MACHINE_ID,
    public_key_pem=PUBLIC_KEY_PEM,
    on_fail=on_runtime_fail,
)

# Start heartbeat with 3-second interval (short for testing)
hb6.start(interval_seconds=3)
print("  Heartbeat started (3s interval). Waiting 4 seconds...")
import time
time.sleep(4)

# Now tamper with the file
print("  Tampering with license file...")
create_tampered_license_file(runtime_lic, TEST_MACHINE_ID)

# Wait for the next heartbeat cycle
print("  Waiting for heartbeat to detect tamper...")
time.sleep(4)
hb6.stop()

ok = heartbeat_triggered["failed"]
test("Periodic heartbeat detects runtime tamper", ok, heartbeat_triggered.get("reason", "callback not triggered"))


# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

import shutil
shutil.rmtree(tmpdir, ignore_errors=True)

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

print("=" * 60)
passed = sum(1 for ok, _ in results if ok)
total = len(results)
print(f"RESULTS: {passed}/{total} tests passed")
print("=" * 60)

if passed == total:
    print("All tests PASSED! FR-06 heartbeat module is working correctly.")
else:
    print("Some tests FAILED. Check the output above for details.")
    sys.exit(1)
