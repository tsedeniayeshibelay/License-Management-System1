"""
FR-01: Build-time code integrity manifest generator.

Run this BEFORE building the exe with PyInstaller:
    python build_integrity_manifest.py

It computes SHA-256 hashes of the Python source files and writes them into
integrity_manifest.json which is bundled into the exe by the .spec files.

At runtime the app loads the manifest and re-hashes itself. If any hash differs
the app refuses to start — making patching detectable.
"""

import hashlib
import json
import os
import sys

# Files to include in the integrity manifest
TARGET_FILES = [
    "desktop_app.py",
    "desktop_app2.py",
]

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()

def build_manifest(output_path="integrity_manifest.json", files=None):
    if files is None:
        files = TARGET_FILES

    manifest = {}
    for filepath in files:
        if not os.path.exists(filepath):
            print(f"WARNING: {filepath} not found — skipping")
            continue
        digest = sha256_file(filepath)
        manifest[os.path.basename(filepath)] = digest
        print(f"  {digest[:16]}...  {filepath}")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"\nManifest written to {output_path} ({len(manifest)} file(s))")
    return manifest

if __name__ == "__main__":
    print("FR-01: Building integrity manifest...")
    build_manifest()
    print("Done. Bundle this file with the exe using the .spec datas list.")
