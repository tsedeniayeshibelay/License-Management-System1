$ErrorActionPreference = 'Stop'

Write-Host "Installing required Python dependencies..." -ForegroundColor Cyan
pip install customtkinter requests cryptography qrcode pillow pyinstaller

Write-Host "Building Desktop Client Executables..." -ForegroundColor Cyan
pyinstaller --noconsole --onefile --clean --name "LockStrataClient" desktop_app.py
pyinstaller --noconsole --onefile --clean --name "LockStrataClient2" desktop_app2.py

# Copy product_config.json to dist so users can also customize it if desired
Copy-Item -Path "product_config.json" -Destination "dist\" -Force -ErrorAction SilentlyContinue

Write-Host "Build complete! Both executables are located in the dist\ directory." -ForegroundColor Green
