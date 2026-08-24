import os
import json
import base64
import urllib.request
import platform
import hashlib
from tkinter import filedialog
try:
    import customtkinter as ctk
    import requests
except ImportError:
    print("Please run: pip install customtkinter requests")
    exit()

# Configure the modern appearance
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

class VendorDemoApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("LockStrata Demo - Vendor Application")
        self.geometry("700x500")
        self.resizable(False, False)

        # Generate Fake Hardware ID
        system_info = platform.node() + platform.system() + platform.machine()
        hashed_id = hashlib.sha256(system_info.encode()).hexdigest()[:10].upper()
        self.hw_id = f"HW-{hashed_id}"

        # Create Tab View
        self.tabview = ctk.CTkTabview(self, width=650, height=450)
        self.tabview.pack(padx=20, pady=20)

        self.tabview.add("Online Activation (CloudSync Auto)")
        self.tabview.add("Offline Activation (AirGap Secure Vault)")

        self.setup_online_tab()
        self.setup_offline_tab()

    def setup_online_tab(self):
        tab = self.tabview.tab("Online Activation (CloudSync Auto)")
        
        # Header
        title = ctk.CTkLabel(tab, text="☁️ CloudSync Auto", font=ctk.CTkFont(size=24, weight="bold"))
        title.pack(pady=(20, 10))

        subtitle = ctk.CTkLabel(tab, text="Enter your LockStrata credentials to activate online.", text_color="gray")
        subtitle.pack(pady=(0, 20))

        # Inputs
        self.pid_entry = ctk.CTkEntry(tab, placeholder_text="Product ID (e.g. 18)", width=300, height=40)
        self.pid_entry.pack(pady=5)

        self.email_entry = ctk.CTkEntry(tab, placeholder_text="Customer Email", width=300, height=40)
        self.email_entry.pack(pady=5)

        self.password_entry = ctk.CTkEntry(tab, placeholder_text="Password", show="*", width=300, height=40)
        self.password_entry.pack(pady=5)

        # Button
        self.activate_btn = ctk.CTkButton(tab, text="Verify & Activate", width=300, height=40, command=self.do_online_activation)
        self.activate_btn.pack(pady=15)

        # Status
        self.online_status = ctk.CTkLabel(tab, text="", font=ctk.CTkFont(size=14))
        self.online_status.pack(pady=5)

    def do_online_activation(self):
        email = self.email_entry.get()
        password = self.password_entry.get()
        pid_str = self.pid_entry.get()
        
        if not email or not password or not pid_str:
            self.online_status.configure(text="Please enter Product ID, email, and password.", text_color="red")
            return
            
        try:
            pid = int(pid_str)
        except ValueError:
            self.online_status.configure(text="Product ID must be a number.", text_color="red")
            return

        self.activate_btn.configure(state="disabled", text="Authenticating...")
        self.update()

        try:
            # 1. Login
            login_res = requests.post("http://localhost:8080/api/auth/login", json={"email": email, "password": password})
            if login_res.status_code != 200:
                try:
                    err = login_res.json().get("message") or login_res.json().get("error") or "Invalid credentials"
                except Exception:
                    err = f"Login failed ({login_res.status_code})"
                raise Exception(err)
            
            token = login_res.json().get("token")
            if not token:
                raise Exception("Login failed: no token received.")

            # 2. Activate
            self.activate_btn.configure(text="Verifying License...")
            self.update()

            act_res = requests.post(
                "http://localhost:8080/api/activations/auto",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "productId": pid,
                    "machineId": self.hw_id,
                    "deviceName": "Advisor Demo PC"
                }
            )

            if act_res.status_code not in (200, 201):
                try:
                    err_msg = act_res.json().get("message", act_res.text)
                except:
                    err_msg = act_res.text
                raise Exception(f"Server Error: {err_msg}")

            # Success
            self.online_status.configure(
                text=f"✅ Activation Successful!\nWelcome to CloudSync Auto.\nHardware ID Bound: {self.hw_id}", 
                text_color="green"
            )
            self.activate_btn.configure(text="Activated", fg_color="green")
        except Exception as e:
            self.online_status.configure(text=f"❌ Error: {str(e)}", text_color="red")
            self.activate_btn.configure(state="normal", text="Verify & Activate")


    def setup_offline_tab(self):
        tab = self.tabview.tab("Offline Activation (AirGap Secure Vault)")

        # Header
        title = ctk.CTkLabel(tab, text="🔒 AirGap Secure Vault", font=ctk.CTkFont(size=24, weight="bold"))
        title.pack(pady=(20, 10))

        subtitle = ctk.CTkLabel(tab, text="This vault is completely air-gapped. No internet connection exists.", text_color="gray")
        subtitle.pack(pady=(0, 20))

        # Hardware ID Display
        hw_frame = ctk.CTkFrame(tab, fg_color="transparent")
        hw_frame.pack(pady=10)
        
        ctk.CTkLabel(hw_frame, text="Your Offline Machine ID:", font=ctk.CTkFont(weight="bold")).pack(side="left", padx=10)
        hw_entry = ctk.CTkEntry(hw_frame, width=150)
        hw_entry.insert(0, self.hw_id)
        hw_entry.configure(state="readonly")
        hw_entry.pack(side="left")

        ctk.CTkLabel(tab, text="Please generate a .lic file from your portal using this Machine ID\nand import it below to unlock the vault.", text_color="gray").pack(pady=20)

        # Upload Button
        self.upload_btn = ctk.CTkButton(tab, text="📁 Import license.lic File", width=300, height=45, fg_color="#34d399", text_color="black", hover_color="#10b981", command=self.do_offline_activation)
        self.upload_btn.pack(pady=10)

        # Status
        self.offline_status = ctk.CTkLabel(tab, text="", font=ctk.CTkFont(size=14))
        self.offline_status.pack(pady=10)

    def do_offline_activation(self):
        filepath = filedialog.askopenfilename(title="Select your license.lic file", filetypes=(("License Files", "*.lic"), ("All Files", "*.*")))
        if not filepath:
            return
        
        try:
            with open(filepath, "r") as f:
                data = json.load(f)
            
            if "payload" not in data or "signature" not in data:
                raise Exception("Invalid file format. Missing cryptographic signature.")
                
            # Decode Base64 Payload
            payload_str = base64.b64decode(data["payload"]).decode('utf-8')
            payload_obj = json.loads(payload_str)

            # Check if Machine ID matches
            if payload_obj.get("hardwareId") != self.hw_id:
                raise Exception(f"Hardware mismatch!\nThis license was generated for {payload_obj.get('hardwareId')}, but this PC is {self.hw_id}!")

            # Success
            self.offline_status.configure(
                text=f"✅ Signature Verified Offline!\nVault Unlocked.\nLicense Key: {payload_obj.get('licenseKey')}", 
                text_color="#34d399"
            )
            self.upload_btn.configure(text="Vault Unlocked", state="disabled", fg_color="gray")

        except Exception as e:
            self.offline_status.configure(text=f"❌ Verification Failed:\n{str(e)}", text_color="red")

if __name__ == "__main__":
    app = VendorDemoApp()
    app.mainloop()
