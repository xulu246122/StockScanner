# Code Signing Guide for V6.5 Desktop Preview

## Overview

This guide explains how to sign the V6.5 Desktop Preview executable with a code-signing certificate to prevent Windows Smart App Control from blocking execution.

## Prerequisites

- **Windows SDK**: Ensure `signtool.exe` is installed (typically at `C:\Program Files (x86)\Windows Kits\10\bin\10.0.xxxxx.0\x64\signtool.exe`)
- **Code-signing certificate**: A self-signed or purchased certificate stored in the Windows certificate store

## Creating a Self-Signed Code-Signing Certificate

If you don't already have a certificate, create one with this PowerShell command:

```powershell
$cert = New-SelfSignedCertificate `
	-Type CodeSigningCert `
	-Subject "CN=US Stock AI Scanner & Alert" `
	-CertStoreLocation Cert:\CurrentUser\My
```

This creates a certificate valid for 1 year (default). To increase validity, add:
```powershell
-NotAfter (Get-Date).AddYears(5)
```

View your certificate and copy the thumbprint:
```powershell
Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert
```

## Building the Desktop EXE

Build the signed executable:

```bash
npm run build:desktop
```

This command:
1. Builds the frontend (Vite) and backend (esbuild)
2. Packages with Electron Builder
3. Outputs to `release\V6.5 Desktop Preview 0.0.0.exe`

**Note**: During the build, `electron-builder` may attempt to sign the EXE using a default signtool configuration. The manual signing step below will re-sign with your certificate.

## Signing the EXE

### Using the Provided Script

A PowerShell script is provided at `scripts/sign-exe.ps1`. Before using it:

1. **Verify signtool location** — Update the path if your Windows SDK is installed elsewhere:
   ```powershell
   Get-ChildItem "C:\Program Files (x86)\Windows Kits\10\bin\*\x64\signtool.exe"
   ```

2. **Run the script**:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sign-exe.ps1
   ```

### Manual Signing

If you prefer to sign manually:

```powershell
$signtool = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.28000.0\x64\signtool.exe"
$exePath = "D:\V6.5 US Stock AI Scanner & Alert\release\V6.5 Desktop Preview 0.0.0.exe"
$thumbprint = "YOUR_CERT_THUMBPRINT_HERE"

& $signtool sign /a /s MY /sha1 $thumbprint /fd SHA256 /v "$exePath"
```

Replace `YOUR_CERT_THUMBPRINT_HERE` with your certificate's thumbprint (see "Creating a Self-Signed Certificate" above).

### Verifying the Signature

Check that the signature was applied successfully:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-signature.ps1
```

Expected output:
```
Signature Status: UnknownError
Signer: CN=US Stock AI Scanner & Alert
Thumbprint: [your thumbprint]
SUCCESS: File has a digital signature!
(Note: Self-signed certificate - Windows may still warn on first run)
```

## Testing the Signed EXE

### First Run

Double-click the signed EXE:
```
release\V6.5 Desktop Preview 0.0.0.exe
```

**Expected Behavior**:
- ✓ Smart App Control should **not block** execution
- On first run, Windows may still display a security warning because the certificate is self-signed and not from a trusted third-party CA
- Click "More info" → "Run anyway" if prompted

### Command Line Launch

You can also launch from PowerShell:

```powershell
& "D:\V6.5 US Stock AI Scanner & Alert\release\V6.5 Desktop Preview 0.0.0.exe"
```

## Troubleshooting

### "signtool.exe not found"
**Solution**: Install Windows SDK or update the `$signtool` path in the scripts to match your Windows SDK installation location.

### "Certificate not found"
**Solution**: Ensure the certificate exists in your store:
```powershell
Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert
```

### Windows still warns about the publisher
**Expected behavior** for self-signed certificates. Options:
1. **Accept the warning** — Click "Run anyway" (development/testing)
2. **Purchase a code-signing certificate** — From a trusted CA (production)
3. **Add certificate to trusted store** — Advanced; not recommended for security

## Production Deployment

For production releases, use a **code-signing certificate from a trusted Certificate Authority** (e.g., DigiCert, Sectigo, GlobalSign). This eliminates Windows warnings entirely.

## Reference

- [Microsoft SignTool Documentation](https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool)
- [Electron Code Signing](https://www.electronjs.org/docs/tutorial/code-signing)
- [New-SelfSignedCertificate (PowerShell)](https://learn.microsoft.com/en-us/powershell/module/pki/new-selfsignedcertificate)

---

**Last Updated**: 2025
**Certificate Subject**: CN=US Stock AI Scanner & Alert
**Certificate Thumbprint**: CAC1E6D3418DD68E9D55C010444EFB1641FC08B3
