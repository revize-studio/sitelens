# sitelens installer for Windows (PowerShell):
#   irm https://sitelens.pl/install.ps1 | iex
# Puts Node.js (from nodejs.org, checksum verified) and sitelens in %LOCALAPPDATA%\sitelens and
# adds its bin folder to the user PATH. No administrator rights needed.
# Uninstall: delete %LOCALAPPDATA%\sitelens and remove it from the user PATH.
# Runs in its own scope, so `iex` leaves the caller's PowerShell settings as they were
& {
  $ErrorActionPreference = 'Stop'
  # The progress bar makes Invoke-WebRequest many times slower in Windows PowerShell 5.1
  $ProgressPreference = 'SilentlyContinue'
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

  $polish = (Get-UICulture).Name -like 'pl*'
  function Say([string]$pl, [string]$en) { if ($polish) { Write-Host $pl } else { Write-Host $en } }
  function Fail([string]$pl, [string]$en) { if ($polish) { throw "sitelens: $pl" } else { throw "sitelens: $en" } }

  $root = if ($env:SITELENS_HOME) { $env:SITELENS_HOME } else { Join-Path $env:LOCALAPPDATA 'sitelens' }
  $package = if ($env:SITELENS_PACKAGE) { $env:SITELENS_PACKAGE } else { 'sitelens@latest' }
  $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
  $dist = 'https://nodejs.org/dist/latest-v24.x'

  Say 'Pobieram Node.js…' 'Downloading Node.js…'
  $sums = (Invoke-WebRequest -UseBasicParsing "$dist/SHASUMS256.txt").Content
  $line = ($sums -split "`n") | Where-Object { $_ -match "node-v[\d.]+-win-$arch\.zip\s*$" } | Select-Object -First 1
  if (-not $line) { Fail "nodejs.org nie ma Node.js dla win-$arch." "nodejs.org has no Node.js build for win-$arch." }
  $expected, $archive = $line.Trim() -split '\s+'

  $tmp = Join-Path ([IO.Path]::GetTempPath()) ('sitelens-' + [Guid]::NewGuid())
  New-Item -ItemType Directory -Path $tmp | Out-Null
  try {
    $zip = Join-Path $tmp $archive
    Invoke-WebRequest -UseBasicParsing "$dist/$archive" -OutFile $zip
    if ((Get-FileHash $zip -Algorithm SHA256).Hash.ToLower() -ne $expected) {
      Fail 'suma kontrolna Node.js się nie zgadza, przerwano.' 'the Node.js checksum does not match, stopped.'
    }
    # Expand-Archive takes minutes on the thousands of files in the Node.js archive
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::ExtractToDirectory($zip, $tmp)
    New-Item -ItemType Directory -Path $root -Force | Out-Null
    $nodeDir = Join-Path $root 'node'
    if (Test-Path $nodeDir) { Remove-Item $nodeDir -Recurse -Force }
    Move-Item (Join-Path $tmp ($archive -replace '\.zip$', '')) $nodeDir
  } finally {
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
  }

  Say 'Instaluję sitelens…' 'Installing sitelens…'
  $env:Path = "$nodeDir;$env:Path"
  & (Join-Path $nodeDir 'npm.cmd') install --global --prefix $root --no-fund --no-audit --no-update-notifier --loglevel=error $package | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail 'npm nie zainstalował sitelens.' 'npm could not install sitelens.' }

  # A .cmd launcher works in cmd and PowerShell alike and is not blocked by the script execution policy
  $bin = Join-Path $root 'bin'
  New-Item -ItemType Directory -Path $bin -Force | Out-Null
  $launcherRoot = if ($env:SITELENS_HOME) { $root } else { '%LOCALAPPDATA%\sitelens' }
  Set-Content -Path (Join-Path $bin 'sitelens.cmd') -Encoding Ascii -Value @(
    '@echo off',
    "`"$launcherRoot\node\node.exe`" `"$launcherRoot\node_modules\sitelens\dist\cli.js`" %*"
  )

  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  if (-not (($userPath -split ';') -contains $bin)) {
    [Environment]::SetEnvironmentVariable('Path', (@($bin, $userPath) | Where-Object { $_ }) -join ';', 'User')
  }
  $env:Path = "$bin;$env:Path"

  Say '' ''
  Say 'Gotowe. Otwórz nowe okno terminala i wpisz:' 'Done. Open a new terminal window and type:'
  Say '  sitelens https://twojastrona.pl' '  sitelens https://yourwebsite.com --lang en'
}
