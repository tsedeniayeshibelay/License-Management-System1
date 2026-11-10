# -*- mode: python ; coding: utf-8 -*-
# FR-01: integrity_manifest.json is bundled so the runtime can verify itself.

a = Analysis(
    ['desktop_app.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('product_config.json', '.'),
        ('integrity_manifest.json', '.'),   # FR-01: build-time integrity hashes
    ],
    hiddenimports=[
        'cryptography.hazmat.primitives.ciphers.aead',   # FR-03: AES-GCM on client
        'cryptography.hazmat.primitives.kdf.pbkdf2',     # FR-03: PBKDF2 key derivation
        'cryptography.hazmat.backends',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=2,   # FR-01: bytecode optimisation strips docstrings (minor obfuscation)
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='LockStrataClient',
    debug=False,
    bootloader_ignore_signals=False,
    strip=True,    # FR-01: strip debug symbols
    upx=True,      # FR-01: UPX compression (packs the binary, harder to hex-edit)
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
