import os
import sys
import json
import base64
import platform
import hashlib
import uuid
import time
import threading
import argparse
import re
import glob
import zipfile
from tkinter import filedialog, messagebox
from io import BytesIO

try:
    import customtkinter as ctk
    import requests
    import qrcode
    from PIL import Image
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives import serialization
    from cryptography.exceptions import InvalidSignature
except ImportError as e:
    print(f"Import Error: {e}")
    print("Please run: pip install customtkinter requests cryptography qrcode pillow")
    sys.exit(1)

# Configure the modern appearance
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

# Embedded RSA Public Key (Matches backend application.properties)
PUBLIC_KEY_B64 = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqJaprWPFFYPQUMLih3c+Fqz/FHQ5VD9wBHsQzSq42dVTdkA/Di6oWz4cOt8bLK6KrfneVwbRx7wXozHTEwt1SHVC7EeyIV+qPxudsceX+fGLbQk1jF8K/6YPxXogB0Z5yjPFygHqrRKCKvJk+3TBrk8h7/2h+AsitGnTnkfgaSFaY8NlWUrZMOXDB/H6CdKwAUJO8P2iwWTWslAhwLarzxWMYSCGN/QHhzn7OQHw2YgSagHYjYGTb6WWF/bGDMhORfBRf9aeF9KD2H2cEgCajFe2RwBNPsQNg7l8WW+CFHbZhhOimaWc3b7xCjpF/kBWgY9a2RHTLSSDIEONcUMX6wIDAQAB"

API_BASE_URL = os.getenv("LOCKSTRATA_API_URL", "http://localhost:8080/api")

# Optional package/build-time constant (None by default - requires configuration)
BUILD_PRODUCT_ID = None
BUILD_PRODUCT_NAME = None

# ============================================================================
# FR-01: Build-time code integrity verification
#
# At build time, build_integrity_manifest.py records SHA-256 hashes of the
# source files into integrity_manifest.json (bundled by the .spec file).
# At startup we re-hash the frozen bytecode and compare against the manifest.
# If any hash differs the app refuses to launch.
# ============================================================================

def _get_resource_path(filename):
    """Return the path to a bundled resource (works both frozen and unfrozen)."""
    if getattr(sys, '_MEIPASS', None):
        return os.path.join(sys._MEIPASS, filename)
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)


def _sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def verify_integrity():
    """
    FR-01: Verify that source / bytecode files match the build-time manifest.
    Returns (ok: bool, detail: str).
    """
    manifest_path = _get_resource_path("integrity_manifest.json")
    if not os.path.exists(manifest_path):
        # Manifest absent — running from raw source, skip check
        return True, "No manifest (development mode)"

    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    except Exception as e:
        return False, f"Failed to load integrity manifest: {e}"

    for filename, expected_hash in manifest.items():
        # In a frozen exe the .py files become compiled .pyc bytecode inside the archive
        candidate_paths = [
            _get_resource_path(filename),
            os.path.join(os.path.dirname(sys.executable), filename) if getattr(sys, 'frozen', False) else None,
            os.path.join(os.path.dirname(os.path.abspath(__file__)), filename),
        ]
        found = False
        for path in candidate_paths:
            if path and os.path.exists(path):
                actual = _sha256_file(path)
                if actual != expected_hash:
                    return False, (
                        f"Integrity check FAILED for '{filename}'.\n"
                        f"Expected: {expected_hash}\n"
                        f"Got:      {actual}\n\n"
                        "The application binary may have been tampered with."
                    )
                found = True
                break
        if not found:
            # File not found in frozen bundle — skip (bytecode is inside the PYZ archive)
            pass

    return True, "Integrity verified"

def mask_license_key(key):
    """Safely mask license key for display."""
    if not key:
        return "N/A"
    clean = str(key).strip()
    if len(clean) <= 8:
        return "****"
    return f"{clean[:4]}-****-****-{clean[-4:]}"

class DesktopApp(ctk.CTk):
    def __init__(self, cli_product_id=None, cli_config_path=None):
        super().__init__()

        # 1. Resolve configured Product ID
        self.resolve_product_configuration(cli_product_id, cli_config_path)

        # 2. Setup paths and identity
        app_subfolder = f"LockStrata_{self.product_id}" if self.product_id else "LockStrata_Unconfigured"
        self.app_data_dir = os.path.join(os.getenv('APPDATA', os.path.expanduser('~')), app_subfolder)
        os.makedirs(self.app_data_dir, exist_ok=True)
        self.license_file_path = os.path.join(self.app_data_dir, 'license.lic')
        self.identity_file_path = os.path.join(self.app_data_dir, 'identity.json')

        self.load_or_create_identity()

        # Window settings
        title_prod = f"{self.product_name} ({self.product_id})" if self.product_id else "Unconfigured Software"
        self.title(f"LockStrata Client — {title_prod}")
        self.geometry("820x640")
        self.resizable(False, False)

        # 3. Parse Public Key
        pub_der = base64.b64decode(PUBLIC_KEY_B64)
        self.public_key = serialization.load_der_public_key(pub_der)

        # 4. UI Setup
        self.setup_ui()

        # 5. Check existing license if configured
        if self.product_id:
            self.check_local_license()
        else:
            self.show_unconfigured_banner()

    def resolve_product_configuration(self, cli_product_id=None, cli_config_path=None):
        """
        Resolves Product ID in strict order:
        1. CLI argument
        2. Environment variable: LOCKSTRATA_PRODUCT_ID
        3. Config file (custom path or product_config.json)
        4. Build-time constant
        If none found, sets None (never silently falls back).
        """
        self.product_id = None
        self.product_name = None

        # 1. CLI argument
        if cli_product_id:
            self.product_id = cli_product_id.strip()
            self.product_name = f"Product {self.product_id}"

        # 2. Environment variable
        if not self.product_id:
            env_pid = os.getenv("LOCKSTRATA_PRODUCT_ID")
            if env_pid and env_pid.strip():
                self.product_id = env_pid.strip()
                self.product_name = os.getenv("LOCKSTRATA_PRODUCT_NAME", f"Product {self.product_id}")

        # 3. Product config file
        if not self.product_id:
            candidates = []
            if cli_config_path:
                candidates.append(cli_config_path)
            if getattr(sys, 'frozen', False):
                candidates.append(os.path.join(os.path.dirname(sys.executable), "product_config.json"))
            candidates.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "product_config.json"))
            candidates.append(os.path.join(os.getcwd(), "product_config.json"))
            if hasattr(sys, '_MEIPASS'):
                candidates.append(os.path.join(sys._MEIPASS, "product_config.json"))

            # If user ran .exe directly from inside Windows zip preview without extracting:
            exe_dir = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.dirname(os.path.abspath(__file__))
            folder_name = os.path.basename(exe_dir)
            match = re.search(r'_(.+?\.zip)\.', folder_name, re.IGNORECASE)
            if match:
                zip_name = match.group(1)
                temp_parent = os.path.dirname(exe_dir)
                for sibling in glob.glob(os.path.join(temp_parent, f"*_{zip_name}.*")):
                    candidates.append(os.path.join(sibling, "product_config.json"))
                
                # Check user's Downloads directory for the zip file itself
                downloads_zip = os.path.join(os.path.expanduser('~'), 'Downloads', zip_name)
                if os.path.exists(downloads_zip):
                    try:
                        with zipfile.ZipFile(downloads_zip, 'r') as z:
                            if 'product_config.json' in z.namelist():
                                zip_cfg = json.loads(z.read('product_config.json').decode('utf-8'))
                                cfg_pid = zip_cfg.get("productId")
                                if cfg_pid and str(cfg_pid).strip():
                                    self.product_id = str(cfg_pid).strip()
                                    self.product_name = zip_cfg.get("productName", f"Product {self.product_id}")
                    except Exception as e:
                        print(f"Warning: Failed reading zip in Downloads: {e}")

            if not self.product_id:
                for config_file in candidates:
                    if os.path.exists(config_file):
                        try:
                            with open(config_file, "r", encoding="utf-8") as f:
                                data = json.load(f)
                                cfg_pid = data.get("productId")
                                if cfg_pid and str(cfg_pid).strip():
                                    self.product_id = str(cfg_pid).strip()
                                    self.product_name = data.get("productName", f"Product {self.product_id}")
                                    break
                        except Exception as e:
                            print(f"Warning: Failed to read {config_file}: {e}")

        # 4. Build-time constant
        if not self.product_id and BUILD_PRODUCT_ID:
            self.product_id = BUILD_PRODUCT_ID
            self.product_name = BUILD_PRODUCT_NAME or f"Product {self.product_id}"

    def show_unconfigured_banner(self):
        messagebox.showerror(
            "Configuration Error",
            "This software is not configured with a valid LockStrata Product ID."
        )

    def load_or_create_identity(self):
        # FR-02: Multi-attribute hardware fingerprint
        self.os_name = platform.system()
        self.device_name = platform.node()
        self.mac_address    = self._get_mac_address()
        self.cpu_id         = self._get_cpu_id()
        self.motherboard_id = self._get_motherboard_id()
        self.vm_hint        = self._get_vm_hint()
        self.is_vm          = self._detect_vm()

        # Primary machineId: SHA256 of hostname + OS + arch (stable across reboots)
        system_info = platform.node() + platform.system() + platform.machine()
        hashed_id = hashlib.sha256(system_info.encode()).hexdigest()[:15].upper()
        self.machine_id = f"HW-{hashed_id}"

        # Load or create persistent installationId (UUID written once at first install)
        if os.path.exists(self.identity_file_path):
            try:
                with open(self.identity_file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.installation_id = data.get("installationId")
                    # Back-fill any missing identity fields
                    if not self.installation_id:
                        self.installation_id = str(uuid.uuid4())
                        data["installationId"] = self.installation_id
                        with open(self.identity_file_path, 'w', encoding='utf-8') as fw:
                            json.dump(data, fw)
            except Exception:
                self.installation_id = str(uuid.uuid4())
        else:
            self.installation_id = str(uuid.uuid4())
            with open(self.identity_file_path, 'w', encoding='utf-8') as f:
                json.dump({
                    "installationId": self.installation_id,
                    "machineId":      self.machine_id,
                    "macAddress":     self.mac_address,
                    "cpuId":          self.cpu_id,
                }, f)

    # -------------------------------------------------------------------------
    # FR-02: Hardware attribute collectors
    # -------------------------------------------------------------------------

    def _get_mac_address(self):
        """Return the primary MAC address as XX:XX:XX:XX:XX:XX."""
        try:
            import uuid as _uuid
            mac_int = _uuid.getnode()
            mac = ':'.join(('%012X' % mac_int)[i:i+2] for i in range(0, 12, 2))
            return mac
        except Exception:
            return None

    def _get_cpu_id(self):
        """Return a CPU identifier string (brand string or model name)."""
        try:
            if platform.system() == "Windows":
                import winreg
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                    r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
                name, _ = winreg.QueryValueEx(key, "ProcessorNameString")
                winreg.CloseKey(key)
                return name.strip()
            elif platform.system() == "Linux":
                with open("/proc/cpuinfo") as f:
                    for line in f:
                        if "model name" in line:
                            return line.split(":")[1].strip()
            elif platform.system() == "Darwin":
                import subprocess
                result = subprocess.run(["sysctl", "-n", "machdep.cpu.brand_string"],
                                        capture_output=True, text=True)
                return result.stdout.strip()
        except Exception:
            pass
        return platform.processor() or None

    def _get_motherboard_id(self):
        """Return motherboard serial or UUID (Windows only via WMI; Linux via DMI)."""
        try:
            if platform.system() == "Windows":
                import subprocess
                result = subprocess.run(
                    ["wmic", "baseboard", "get", "SerialNumber"],
                    capture_output=True, text=True, timeout=5
                )
                lines = [l.strip() for l in result.stdout.splitlines() if l.strip() and l.strip() != "SerialNumber"]
                return lines[0] if lines else None
            elif platform.system() == "Linux":
                try:
                    with open("/sys/class/dmi/id/board_serial") as f:
                        return f.read().strip()
                except Exception:
                    pass
        except Exception:
            pass
        return None

    def _get_vm_hint(self):
        """Return a hint string if a known hypervisor is detected."""
        try:
            if platform.system() == "Windows":
                import subprocess
                result = subprocess.run(
                    ["wmic", "computersystem", "get", "Manufacturer,Model"],
                    capture_output=True, text=True, timeout=5
                )
                output = result.stdout.lower()
                for vm in ["vmware", "virtualbox", "innotek", "microsoft corporation", "qemu", "xen", "parallels"]:
                    if vm in output:
                        return vm
            elif platform.system() == "Linux":
                try:
                    with open("/sys/class/dmi/id/sys_vendor") as f:
                        vendor = f.read().lower()
                    for vm in ["vmware", "innotek", "qemu", "xen", "parallels"]:
                        if vm in vendor:
                            return vm
                except Exception:
                    pass
        except Exception:
            pass
        return None

    def _detect_vm(self):
        """FR-11: Return True if running inside a virtual machine."""
        hint = self._get_vm_hint()
        if hint:
            return True
        # Check MAC address OUI prefixes known to belong to hypervisors
        mac = self.mac_address or ""
        vm_mac_prefixes = ["00:0C:29", "00:50:56", "08:00:27", "52:54:00", "00:16:3E"]
        for prefix in vm_mac_prefixes:
            if mac.upper().startswith(prefix):
                return True
        return False

    # -------------------------------------------------------------------------
    # FR-06: Periodic license heartbeat — validates license every N minutes
    # -------------------------------------------------------------------------

    def start_heartbeat(self, interval_seconds=300):
        """Start a background daemon thread that re-validates the license periodically."""
        self._heartbeat_active = True
        self._heartbeat_thread = threading.Thread(
            target=self._heartbeat_loop,
            args=(interval_seconds,),
            daemon=True,
            name="LicenseHeartbeat"
        )
        self._heartbeat_thread.start()

    def stop_heartbeat(self):
        self._heartbeat_active = False

    def _heartbeat_loop(self, interval_seconds):
        while self._heartbeat_active:
            time.sleep(interval_seconds)
            if not self._heartbeat_active:
                break
            try:
                self._validate_license_heartbeat()
            except Exception as e:
                print(f"[Heartbeat] Validation error: {e}")

    def _validate_license_heartbeat(self):
        """FR-06: Re-validate the local license file. Kill app if invalid."""
        if not os.path.exists(self.license_file_path):
            self._heartbeat_fail("License file missing during runtime check.")
            return
        try:
            with open(self.license_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            payload_b64  = data.get("payload")
            signature_b64 = data.get("signature")
            if not payload_b64 or not signature_b64:
                self._heartbeat_fail("License file corrupted during runtime check.")
                return
            payload_json = base64.b64decode(payload_b64).decode('utf-8')
            if not self.verify_signature(payload_json, signature_b64):
                self._heartbeat_fail("License signature invalid during runtime check.")
                return
            payload_obj = json.loads(payload_json)
            if payload_obj.get("deviceFingerprint") != self.machine_id:
                self._heartbeat_fail("Hardware mismatch detected during runtime check.")
                return
            # Check expiry
            expiry = payload_obj.get("expiryDate")
            if expiry and expiry.upper() not in ("PERPETUAL", "NONE", "NULL", ""):
                import datetime
                expiry_date = datetime.date.fromisoformat(expiry[:10])
                if expiry_date < datetime.date.today():
                    self._heartbeat_fail("License expired during runtime.")
                    return
            print(f"[Heartbeat] License OK at {time.strftime('%H:%M:%S')}")
        except Exception as e:
            print(f"[Heartbeat] Exception: {e}")

    def _heartbeat_fail(self, reason):
        """Called when runtime license check fails — deletes license and closes app."""
        print(f"[Heartbeat] FAIL: {reason}")
        try:
            if os.path.exists(self.license_file_path):
                os.remove(self.license_file_path)
        except Exception:
            pass
        # Schedule UI update on main thread
        self.after(0, lambda: self._show_heartbeat_error(reason))

    def _show_heartbeat_error(self, reason):
        messagebox.showerror(
            "License Validation Failed",
            f"Runtime license check failed:\n{reason}\n\nThe application will now close."
        )
        self.quit()
        self.destroy()

    def verify_signature(self, payload_json, signature_b64):
        try:
            signature_bytes = base64.b64decode(signature_b64)
            self.public_key.verify(
                signature_bytes,
                payload_json.encode('utf-8'),
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            return True
        except InvalidSignature:
            return False
        except Exception as e:
            print(f"Verification error: {e}")
            return False

    def check_local_license(self):
        if not os.path.exists(self.license_file_path):
            return

        try:
            with open(self.license_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            payload_obj = None

            # FR-03: Handle v2 encrypted container first
            if data.get("formatVersion") == "2" and data.get("encryptedContainer"):
                payload_obj = self._decrypt_and_verify_container(data["encryptedContainer"])
            else:
                # Legacy v1: base64 payload + RSA signature
                payload_b64   = data.get("payload")
                signature_b64 = data.get("signature")
                if not payload_b64 or not signature_b64:
                    raise ValueError("Invalid license format")
                payload_json = base64.b64decode(payload_b64).decode('utf-8')
                if not self.verify_signature(payload_json, signature_b64):
                    raise ValueError("Digital signature verification failed! License tampered.")
                payload_obj = json.loads(payload_json)

            if payload_obj.get("deviceFingerprint") != self.machine_id:
                raise ValueError("Hardware mismatch! License bound to a different machine.")

            lic_pid = str(payload_obj.get("productId", "")).strip()
            if self.product_id and lic_pid and lic_pid.upper() != self.product_id.upper():
                raise ValueError(f"Product mismatch! License is for product '{lic_pid}', but this software is '{self.product_id}'.")

            self.show_activated_screen(payload_obj)

        except Exception as e:
            messagebox.showerror("License Error", f"Local license invalid:\n{str(e)}")
            try:
                os.remove(self.license_file_path)
            except Exception:
                pass

    # -------------------------------------------------------------------------
    # FR-03: Client-side v2 container handling
    #
    # The server produces:
    #   { v, ct, encKey (RSA-OAEP), iv, ciphertext (AES-256-GCM), sig }
    #
    # The client cannot decrypt RSA-OAEP with only the public key. Instead,
    # for DEVICE_BOUND containers the server derives the AES key from the
    # device fingerprint (machine_id) using PBKDF2 so only that device can
    # open the container. encKey in this mode stores the PBKDF2 salt.
    # For ONLINE/NETWORK_SERVED containers the full encryptedContainer field
    # is not written to disk — only the signed plaintext is persisted.
    # -------------------------------------------------------------------------

    def _decrypt_and_verify_container(self, container_json):
        """FR-03: Decrypt a v2 encrypted container using fingerprint-derived key."""
        try:
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM
            from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
            from cryptography.hazmat.primitives import hashes as _hashes
            from cryptography.hazmat.backends import default_backend

            c = json.loads(container_json)
            iv         = base64.b64decode(c["iv"])
            ciphertext = base64.b64decode(c["ciphertext"])
            sig_bytes  = base64.b64decode(c["sig"])
            salt       = base64.b64decode(c["encKey"])  # PBKDF2 salt in DEVICE_BOUND mode

            # 1. Verify RSA signature over (iv || ciphertext)
            from cryptography.hazmat.primitives.asymmetric import padding as _padding
            sig_input = iv + ciphertext
            try:
                self.public_key.verify(sig_bytes, sig_input, _padding.PKCS1v15(), _hashes.SHA256())
            except Exception:
                raise ValueError("Container signature verification failed — payload tampered.")

            # 2. Derive AES-256 key from machine fingerprint + PBKDF2 salt
            kdf = PBKDF2HMAC(
                algorithm=_hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=200_000,
                backend=default_backend()
            )
            aes_key = kdf.derive(self.machine_id.encode('utf-8'))

            # 3. AES-256-GCM decrypt
            aesgcm = AESGCM(aes_key)
            plaintext = aesgcm.decrypt(iv, ciphertext, None)
            return json.loads(plaintext.decode('utf-8'))

        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Failed to open encrypted license container: {e}")

    def save_license(self, response_json):
        try:
            with open(self.license_file_path, 'w', encoding='utf-8') as f:
                json.dump(response_json, f)
            self.check_local_license()
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save license: {e}")

    def show_activated_screen(self, payload):
        # FR-06: Start background periodic license validation
        self.start_heartbeat(interval_seconds=300)  # re-check every 5 minutes

        for widget in self.winfo_children():
            widget.destroy()
            
        frame = ctk.CTkFrame(self, corner_radius=16)
        frame.pack(expand=True, fill="both", padx=40, pady=40)
        
        ctk.CTkLabel(frame, text="✅ Software Activated", font=ctk.CTkFont(size=28, weight="bold"), text_color="#34d399").pack(pady=(35, 15))
        
        # Product identity info card
        card = ctk.CTkFrame(frame, fg_color=("#e2e8f0", "#1e293b"), corner_radius=12)
        card.pack(fill="x", padx=40, pady=10)

        ctk.CTkLabel(card, text=f"📦 {self.product_name or payload.get('productId')}", font=ctk.CTkFont(size=18, weight="bold"), text_color="#38bdf8").pack(pady=14)

        info_frame = ctk.CTkFrame(frame, fg_color="transparent")
        info_frame.pack(pady=15)

        ctk.CTkLabel(info_frame, text=f"Device Fingerprint: {self.machine_id}", font=ctk.CTkFont(size=13, family="Consolas"), text_color="#94a3b8").pack(pady=4)
        ctk.CTkLabel(info_frame, text=f"Status: {payload.get('activationStatus', 'ACTIVE')}", text_color="#34d399", font=ctk.CTkFont(size=14, weight="bold")).pack(pady=4)
        exp_raw = payload.get('expiryDate')
        if not exp_raw or str(exp_raw).upper() in ['PERPETUAL', 'NONE', 'NULL']:
            exp_text = "Perpetual (Never Expires)"
        else:
            exp_text = str(exp_raw)

        ctk.CTkLabel(info_frame, text=f"Expires: {exp_text}", font=ctk.CTkFont(size=13)).pack(pady=4)

        # Deactivate / Reset option
        ctk.CTkButton(
            frame,
            text="Deactivate / Remove License",
            fg_color="#ef4444",
            hover_color="#dc2626",
            command=self.deactivate_license,
            width=220,
            height=36
        ).pack(pady=20)

    def deactivate_license(self):
        if messagebox.askyesno("Confirm Deactivation", "Are you sure you want to deactivate and remove this license from this machine?"):
            if os.path.exists(self.license_file_path):
                try:
                    os.remove(self.license_file_path)
                except Exception as e:
                    messagebox.showerror("Error", f"Failed to remove license file: {e}")
                    return
            messagebox.showinfo("Deactivated", "License removed. Restarting activation interface.")
            for widget in self.winfo_children():
                widget.destroy()
            self.setup_ui()

    def setup_ui(self):
        # Header banner showing automatically detected product
        header = ctk.CTkFrame(self, fg_color=("#e2e8f0", "#111827"), height=60, corner_radius=0)
        header.pack(fill="x", padx=0, pady=(0, 10))

        if self.product_id:
            ctk.CTkLabel(
                header,
                text=f"📦 {self.product_name}",
                font=ctk.CTkFont(size=17, weight="bold"),
                text_color="#38bdf8"
            ).pack(side="left", padx=20, pady=10)
        else:
            ctk.CTkLabel(
                header,
                text="⚠️ This software is not configured with a valid LockStrata Product ID.",
                font=ctk.CTkFont(size=14, weight="bold"),
                text_color="#f87171"
            ).pack(side="left", padx=20, pady=10)

        ctk.CTkLabel(
            header,
            text=f"Device: {self.machine_id}",
            font=ctk.CTkFont(size=12, family="Consolas"),
            text_color="#94a3b8"
        ).pack(side="right", padx=20, pady=10)

        # Tab View
        self.tabview = ctk.CTkTabview(self, width=760, height=530, command=self.on_tab_changed)
        self.tabview.pack(padx=20, pady=10)

        self.tabview.add("Auto Activation")
        self.tabview.add("QR Activation")
        self.tabview.add("Offline Activation")

        self.setup_auto_tab()
        self.setup_qr_tab()
        self.setup_offline_tab()

    def on_tab_changed(self):
        # When switching to QR tab, trigger QR generation immediately if configured
        current_tab = self.tabview.get()
        if current_tab == "QR Activation" and self.product_id and not hasattr(self, '_qr_requested'):
            self.do_qr_request()

    def setup_auto_tab(self):
        tab = self.tabview.tab("Auto Activation")
        
        ctk.CTkLabel(tab, text="Online Auto Activation", font=ctk.CTkFont(size=22, weight="bold")).pack(pady=(20, 5))
        ctk.CTkLabel(tab, text="Log in with your LockStrata account to activate this software instantly.", text_color="gray").pack(pady=(0, 20))

        if not self.product_id:
            ctk.CTkLabel(tab, text="This software is not configured with a valid LockStrata Product ID.", font=ctk.CTkFont(size=14, weight="bold"), text_color="#f87171").pack(pady=30)
            return

        self.email_entry = ctk.CTkEntry(tab, placeholder_text="Account Email", width=340, height=40)
        self.email_entry.pack(pady=6)
        self.password_entry = ctk.CTkEntry(tab, placeholder_text="Password", show="*", width=340, height=40)
        self.password_entry.pack(pady=6)

        # Dynamic 2FA Container (Only shown if user account has 2FA enabled)
        self.two_factor_visible = False
        self.two_factor_container = ctk.CTkFrame(tab, fg_color="transparent")
        ctk.CTkLabel(self.two_factor_container, text="🔑 2FA Authenticator Code", font=ctk.CTkFont(size=12, weight="bold"), text_color="#38bdf8").pack(anchor="w", pady=(0, 2))
        self.two_factor_entry = ctk.CTkEntry(self.two_factor_container, placeholder_text="Enter 6-digit authenticator code", width=340, height=40)
        self.two_factor_entry.pack()

        self.auto_btn = ctk.CTkButton(
            tab,
            text="Activate Software",
            width=340,
            height=42,
            fg_color="#0284c7",
            hover_color="#0369a1",
            command=self.do_auto_activation
        )
        self.auto_btn.pack(pady=15)
        self.auto_status = ctk.CTkLabel(tab, text="")
        self.auto_status.pack()

    def show_2fa_input(self):
        if not self.two_factor_visible:
            self.auto_btn.pack_forget()
            self.auto_status.pack_forget()
            self.two_factor_container.pack(pady=8)
            self.auto_btn.pack(pady=15)
            self.auto_status.pack()
            self.two_factor_visible = True
            self.two_factor_entry.focus()

    def do_auto_activation(self):
        if not self.product_id:
            messagebox.showerror("Error", "This software is not properly configured with a LockStrata Product ID.")
            return

        email = self.email_entry.get().strip()
        password = self.password_entry.get().strip()
        two_fa = self.two_factor_entry.get().strip() if self.two_factor_visible else ""
        
        if not email or not password:
            self.auto_status.configure(text="Please enter Email and Password.", text_color="#f87171")
            return

        self.auto_btn.configure(state="disabled", text="Authenticating with LockStrata...")
        self.update()

        try:
            # Login via unified auth endpoint
            login_payload = {"email": email, "password": password}
            if two_fa:
                login_payload["twoFactorCode"] = two_fa

            login_res = requests.post(f"{API_BASE_URL}/auth/login", json=login_payload)
            if login_res.status_code != 200:
                try:
                    err = login_res.json().get("message") or login_res.json().get("error") or "Invalid credentials"
                except Exception:
                    err = f"Login failed ({login_res.status_code})"
                raise Exception(err)

            login_data = login_res.json()

            if login_data.get("mustChangePassword"):
                raise Exception("Temporary password in use. Please log in to the LockStrata portal to change your password first.")

            token = login_data.get("token")
            if not token:
                if login_data.get("requires2FA"):
                    self.show_2fa_input()
                    self.auto_btn.configure(state="normal", text="Confirm 2FA & Activate", fg_color="#10b981", hover_color="#059669")
                    self.auto_status.configure(
                        text="Two-Factor Authentication is enabled on this account.\nEnter your 6-digit authenticator code above.",
                        text_color="#38bdf8"
                    )
                    return
                raise Exception(login_data.get("message", "Login succeeded but no token returned."))

            self.auto_btn.configure(text="Validating license & activating...")
            self.update()

            # Automatic Product ID injection
            act_res = requests.post(
                f"{API_BASE_URL}/activations/auto",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "productId":      self.product_id,
                    "machineId":      self.machine_id,
                    "deviceName":     self.device_name,
                    "os":             self.os_name,
                    "installationId": self.installation_id,
                    # FR-02: Additional hardware fingerprint attributes
                    "macAddress":     getattr(self, 'mac_address', None),
                    "cpuId":          getattr(self, 'cpu_id', None),
                    "motherboardId":  getattr(self, 'motherboard_id', None),
                    # FR-11: VM detection hint
                    "vmHint":         getattr(self, 'vm_hint', None),
                    "isVm":           getattr(self, 'is_vm', False),
                }
            )

            if act_res.status_code not in (200, 201):
                try:
                    err = act_res.json().get("message") or act_res.json().get("error") or "Activation failed"
                except Exception:
                    err = f"Activation failed ({act_res.status_code})"
                raise Exception(err)

            self.save_license(act_res.json())

        except Exception as e:
            self.auto_status.configure(text=f"{str(e)}", text_color="#f87171")
            self.auto_btn.configure(state="normal", text="Activate Software")

    def setup_qr_tab(self):
        self.qr_tab = self.tabview.tab("QR Activation")
        
        ctk.CTkLabel(self.qr_tab, text="Smartphone QR Activation", font=ctk.CTkFont(size=22, weight="bold")).pack(pady=(15, 5))
        ctk.CTkLabel(self.qr_tab, text="Scan with your phone or any authorized device to approve activation.", text_color="gray").pack(pady=(0, 10))

        if not self.product_id:
            ctk.CTkLabel(self.qr_tab, text="This software is not configured with a valid LockStrata Product ID.", font=ctk.CTkFont(size=14, weight="bold"), text_color="#f87171").pack(pady=30)
            return

        self.qr_image_label = ctk.CTkLabel(self.qr_tab, text="")
        self.qr_image_label.pack(pady=5)
        
        self.qr_status = ctk.CTkLabel(self.qr_tab, text="Preparing QR activation...", text_color="gray")
        self.qr_status.pack(pady=4)

        self.qr_gen_btn = ctk.CTkButton(
            self.qr_tab,
            text="🔄 Refresh QR Code",
            width=220,
            height=36,
            fg_color="#334155",
            hover_color="#475569",
            command=self.do_qr_request
        )
        self.qr_gen_btn.pack(pady=8)

        self.polling = False

    def do_qr_request(self):
        if not self.product_id:
            return

        self._qr_requested = True
        self.qr_gen_btn.configure(state="disabled", text="Requesting QR...")
        self.qr_status.configure(text="Connecting to LockStrata...", text_color="gray")
        self.update()

        try:
            res = requests.post(
                f"{API_BASE_URL}/activations/qr/request",
                json={
                    "productId": self.product_id,
                    "machineId": self.machine_id,
                    "installationId": self.installation_id,
                    "deviceName": self.device_name,
                    "os": self.os_name
                }
            )
            if res.status_code != 201:
                err_msg = res.json().get("message", "Failed to generate QR")
                raise Exception(err_msg)

            data = res.json()
            approval_url = data.get('approvalUrl', f"http://localhost:3000/customer/activate/qr/{data['publicApprovalToken']}")
            
            # Generate QR Image (URL contains approval token only, NO license key)
            qr = qrcode.QRCode(box_size=4, border=2)
            qr.add_data(approval_url)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white").get_image()
            
            # Convert to CTkImage
            ctk_img = ctk.CTkImage(light_image=img, dark_image=img, size=(180, 180))
            self.qr_image_label.configure(image=ctk_img, text="")
            
            self.qr_status.configure(text="Scan with your phone to authorize this device.", text_color="#38bdf8")
            self.qr_gen_btn.configure(text="🔄 Refresh QR Code", state="normal")

            # Start background polling
            self.polling = True
            threading.Thread(target=self.poll_qr_status, args=(data['requestId'], data['appPollingSecret']), daemon=True).start()

        except Exception as e:
            self.qr_status.configure(text=f"Error: {str(e)}", text_color="#f87171")
            self.qr_gen_btn.configure(state="normal", text="🔄 Try Again")

    def poll_qr_status(self, request_id, polling_secret):
        while self.polling:
            try:
                res = requests.get(
                    f"{API_BASE_URL}/activations/qr/poll/{request_id}",
                    headers={"X-Polling-Secret": polling_secret}
                )
                if res.status_code == 200:
                    data = res.json()
                    status = data.get("status")
                    if status == "APPROVED":
                        self.polling = False
                        self.after(0, lambda: self.save_license(data.get("activationResponse")))
                        break
                    elif status == "EXPIRED":
                        self.polling = False
                        self.after(0, lambda: self.qr_status.configure(text="QR Code Expired. Click Refresh.", text_color="#f87171"))
                        break
            except Exception:
                pass
            time.sleep(3)

    def setup_offline_tab(self):
        tab = self.tabview.tab("Offline Activation")

        ctk.CTkLabel(tab, text="Offline AirGap Activation", font=ctk.CTkFont(size=22, weight="bold")).pack(pady=(20, 5))
        ctk.CTkLabel(tab, text="Generate an activation request file, upload to LockStrata portal, then import license.", text_color="gray").pack(pady=(0, 20))

        if not self.product_id:
            ctk.CTkLabel(tab, text="This software is not configured with a valid LockStrata Product ID.", font=ctk.CTkFont(size=14, weight="bold"), text_color="#f87171").pack(pady=30)
            return

        ctk.CTkButton(
            tab,
            text="1. Generate request.json",
            width=320,
            height=42,
            fg_color="#334155",
            hover_color="#475569",
            command=self.do_generate_request
        ).pack(pady=10)

        ctk.CTkButton(
            tab,
            text="2. Import license.lic",
            width=320,
            height=42,
            fg_color="#059669",
            hover_color="#047857",
            command=self.do_import_license
        ).pack(pady=10)

        self.off_status = ctk.CTkLabel(tab, text="")
        self.off_status.pack(pady=15)

    def do_generate_request(self):
        if not self.product_id:
            messagebox.showerror("Error", "This software is not properly configured with a LockStrata Product ID.")
            return

        req_data = {
            "productId":        self.product_id,
            "machineId":        self.machine_id,
            "installationId":   self.installation_id,
            "deviceName":       self.device_name,
            "os":               self.os_name,
            "requestId":        str(uuid.uuid4()),
            "requestExpiration": int(time.time() * 1000) + 86400000,  # 24h
            # FR-02: Additional hardware attributes
            "macAddress":       getattr(self, 'mac_address', None),
            "cpuId":            getattr(self, 'cpu_id', None),
            "motherboardId":    getattr(self, 'motherboard_id', None),
            # FR-11: VM hint
            "vmHint":           getattr(self, 'vm_hint', None),
            "isVm":             getattr(self, 'is_vm', False),
        }

        filepath = filedialog.asksaveasfilename(defaultextension=".json", initialfile="request.json", title="Save Request File")
        if filepath:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(req_data, f, indent=2)
            self.off_status.configure(text=f"Saved {os.path.basename(filepath)}. Upload this through your LockStrata portal.", text_color="#38bdf8")

    def do_import_license(self):
        filepath = filedialog.askopenfilename(title="Select license.lic", filetypes=(("License Files", "*.lic"), ("All Files", "*.*")))
        if not filepath:
            return
        
        try:
            with open(filepath, "r", encoding='utf-8') as f:
                data = json.load(f)
            self.save_license(data)
        except Exception as e:
            self.off_status.configure(text=f"Import Error: {str(e)}", text_color="#f87171")

def parse_args():
    parser = argparse.ArgumentParser(description="LockStrata Desktop Client")
    parser.add_argument("--product", "-p", dest="product_id", help="Product SKU or ID (e.g. NX-ACC-001)")
    parser.add_argument("--config", "-c", dest="config_path", help="Path to custom product_config.json")
    return parser.parse_args()

if __name__ == "__main__":
    # FR-01: Code integrity check before any UI or license logic runs
    ok, detail = verify_integrity()
    if not ok:
        import tkinter as _tk
        _root = _tk.Tk()
        _root.withdraw()
        import tkinter.messagebox as _mb
        _mb.showerror("Integrity Violation", detail)
        _root.destroy()
        sys.exit(1)

    args = parse_args()
    app = DesktopApp(cli_product_id=args.product_id, cli_config_path=args.config_path)
    app.mainloop()
