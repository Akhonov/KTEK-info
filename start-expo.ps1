param(
    [int]$WebPort = 8000,
    [int]$ExpoPort = 8081
)

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$mobileRoot = Join-Path $projectRoot "mobile"
$startedWebServer = $null

function Get-KtekLanAddress {
    $configurations = Get-NetIPConfiguration -ErrorAction SilentlyContinue |
        Where-Object {
            $_.NetAdapter.Status -eq "Up" -and
            $_.IPv4Address -and
            $_.IPv4DefaultGateway -and
            $_.InterfaceAlias -notmatch "Radmin|VPN|Loopback|Virtual|WSL|Docker"
        }

    $configuration = $configurations |
        Where-Object {
            $_.IPv4Address.IPAddress -match "^192\.168\." -or
            $_.IPv4Address.IPAddress -match "^10\." -or
            $_.IPv4Address.IPAddress -match "^172\.(1[6-9]|2[0-9]|3[0-1])\."
        } |
        Select-Object -First 1

    if (-not $configuration) {
        $configuration = $configurations | Select-Object -First 1
    }

    if ($configuration) {
        return $configuration.IPv4Address.IPAddress
    }

    return Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notlike "127.*" -and
            $_.IPAddress -notlike "169.254.*" -and
            $_.InterfaceAlias -notmatch "Radmin|VPN|Loopback|Virtual|WSL|Docker"
        } |
        Select-Object -ExpandProperty IPAddress -First 1
}

if (-not (Test-Path -LiteralPath (Join-Path $mobileRoot "package.json"))) {
    throw "The mobile directory does not contain an Expo project."
}

$lanAddress = Get-KtekLanAddress
if (-not $lanAddress) {
    throw "LAN IP was not found. Connect this computer to Wi-Fi or Ethernet."
}

$listeners = Get-NetTCPConnection -LocalPort $WebPort -State Listen -ErrorAction SilentlyContinue
if ($listeners) {
    $availableOnLan = $listeners | Where-Object {
        $_.LocalAddress -eq "0.0.0.0" -or
        $_.LocalAddress -eq "::" -or
        $_.LocalAddress -eq $lanAddress
    }

    if (-not $availableOnLan) {
        throw "Port $WebPort is occupied by a localhost-only server. Stop it and run this script again."
    }
} else {
    $python = Get-Command python -ErrorAction Stop
    $startedWebServer = Start-Process `
        -FilePath $python.Source `
        -ArgumentList @("-m", "http.server", "$WebPort", "--bind", "0.0.0.0") `
        -WorkingDirectory $projectRoot `
        -WindowStyle Hidden `
        -PassThru

    $serverReady = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 250
        try {
            $response = Invoke-WebRequest `
                -Uri "http://127.0.0.1:$WebPort/index.html" `
                -UseBasicParsing `
                -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                $serverReady = $true
                break
            }
        } catch {
            # The web server may need a few seconds to start.
        }
    }

    if (-not $serverReady) {
        Stop-Process -Id $startedWebServer.Id -Force -ErrorAction SilentlyContinue
        throw "The KTEK web server failed to start on port $WebPort."
    }
}

$env:EXPO_PUBLIC_KTEK_WEB_URL = "http://${lanAddress}:$WebPort/index.html"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $lanAddress

Write-Host ""
Write-Host "KTEK Expo Go is ready" -ForegroundColor Green
Write-Host "Web map: $env:EXPO_PUBLIC_KTEK_WEB_URL" -ForegroundColor Cyan
Write-Host "1. Connect the phone to the same Wi-Fi network." -ForegroundColor White
Write-Host "2. Open Expo Go and scan the QR code below." -ForegroundColor White
Write-Host "3. Allow private-network access if Windows Firewall asks." -ForegroundColor White
Write-Host ""

try {
    Set-Location -LiteralPath $mobileRoot
    & npx expo start --lan --go --port $ExpoPort
} finally {
    Set-Location -LiteralPath $projectRoot
    if ($startedWebServer -and -not $startedWebServer.HasExited) {
        Stop-Process -Id $startedWebServer.Id -Force -ErrorAction SilentlyContinue
    }
}
