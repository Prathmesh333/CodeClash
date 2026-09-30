$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$oauthClientId = Read-Host 'GitHub OAuth Client ID'
$oauthSecret = Read-Host 'GitHub OAuth Client Secret (hidden)' -AsSecureString
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($oauthSecret)
try {
    $secretValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
    $payload = @{ GITHUB_CLIENT_ID = $oauthClientId; GITHUB_CLIENT_SECRET = $secretValue } | ConvertTo-Json -Compress
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
    Write-Host 'GitHub credentials uploaded to the staging Worker. No secret file was written.'
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
    $secretValue = $null
    $payload = $null
    $oauthSecret.Dispose()
}
