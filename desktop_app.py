import os
import sys
import json
import base64
import platform
import hashlib
import uuid
import time
import threading
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

API_BASE_URL = "http://localhost:8080/api"

class DesktopApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("LockStrata Secure Desktop Client")
        self.geometry("800x600")
        self.resizable(False, False)

        # Setup paths and identity
        self.app_data_dir = os.path.join(os.getenv('APPDATA'), 'LockStrata')
        os.makedirs(self.app_data_dir, exist_ok=True)
        self.license_file_path = os.path.join(self.app_data_dir, 'license.lic')
        self.identity_file_path = os.path.join(self.app_data_dir, 'identity.json')

        self.load_or_create_identity()

        # Parse Public Key
        pub_der = base64.b64decode(PUBLIC_KEY_B64)
        self.public_key = serialization.load_der_public_key(pub_der)

        # UI Setup
        self.setup_ui()

        # Check existing license
        self.check_local_license()

    def load_or_create_identity(self):
        # Stable machine fingerprint
        system_info = platform.node() + platform.system() + platform.machine()
        hashed_id = hashlib.sha256(system_info.encode()).hexdigest()[:15].upper()
        self.machine_id = f"HW-{hashed_id}"
        self.os_name = platform.system()
        self.device_name = platform.node()

        if os.path.exists(self.identity_file_path):
            with open(self.identity_file_path, 'r') as f:
                data = json.load(f)
                self.installation_id = data.get("installationId")
        else:
            self.installation_id = str(uuid.uuid4())
            with open(self.identity_file_path, 'w') as f:
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
            with open(self.license_file_path, 'r') as f:
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

            # Success
            self.show_activated_screen(payload_obj)

        except Exception as e:
            messagebox.showerror("License Error", f"Local license invalid:\n{str(e)}")
            os.remove(self.license_file_path)

    def save_license(self, response_json):
        try:
            with open(self.license_file_path, 'w') as f:
                json.dump(response_json, f)
            self.check_local_license()
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save license: {e}")

    def show_activated_screen(self, payload):
        for widget in self.winfo_children():
            widget.destroy()
            
        frame = ctk.CTkFrame(self)
        frame.pack(expand=True, fill="both", padx=40, pady=40)
        
        ctk.CTkLabel(frame, text="✅ Software Activated", font=ctk.CTkFont(size=30, weight="bold"), text_color="#34d399").pack(pady=(40, 20))
        ctk.CTkLabel(frame, text=f"License Key: {payload.get('licenseKey')}").pack(pady=5)
        ctk.CTkLabel(frame, text=f"Device ID: {self.machine_id}").pack(pady=5)
        ctk.CTkLabel(frame, text=f"Product ID: {payload.get('productId')}").pack(pady=5)
        ctk.CTkLabel(frame, text=f"Expires: {payload.get('expiryDate', 'Perpetual')}").pack(pady=5)

    def setup_ui(self):
        # Create Tab View
        self.tabview = ctk.CTkTabview(self, width=720, height=520)
        self.tabview.pack(padx=20, pady=20)

        self.tabview.add("Auto Activation")
        self.tabview.add("QR Activation")
        self.tabview.add("Offline Activation")

        self.setup_auto_tab()
        self.setup_qr_tab()
        self.setup_offline_tab()

    def setup_auto_tab(self):
        tab = self.tabview.tab("Auto Activation")
        
        ctk.CTkLabel(tab, text="Auto Activation (Online)", font=ctk.CTkFont(size=24, weight="bold")).pack(pady=(20, 10))
        ctk.CTkLabel(tab, text="Login with your LockStrata account to activate automatically.", text_color="gray").pack(pady=(0, 20))

        self.pid_entry = ctk.CTkEntry(tab, placeholder_text="Product ID (e.g. 1)", width=300, height=40)
        self.pid_entry.pack(pady=5)
        self.email_entry = ctk.CTkEntry(tab, placeholder_text="Customer Email", width=300, height=40)
        self.email_entry.pack(pady=5)
        self.password_entry = ctk.CTkEntry(tab, placeholder_text="Password", show="*", width=300, height=40)
        self.password_entry.pack(pady=5)
        self.two_factor_entry = ctk.CTkEntry(tab, placeholder_text="2FA Code (if enabled, dev: 123456)", width=300, height=40)
        self.two_factor_entry.pack(pady=5)

        self.auto_btn = ctk.CTkButton(tab, text="Activate", width=300, height=40, command=self.do_auto_activation)
        self.auto_btn.pack(pady=15)
        self.auto_status = ctk.CTkLabel(tab, text="")
        self.auto_status.pack()

    def do_auto_activation(self):
        email = self.email_entry.get()
        password = self.password_entry.get()
        pid = self.pid_entry.get()
        two_fa = self.two_factor_entry.get().strip()
        
        if not email or not password:
            self.auto_status.configure(text="Please enter Email and Password.", text_color="red")
            return

        self.auto_btn.configure(state="disabled", text="Authenticating...")
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
                    raise Exception("2FA is enabled on this account. Enter your 6-digit code (or 123456 for dev) in the 2FA box above and click Activate.")
                raise Exception(login_data.get("message", "Login succeeded but no token returned."))

            # Auto-detect product ID from assigned licenses if not provided
            if not pid:
                self.auto_btn.configure(text="Finding licenses...")
                self.update()
                lic_res = requests.get(
                    f"{API_BASE_URL}/licenses/my-licenses",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if lic_res.status_code == 200:
                    my_lics = lic_res.json()
                    if my_lics and len(my_lics) > 0:
                        pid = str(my_lics[0].get("productId"))
                        self.pid_entry.delete(0, 'end')
                        self.pid_entry.insert(0, pid)
                if not pid:
                    raise Exception("No active or assigned licenses found for this account. Please specify Product ID.")

            self.auto_btn.configure(text="Activating...")
            self.update()

            act_res = requests.post(
                f"{API_BASE_URL}/activations/auto",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "productId": int(pid),
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
            self.auto_status.configure(text=f"Error: {str(e)}", text_color="red")
            self.auto_btn.configure(state="normal", text="Activate")

    def setup_qr_tab(self):
        self.qr_tab = self.tabview.tab("QR Activation")
        
        ctk.CTkLabel(self.qr_tab, text="QR Activation", font=ctk.CTkFont(size=24, weight="bold")).pack(pady=(20, 10))
        ctk.CTkLabel(self.qr_tab, text="Generate a QR code and scan it with your smartphone.", text_color="gray").pack(pady=(0, 20))

        self.qr_pid_entry = ctk.CTkEntry(self.qr_tab, placeholder_text="Product ID (e.g. 1)", width=300, height=40)
        self.qr_pid_entry.pack(pady=5)

        self.qr_gen_btn = ctk.CTkButton(self.qr_tab, text="Generate QR Code", width=300, height=40, command=self.do_qr_request)
        self.qr_gen_btn.pack(pady=15)

        self.qr_image_label = ctk.CTkLabel(self.qr_tab, text="")
        self.qr_image_label.pack(pady=10)
        
        self.qr_status = ctk.CTkLabel(self.qr_tab, text="")
        self.qr_status.pack()

        self.polling = False

    def do_qr_request(self):
        pid = self.qr_pid_entry.get()
        if not pid:
            self.qr_status.configure(text="Please enter Product ID.", text_color="red")
            return

        self.qr_gen_btn.configure(state="disabled", text="Requesting...")
        self.update()

        try:
            res = requests.post(
                f"{API_BASE_URL}/activations/qr/request",
                json={
                    "productId": int(pid),
                    "machineId": self.machine_id,
                    "installationId": self.installation_id,
                    "deviceName": self.device_name,
                    "os": self.os_name
                }
            )
            if res.status_code != 201:
                raise Exception(res.json().get("message", "Failed to generate QR"))

            data = res.json()
            approval_url = data.get('approvalUrl', f"http://localhost:3000/customer/activate/qr/{data['publicApprovalToken']}")
            
            # Generate QR Image
            qr = qrcode.QRCode(box_size=4, border=2)
            qr.add_data(approval_url)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white").get_image()
            
            # Convert to CTkImage
            ctk_img = ctk.CTkImage(light_image=img, dark_image=img, size=(200, 200))
            self.qr_image_label.configure(image=ctk_img, text="")
            
            self.qr_status.configure(text="Scan with your phone to approve.", text_color="cyan")
            self.qr_gen_btn.configure(text="Generate QR Code", state="normal")

            # Start polling
            self.polling = True
            threading.Thread(target=self.poll_qr_status, args=(data['requestId'], data['appPollingSecret']), daemon=True).start()

        except Exception as e:
            self.qr_status.configure(text=f"Error: {str(e)}", text_color="red")
            self.qr_gen_btn.configure(state="normal", text="Generate QR Code")

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
                        self.after(0, lambda: self.qr_status.configure(text="QR Code Expired. Try again.", text_color="red"))
                        break
            except:
                pass
            time.sleep(3)

    def setup_offline_tab(self):
        tab = self.tabview.tab("Offline Activation")

        ctk.CTkLabel(tab, text="Offline Activation (AirGap)", font=ctk.CTkFont(size=24, weight="bold")).pack(pady=(20, 10))
        ctk.CTkLabel(tab, text="Generate a request file, then upload the received .lic file.", text_color="gray").pack(pady=(0, 20))

        self.off_pid_entry = ctk.CTkEntry(tab, placeholder_text="Product ID (e.g. 1)", width=300, height=40)
        self.off_pid_entry.pack(pady=5)

        ctk.CTkButton(tab, text="1. Generate request.json", width=300, height=40, command=self.do_generate_request).pack(pady=10)
        ctk.CTkButton(tab, text="2. Import license.lic", width=300, height=40, fg_color="#34d399", text_color="black", hover_color="#10b981", command=self.do_import_license).pack(pady=10)

        self.off_status = ctk.CTkLabel(tab, text="")
        self.off_status.pack(pady=10)

    def do_generate_request(self):
        pid = self.off_pid_entry.get()
        if not pid:
            self.off_status.configure(text="Please enter Product ID.", text_color="red")
            return

        req_data = {
            "productId": int(pid),
            "machineId": self.machine_id,
            "installationId": self.installation_id,
            "deviceName": self.device_name,
            "os": self.os_name,
            "requestId": str(uuid.uuid4()),
            "requestExpiration": int(time.time() * 1000) + 86400000 # 24h
        }

        filepath = filedialog.asksaveasfilename(defaultextension=".json", initialfile="request.json", title="Save Request File")
        if filepath:
            with open(filepath, 'w') as f:
                json.dump(req_data, f)
            self.off_status.configure(text=f"Saved {os.path.basename(filepath)}. Transfer this to an online PC.", text_color="cyan")

    def do_import_license(self):
        filepath = filedialog.askopenfilename(title="Select license.lic", filetypes=(("License Files", "*.lic"), ("All Files", "*.*")))
        if not filepath:
            return
        
        try:
            with open(filepath, "r") as f:
                data = json.load(f)
            self.save_license(data)
        except Exception as e:
            self.off_status.configure(text=f"Import Error: {str(e)}", text_color="red")

if __name__ == "__main__":
    app = DesktopApp()
    app.mainloop()
