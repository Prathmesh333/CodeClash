param([Parameter(Mandatory=$true)][ValidateSet('google','email')][string]$Provider)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$oauthClientId = if ($Provider -eq 'google') { Read-Host 'Google OAuth Client ID' } else { Read-Host 'Verified sender (e.g. CodeClash <login@code-clash.com>)' }
$oauthSecret = Read-Host 'Google Client Secret or Resend API key (hidden)' -AsSecureString
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($oauthSecret)
try {
    $secretValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
    $credentials = if ($Provider -eq 'google') { @{ GOOGLE_CLIENT_ID = $oauthClientId; GOOGLE_CLIENT_SECRET = $secretValue } } else { @{ EMAIL_FROM = $oauthClientId; RESEND_API_KEY = $secretValue } }
    $payload = $credentials | ConvertTo-Json -Compress
    $startInfo = [Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = (Get-Command node).Source
    $startInfo.Arguments = 'node_modules/wrangler/bin/wrangler.js secret bulk --config apps/worker/wrangler.staging.jsonc'
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardInput = $true
    $process = [Diagnostics.Process]::Start($startInfo)
    $process.StandardInput.WriteLine($payload)
    $process.StandardInput.Close()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw 'Secret upload failed. Check Cloudflare sign-in and try again.' }
    Write-Host 'Sign-in credentials uploaded to the staging Worker. No secret file was written.'
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
    $secretValue = $null
    $payload = $null
    $oauthSecret.Dispose()
}
