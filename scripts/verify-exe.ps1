$signtool = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.28000.0\x64\signtool.exe"
$exePath = "D:\V6.5 US Stock AI Scanner & Alert\release\V6.5 Desktop Preview 0.0.0.exe"

Write-Host "Verifying signature for: $exePath"
Write-Host ""

& $signtool verify /v /pa "$exePath"

if ($LASTEXITCODE -eq 0) {
	Write-Host "[SUCCESS] Signature verification passed!"
} else {
	Write-Host "[ERROR] Signature verification failed!"
}
