$signtool = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.28000.0\x64\signtool.exe"
$exePath = "D:\V6.5 US Stock AI Scanner & Alert\release\V6.5 Desktop Preview 0.0.0.exe"
$thumbprint = "CAC1E6D3418DD68E9D55C010444EFB1641FC08B3"

Write-Host "Signing EXE: $exePath"
Write-Host "Using certificate thumbprint: $thumbprint"
Write-Host ""

& $signtool sign /a /s MY /sha1 $thumbprint /fd SHA256 /v "$exePath"

if ($LASTEXITCODE -eq 0) {
	Write-Host "[SUCCESS] Signing completed!"
} else {
	Write-Host "[ERROR] Signing failed with exit code: $LASTEXITCODE"
}
