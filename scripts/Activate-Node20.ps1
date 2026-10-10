#Requires -Version 5.1
<#
  .SYNOPSIS
    Activates the project's declared Node 20 runtime for the current shell.
  .DESCRIPTION
    The project declares Node 20 (.nvmrc, functions engines, firebase.json
    runtime). The host also has a system Node 24 whose machine-PATH entry
    shadows NVM's Node 20. This script prepends NVM's Node 20 directory to
    the CURRENT session PATH only - no system changes, no reinstalls.
    Run it once per shell before npm/firebase commands:
      . .\scripts\Activate-Node20.ps1
    (dot-source it so the PATH change persists in your session.)
#>
$ErrorActionPreference = 'Stop'
$nvmDir = 'C:\Users\zaidm\AppData\Local\Author Software\nvm\\.nodejs'
if (-not (Test-Path (Join-Path $nvmDir 'node.exe'))) {
  throw "Node 20 not found at $nvmDir. Run: nvm install 20; nvm use 20"
}
$env:Path = "$nvmDir;" + $env:Path
$nodeV = node -v
if ($nodeV -notlike 'v20.*') {
  throw "Activation failed - still on $nodeV"
}
Write-Output "Node $nodeV active (project runtime). npm $(npm -v)."
