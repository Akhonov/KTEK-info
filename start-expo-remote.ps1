param(
    [int]$WebPort = 8002,
    [int]$ExpoPort = 8082
)

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$mobileRoot = Join-Path $projectRoot "mobile"
$webServer = $null
$cloudflared = $null
$runId = [Guid]::NewGuid().ToString("N")
$cloudflaredOut = Join-Path $env:TEMP "ktek-cloudflared-$runId.out.log"
$cloudflaredErr = Join-Path $env:TEMP "ktek-cloudflared-$runId.err.log"

function Wait-KtekHttp {
    param(
        [string]$Uri,
        [int]$Attempts = 30
    )

    for ($attempt = 0; $attempt -lt $Attempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                return $true
            }
        } catch {
            # The local server or tunnel may still be starting.
        }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

if (-not (Test-Path -LiteralPath (Join-Path $mobileRoot "package.json"))) {
    throw "The mobile directory does not contain an Expo project."
}

$python = Get-Command python -ErrorAction Stop
$cloudflaredPath = Join-Path $env:LOCALAPPDATA "KTEK\tools\cloudflared.exe"
if (-not (Test-Path -LiteralPath $cloudflaredPath)) {
    $cloudflaredDirectory = Split-Path -Parent $cloudflaredPath
    New-Item -ItemType Directory -Path $cloudflaredDirectory -Force | Out-Null
    Write-Host "Downloading Cloudflare Tunnel..." -ForegroundColor Yellow
    Invoke-WebRequest `
        -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" `
        -OutFile $cloudflaredPath `
        -UseBasicParsing
}

if (Get-NetTCPConnection -LocalPort $WebPort -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $WebPort is already occupied. Close its process or choose another WebPort."
}

if (Get-NetTCPConnection -LocalPort $ExpoPort -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $ExpoPort is already occupied. Close its process or choose another ExpoPort."
}

try {
    $webServer = Start-Process `
        -FilePath $python.Source `
        -ArgumentList @((Join-Path $projectRoot "serve_mobile_web.py"), "--host", "127.0.0.1", "--port", "$WebPort") `
        -WorkingDirectory $projectRoot `
        -WindowStyle Hidden `
        -PassThru

    if (-not (Wait-KtekHttp -Uri "http://127.0.0.1:$WebPort/index.html" -Attempts 20)) {
        throw "The restricted KTEK web server failed to start."
    }

    $cloudflared = Start-Process `
        -FilePath $cloudflaredPath `
        -ArgumentList @("tunnel", "--no-autoupdate", "--url", "http://127.0.0.1:$WebPort") `
        -WindowStyle Hidden `
        -RedirectStandardOutput $cloudflaredOut `
        -RedirectStandardError $cloudflaredErr `
        -PassThru

    $publicOrigin = $null
    for ($attempt = 0; $attempt -lt 120; $attempt++) {
        if ($cloudflared.HasExited) {
            $details = ""
            if (Test-Path -LiteralPath $cloudflaredErr) {
                $details = Get-Content -Raw -LiteralPath $cloudflaredErr
            }
            throw "Cloudflare Tunnel stopped unexpectedly. $details"
        }

        $logs = ""
        if (Test-Path -LiteralPath $cloudflaredOut) {
            $logs += Get-Content -Raw -LiteralPath $cloudflaredOut
        }
        if (Test-Path -LiteralPath $cloudflaredErr) {
            $logs += Get-Content -Raw -LiteralPath $cloudflaredErr
        }

        $match = [regex]::Match($logs, "https://[a-z0-9-]+\.trycloudflare\.com")
        if ($match.Success) {
            $publicOrigin = $match.Value
            break
        }
        Start-Sleep -Milliseconds 500
    }

    if (-not $publicOrigin) {
        throw "Cloudflare Tunnel did not provide a public URL."
    }

    $publicWebUrl = "$publicOrigin/index.html"
    if (-not (Wait-KtekHttp -Uri $publicWebUrl -Attempts 40)) {
        throw "The public web URL did not become available: $publicWebUrl"
    }

    $env:EXPO_PUBLIC_KTEK_WEB_URL = $publicWebUrl

    Write-Host ""
    Write-Host "KTEK remote Expo Go is ready" -ForegroundColor Green
    Write-Host "Public web app: $publicWebUrl" -ForegroundColor Cyan
    Write-Host "The new QR code works from another Wi-Fi or mobile network." -ForegroundColor White
    Write-Host "Keep this window and the computer running during testing." -ForegroundColor White
    Write-Host ""

    Set-Location -LiteralPath $mobileRoot
    & npx expo start --tunnel --go --port $ExpoPort
} finally {
    Set-Location -LiteralPath $projectRoot
    if ($cloudflared -and -not $cloudflared.HasExited) {
        Stop-Process -Id $cloudflared.Id -Force -ErrorAction SilentlyContinue
    }
    if ($webServer -and -not $webServer.HasExited) {
        Stop-Process -Id $webServer.Id -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $cloudflaredOut, $cloudflaredErr -Force -ErrorAction SilentlyContinue
}
