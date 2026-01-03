<#
  scripts/dev-server.ps1

  Developer helper to run the app via nodemon.

  - Defaults to port 3000
  - Disables port hopping (PORT_TRIES=0)
  - Uses npx so nodemon does not need a global install
#>
param(
  [int]$Port = 3000
)

$env:PORT = "$Port"
$env:PORT_TRIES = "0"

# Use npx so this works even when nodemon isn't globally installed.
npx nodemon app.js
