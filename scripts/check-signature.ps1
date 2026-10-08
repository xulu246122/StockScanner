$exePath = "D:\V6.5 US Stock AI Scanner & Alert\release\V6.5 Desktop Preview 0.0.0.exe"
$sig = Get-AuthenticodeSignature -FilePath $exePath

Write-Host "EXE File: $exePath"
Write-Host ""
Write-Host "Signature Status: $($sig.Status)"
Write-Host "Signer: $($sig.SignerCertificate.Subject)"
Write-Host "Thumbprint: $($sig.SignerCertificate.Thumbprint)"
Write-Host ""

if ($sig.Status -eq "NotSigned") {
	Write-Host "ERROR: File is not signed!"
} elseif ($sig.Status -eq "UnknownError") {
	Write-Host "ERROR: Unknown signature error!"
} else {
	Write-Host "SUCCESS: File has a digital signature!"
	Write-Host "(Note: Self-signed certificate - Windows may still warn on first run)"
}
