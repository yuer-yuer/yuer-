param(
  [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$Server = Join-Path $Root 'server.js'

if (!(Test-Path $Server)) {
  throw "server.js not found at $Server"
}

Write-Host "Restarting server on port $Port..."

$lines = netstat -ano | Select-String ":$Port" | Select-String 'LISTENING'
$pids = @()
foreach ($line in $lines) {
  $parts = ($line.Line -split '\s+') | Where-Object { $_ -ne '' }
  if ($parts.Length -ge 5 -and $parts[1] -match ":$Port$" -and [int]$parts[-1] -gt 0) {
    $pids += [int]$parts[-1]
  }
}

$pids = $pids | Sort-Object -Unique
foreach ($processId in $pids) {
  Write-Host "Stopping PID $processId..."
  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Milliseconds 800

Write-Host "Starting node server.js..."
Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory $Root -WindowStyle Hidden

$ready = $false
for ($attempt = 1; $attempt -le 20; $attempt++) {
  Start-Sleep -Milliseconds 500
  $listening = netstat -ano | Select-String ":$Port" | Select-String 'LISTENING'
  if ($listening) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/" -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch {
      # Port is open but Express may still be warming up.
    }
  }
}

if (!$ready) {
  throw "Server did not become ready on http://localhost:$Port"
}

Write-Host "Server restarted: http://localhost:$Port"
