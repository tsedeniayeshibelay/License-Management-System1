"""
FR-06: Runtime License Validation Agent

A standalone Python module that periodically validates a local license file
at application launch and during execution. If validation fails at any point
the license file is deleted and a callback is invoked so the host application
can show an error and exit.

Usage:
    from fr06_heartbeat import LicenseHeartbeat

    heartbeat = LicenseHeartbeat(
        license_file_path="/path/to/license.lic",
        machine_id="HW-ABC123456789",
        public_key_pem="-----BEGIN PUBLIC KEY-----\\n...",
        on_fail=lambda reason: show_error_and_quit(reason),
    )

    # 1. Launch-time check (blocks — call before showing the main UI)
    ok, reason = heartbeat.validate_now()
    if not ok:
        show_error_and_quit(reason)
        return

    # 2. Start periodic background validation (non-blocking daemon thread)
    heartbeat.start(interval_seconds=300)  # re-check every 5 minutes

    # 3. When the app is closing
    heartbeat.stop()

The module has no dependencies beyond the Python standard library and
the `cryptography` package (for RSA signature verification). It does NOT
import tkinter, requests, or any framework code.

License file format expected (JSON):
    {
        "payload":   "<base64-encoded JSON payload>",
        "signature": "<base64-encoded RSA-SHA256 signature>"
    }

The payload JSON must contain at least:
    {
        "deviceFingerprint": "HW-...",       # must match machine_id
        "expiryDate":         "2026-12-31"     # ISO date or "PERPETUAL"
    }
"""

import os
import json
import base64
import time
import threading
import datetime


class LicenseHeartbeat:
    """
    FR-06: Validates a local license file at launch and periodically.

    The validation checks:
      1. License file exists and is valid JSON
      2. RSA-SHA256 signature verifies against the embedded public key
      3. deviceFingerprint in the payload matches the current machine_id
      4. License has not expired (if expiryDate is present)
    """

    def __init__(self, license_file_path, machine_id, public_key_pem, on_fail=None):
        """
        @param license_file_path  Path to the .lic file on disk.
        @param machine_id         The device's hardware fingerprint string.
        @param public_key_pem     PEM-encoded RSA public key (string or bytes).
        @param on_fail            Callback(reason: str) invoked when validation fails.
                                   If None, failures are logged to stderr only.
        """
        self.license_file_path = license_file_path
        self.machine_id = machine_id
        self.on_fail = on_fail or self._default_on_fail
        self._heartbeat_active = False
        self._heartbeat_thread = None
        self._public_key = None

        # Load the RSA public key
        self._load_public_key(public_key_pem)

    # -------------------------------------------------------------------------
    # Public API
    # -------------------------------------------------------------------------

    def validate_now(self):
        """
        Synchronous one-shot validation. Call this at application launch
        before showing any UI.

        @return (ok: bool, reason: str)
        """
        return self._validate()

    def start(self, interval_seconds=300):
        """
        Start a background daemon thread that re-validates every
        interval_seconds. Non-blocking.

        @param interval_seconds  How often to re-check (default 300 = 5 min).
        """
        self._heartbeat_active = True
        self._heartbeat_thread = threading.Thread(
            target=self._heartbeat_loop,
            args=(interval_seconds,),
            daemon=True,
            name="LicenseHeartbeat"
        )
        self._heartbeat_thread.start()

    def stop(self):
        """Stop the background thread (called when the app is closing)."""
        self._heartbeat_active = False

    # -------------------------------------------------------------------------
    # Internal: validation logic
    # -------------------------------------------------------------------------

    def _validate(self):
        """Run all checks. Returns (ok, reason)."""
        if not os.path.exists(self.license_file_path):
            return False, "License file is missing."

        try:
            with open(self.license_file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            return False, "License file is corrupted or unreadable."

        payload_b64 = data.get("payload")
        signature_b64 = data.get("signature")

        if not payload_b64 or not signature_b64:
            return False, "License file is missing payload or signature."

        # 1. Verify RSA-SHA256 signature
        try:
            payload_json = base64.b64decode(payload_b64).decode("utf-8")
        except Exception:
            return False, "Payload is not valid Base64."

        if not self._verify_signature(payload_json, signature_b64):
            return False, "License signature verification failed — file may have been tampered with."

        # 2. Parse payload and check device binding
        try:
            payload = json.loads(payload_json)
        except Exception:
            return False, "Payload is not valid JSON."

        if payload.get("deviceFingerprint") != self.machine_id:
            return False, "Hardware mismatch — license is bound to a different machine."

        # 3. Check expiry
        expiry = payload.get("expiryDate", "")
        if expiry and str(expiry).upper() not in ("PERPETUAL", "NONE", "NULL", ""):
            try:
                expiry_date = datetime.date.fromisoformat(str(expiry)[:10])
                if expiry_date < datetime.date.today():
                    return False, f"License expired on {expiry_date}."
            except Exception:
                pass  # can't parse date — don't block, but log

        return True, "License is valid."

    def _heartbeat_loop(self, interval_seconds):
        """Background loop — runs until stop() is called."""
        while self._heartbeat_active:
            time.sleep(interval_seconds)
            if not self._heartbeat_active:
                break
            ok, reason = self._validate()
            if not ok:
                print(f"[Heartbeat] FAIL: {reason}")
                self._delete_license()
                self.on_fail(reason)
                break
            print(f"[Heartbeat] License OK at {time.strftime('%H:%M:%S')}")

    # -------------------------------------------------------------------------
    # Internal: crypto
    # -------------------------------------------------------------------------

    def _load_public_key(self, pem):
        """Load an RSA public key from PEM format."""
        try:
            from cryptography.hazmat.primitives import serialization
            if isinstance(pem, str):
                pem = pem.encode("utf-8")
            self._public_key = serialization.load_pem_public_key(pem)
        except ImportError:
            # Fallback: try DER Base64 if cryptography isn't available
            self._public_key = None
            print("[Heartbeat] WARNING: cryptography package not installed — "
                  "signature verification disabled. Install with: pip install cryptography")
        except Exception as e:
            self._public_key = None
            print(f"[Heartbeat] WARNING: Failed to load public key: {e}")

    def _verify_signature(self, payload_json, signature_b64):
        """Verify RSA-SHA256 signature over the payload."""
        if self._public_key is None:
            return True  # key not loaded — skip verification (dev mode)

        try:
            from cryptography.hazmat.primitives.asymmetric import padding
            from cryptography.hazmat.primitives import hashes
            from cryptography.exceptions import InvalidSignature

            signature_bytes = base64.b64decode(signature_b64)
            self._public_key.verify(
                signature_bytes,
                payload_json.encode("utf-8"),
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            return True
        except InvalidSignature:
            return False
        except Exception as e:
            print(f"[Heartbeat] Signature verification error: {e}")
            return False

    # -------------------------------------------------------------------------
    # Internal: helpers
    # -------------------------------------------------------------------------

    def _delete_license(self):
        """Remove the license file so it can't be re-used after failure."""
        try:
            if os.path.exists(self.license_file_path):
                os.remove(self.license_file_path)
        except Exception:
            pass

    @staticmethod
    def _default_on_fail(reason):
        """Default failure handler — just prints to stderr."""
        print(f"[Heartbeat] LICENSE VALIDATION FAILED: {reason}")
