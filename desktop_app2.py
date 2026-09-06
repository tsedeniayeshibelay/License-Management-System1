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
PUBLIC_KEY_B64 = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoGz+KjiawXeJDO2I1i+o99ePpAz/VZN2howGSfA/Z+RnNdO4fE4G9SZlVlwLBJjMbQd5X/A8wZUoLAN9qYyF/wqiEqe2qEw0URQOngsOmkIb1B3lLLuk+VCrfN9xTdWiK6H2hrv6udsDDNpeAAQ6D5ytn5nPfTl2NbDIsSJbTduDGIhLEEibxY3smOJ/shWR1FlfndBpQRBWzEOkOm3nqcPBtJrUOA81pZi7uEZqC9KwJ01bmOXf5QPV7341dkeam7fejXjCppUWI2y5wI7GCJAZQ8cZrjDcf/GNA3q9sFRM8lLuiyXpdVsQj9Ryq8gsu+Rae6QLRaNt3hxQDewfHwIDAQAB"

API_BASE_URL = os.getenv("LOCKSTRATA_API_URL", "http://localhost:8080/api")

# Optional package/build-time constant (defaults to Nexora Inventory for LockStrataClient2)
BUILD_PRODUCT_ID = "NX-INV-002"
BUILD_PRODUCT_NAME = "Nexora Inventory"

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

        # 2. Setup paths and identity for Machine B simulation
        app_subfolder = f"LockStrata2_{self.product_id}" if self.product_id else "LockStrata2_Unconfigured"
        self.app_data_dir = os.path.join(os.getenv('APPDATA', os.path.expanduser('~')), app_subfolder)
        os.makedirs(self.app_data_dir, exist_ok=True)
        self.license_file_path = os.path.join(self.app_data_dir, 'license.lic')
        self.identity_file_path = os.path.join(self.app_data_dir, 'identity.json')

        self.load_or_create_identity()

        # Window settings
        title_prod = f"{self.product_name} ({self.product_id})" if self.product_id else "Unconfigured Software"
        self.title(f"LockStrata Client [Device B] — {title_prod}")
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
        self.product_id = None
        self.product_name = None

        if cli_product_id:
            self.product_id = cli_product_id.strip()
            self.product_name = f"Product {self.product_id}"

        if not self.product_id:
            env_pid = os.getenv("LOCKSTRATA_PRODUCT_ID")
            if env_pid and env_pid.strip():
                self.product_id = env_pid.strip()
                self.product_name = os.getenv("LOCKSTRATA_PRODUCT_NAME", f"Product {self.product_id}")

        # 3. Product config file (searches exe dir, script dir, cwd, and _MEIPASS)
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

        # 4. Build-time constant fallback
        if not self.product_id and BUILD_PRODUCT_ID:
            self.product_id = BUILD_PRODUCT_ID
            self.product_name = BUILD_PRODUCT_NAME or f"Product {self.product_id}"

    def show_unconfigured_banner(self):
        messagebox.showerror(
            "Configuration Error",
            "This software is not properly configured with a LockStrata Product ID.\n\n"
            "Please reinstall this software from your LockStrata portal or provide a valid product configuration."
        )

    def load_or_create_identity(self):
        # Stable machine fingerprint for Device B
        system_info = platform.node() + platform.system() + platform.machine() + "MACHINE_B_IDENTIFIER"
        hashed_id = hashlib.sha256(system_info.encode()).hexdigest()[:15].upper()
        self.machine_id = f"HW-{hashed_id}"
        self.os_name = platform.system()
        self.device_name = f"{platform.node()}-DeviceB"

        if os.path.exists(self.identity_file_path):
            try:
                with open(self.identity_file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.installation_id = data.get("installationId")
            except Exception:
                self.installation_id = str(uuid.uuid4())
        else:
            self.installation_id = str(uuid.uuid4())
            with open(self.identity_file_path, 'w', encoding='utf-8') as f:
                json.dump({"installationId": self.installation_id, "machineId": self.machine_id}, f)

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
            
            payload_b64 = data.get("payload")
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

    def save_license(self, response_json):
        try:
            with open(self.license_file_path, 'w', encoding='utf-8') as f:
                json.dump(response_json, f)
            self.check_local_license()
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save license: {e}")

    def show_activated_screen(self, payload):
        for widget in self.winfo_children():
            widget.destroy()
            
        frame = ctk.CTkFrame(self, corner_radius=16)
        frame.pack(expand=True, fill="both", padx=40, pady=40)
        
        ctk.CTkLabel(frame, text="✅ Software Activated", font=ctk.CTkFont(size=28, weight="bold"), text_color="#34d399").pack(pady=(35, 15))
        
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
                text="⚠️ This software is not properly configured with a LockStrata Product ID.",
                font=ctk.CTkFont(size=13, weight="bold"),
                text_color="#f87171"
            ).pack(side="left", padx=20, pady=10)

        ctk.CTkLabel(
            header,
            text=f"Device: {self.machine_id}",
            font=ctk.CTkFont(size=12, family="Consolas"),
            text_color="#94a3b8"
        ).pack(side="right", padx=20, pady=10)

        self.tabview = ctk.CTkTabview(self, width=760, height=530, command=self.on_tab_changed)
        self.tabview.pack(padx=20, pady=10)

        self.tabview.add("Auto Activation")
        self.tabview.add("QR Activation")
        self.tabview.add("Offline Activation")

        self.setup_auto_tab()
        self.setup_qr_tab()
        self.setup_offline_tab()

    def on_tab_changed(self):
        current_tab = self.tabview.get()
        if current_tab == "QR Activation" and self.product_id and not hasattr(self, '_qr_requested'):
            self.do_qr_request()

    def setup_auto_tab(self):
        tab = self.tabview.tab("Auto Activation")
        
        ctk.CTkLabel(tab, text="Online Auto Activation", font=ctk.CTkFont(size=22, weight="bold")).pack(pady=(20, 5))
        ctk.CTkLabel(tab, text="Log in with your LockStrata account to activate this software instantly.", text_color="gray").pack(pady=(0, 20))

        if not self.product_id:
            ctk.CTkLabel(tab, text="Activation unavailable: No Product ID configured for this application build.", text_color="#f87171").pack(pady=20)
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

            act_res = requests.post(
                f"{API_BASE_URL}/activations/auto",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "productId": self.product_id,
                    "machineId": self.machine_id,
                    "deviceName": self.device_name,
                    "os": self.os_name,
                    "installationId": self.installation_id
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
            ctk.CTkLabel(self.qr_tab, text="QR Activation unavailable: No Product ID configured.", text_color="#f87171").pack(pady=20)
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
            
            qr = qrcode.QRCode(box_size=4, border=2)
            qr.add_data(approval_url)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white").get_image()
            
            ctk_img = ctk.CTkImage(light_image=img, dark_image=img, size=(180, 180))
            self.qr_image_label.configure(image=ctk_img, text="")
            
            self.qr_status.configure(text="Scan with your phone to authorize this device.", text_color="#38bdf8")
            self.qr_gen_btn.configure(text="🔄 Refresh QR Code", state="normal")

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
            ctk.CTkLabel(tab, text="Offline Activation unavailable: No Product ID configured.", text_color="#f87171").pack(pady=20)
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
            "productId": self.product_id,
            "machineId": self.machine_id,
            "installationId": self.installation_id,
            "deviceName": self.device_name,
            "os": self.os_name,
            "requestId": str(uuid.uuid4()),
            "requestExpiration": int(time.time() * 1000) + 86400000 # 24h
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
    parser = argparse.ArgumentParser(description="LockStrata Desktop Client (Device B)")
    parser.add_argument("--product", "-p", dest="product_id", help="Product SKU or ID (e.g. NX-ACC-001)")
    parser.add_argument("--config", "-c", dest="config_path", help="Path to custom product_config.json")
    return parser.parse_args()

if __name__ == "__main__":
    args = parse_args()
    app = DesktopApp(cli_product_id=args.product_id, cli_config_path=args.config_path)
    app.mainloop()
