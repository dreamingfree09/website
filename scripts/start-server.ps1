<#
  scripts/start-server.ps1

  Production-ish local start helper.

  - Defaults to port 3000
  - Disables port hopping (PORT_TRIES=0)
  - `-External` starts the server in a new window and tees logs to ./logs/console.log
#>
param(
  [int]$Port = 3000,
  [switch]$External
)

$env:PORT = "$Port"
# Disable port hopping completely.
$env:PORT_TRIES = "0"

if ($External) {
  $cwd = (Get-Location).Path

  $shell = "powershell"
  if (Get-Command pwsh -ErrorAction SilentlyContinue) {
    $shell = "pwsh"
  }

  $logDir = Join-Path $cwd 'logs'
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null

  $logPath = Join-Path $logDir 'console.log'
  $logPathQuoted = $logPath.Replace("'", "''")
  $cmd = "& { `$env:PORT = '$Port'; `$env:PORT_TRIES = '0'; node app.js 2>&1 | Tee-Object -FilePath '$logPathQuoted' -Append }"

  Start-Process -FilePath $shell -WorkingDirectory $cwd -ArgumentList @(
    "-NoExit",
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $cmd
  )

  Write-Host "Started server in a new PowerShell window on port $Port"
  exit 0
}

node app.js
