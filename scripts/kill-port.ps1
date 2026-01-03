<#
  scripts/kill-port.ps1

  Utility to kill a process listening on a TCP port (default 3000).
  Handy when a dev server is stuck or a previous run didn't shut down cleanly.
#>
param(
  [int]$Port
)

if (-not $Port) {
  if ($env:PORT) {
    try { $Port = [int]$env:PORT } catch { $Port = 3000 }
  } else {
    $Port = 3000
  }
}

$lines = netstat -ano | Select-String (":$Port") | Where-Object { $_.Line -match 'LISTENING' }
$pids = $lines | ForEach-Object { ($_.Line -split '\s+')[-1] } | Where-Object { $_ -match '^\d+$' } | Select-Object -Unique

if (-not $pids -or $pids.Count -eq 0) {
  Write-Host "No listener on port $Port"
  exit 0
}

foreach ($procId in $pids) {
  Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue
}

Write-Host ("Stopped PIDs on port {0}: {1}" -f $Port, ($pids -join ', '))
