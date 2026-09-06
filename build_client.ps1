param(
    [ValidateSet("Both", "LockStrataClient", "LockStrataClient2")]
    [string]$Client = "Both",

    [string]$ProductId = "NX-ACC-001",
    [string]$ProductName = "Nexora Accounting",

    [string]$ProductId2 = "NX-INV-002",
    [string]$ProductName2 = "Nexora Inventory",

    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'

if (-not $SkipInstall) {
    Write-Host "Installing required Python dependencies..." -ForegroundColor Cyan
    pip install customtkinter requests cryptography qrcode pillow pyinstaller
}

if (-not (Test-Path "dist")) {
    New-Item -ItemType Directory -Path "dist" | Out-Null
}

function Build-ClientApp([string]$Name, [string]$Script, [string]$ConfigFileName, [string]$ProdId, [string]$PName) {
    Write-Host "Configuring product identity for $Name ($PName - $ProdId)..." -ForegroundColor Cyan
    
    $configObj = @{
        productId = $ProdId
        productName = $PName
    } | ConvertTo-Json

    # Write configuration file without BOM
    [System.IO.File]::WriteAllText((Join-Path (Get-Location) $ConfigFileName), $configObj, [System.Text.UTF8Encoding]::new($false))
    
    # Copy configuration file to dist folder
    Copy-Item -Path $ConfigFileName -Destination "dist\" -Force

    Write-Host "Building $Name executable from $Script..." -ForegroundColor Cyan
    pyinstaller --noconsole --onefile --clean --add-data "$ConfigFileName;." --name $Name $Script
    
    # Ensure config file remains in dist alongside the executable
    Copy-Item -Path $ConfigFileName -Destination "dist\" -Force
    Write-Host "$Name built successfully in dist\ with companion $ConfigFileName." -ForegroundColor Green
}

if ($Client -eq "Both" -or $Client -eq "LockStrataClient") {
    Build-ClientApp -Name "LockStrataClient" -Script "desktop_app.py" -ConfigFileName "product_config.json" -ProdId $ProductId -PName $ProductName
}

if ($Client -eq "Both" -or $Client -eq "LockStrataClient2") {
    Build-ClientApp -Name "LockStrataClient2" -Script "desktop_app2.py" -ConfigFileName "product_config2.json" -ProdId $ProductId2 -PName $ProductName2
}

Write-Host "Build process complete! Both clients are configured for automatic product identification." -ForegroundColor Green
