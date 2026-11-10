# -*- mode: python ; coding: utf-8 -*-
# FR-01: integrity_manifest.json is bundled so the runtime can verify itself.

a = Analysis(
    ['desktop_app2.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('product_config2.json', '.'),
        ('integrity_manifest.json', '.'),   # FR-01: build-time integrity hashes
    ],
    hiddenimports=[
        'cryptography.hazmat.primitives.ciphers.aead',
        'cryptography.hazmat.primitives.kdf.pbkdf2',
        'cryptography.hazmat.backends',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=2,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='LockStrataClient2',
    debug=False,
    bootloader_ignore_signals=False,
    strip=True,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
