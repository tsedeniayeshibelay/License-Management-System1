$ErrorActionPreference = 'Stop'

Write-Host "Installing required Python dependencies..." -ForegroundColor Cyan
pip install customtkinter requests cryptography qrcode pillow pyinstaller

Write-Host "Building Desktop Client Executable..." -ForegroundColor Cyan
# --noconsole hides the command prompt window when the app runs
# --onefile creates a single .exe
# --windowed is another flag similar to noconsole
pyinstaller --noconsole --onefile --name "LockStrataClient" desktop_app.py

Write-Host "Build complete! Executable is located in the dist\ directory." -ForegroundColor Green
