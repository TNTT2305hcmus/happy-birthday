$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$edgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$vitePath = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('twinkle-r0-' + [guid]::NewGuid().ToString('N'))
$server = $null

function Test-BaselineViewport {
  param(
    [Parameter(Mandatory)] [string] $Name,
    [Parameter(Mandatory)] [int] $Port,
    [Parameter(Mandatory)] [int] $Width,
    [Parameter(Mandatory)] [int] $Height,
    [Parameter(Mandatory)] [string] $Motion,
    [Parameter(Mandatory)] [bool] $IncludeIntro
  )

  $profilePath = Join-Path $tempRoot $Name
  New-Item -ItemType Directory -Path $profilePath | Out-Null
  $arguments = @(
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-breakpad',
    '--disable-crash-reporter',
    '--force-device-scale-factor=1',
    "--remote-debugging-port=$Port",
    "--user-data-dir=$profilePath",
    "--window-size=$Width,$Height"
  )
  if ($Motion -eq 'reduced') {
    $arguments += '--force-prefers-reduced-motion=reduce'
  }
  $url = if ($IncludeIntro) {
    'http://127.0.0.1:4175/?quality=full'
  } else {
    'http://127.0.0.1:4175/?experience=off&quality=full'
  }
  $arguments += $url

  $edgeProcess = Start-Process -FilePath $edgePath -ArgumentList $arguments -WindowStyle Hidden -PassThru
  try {
    $readerPath = Join-Path $PSScriptRoot 'verify-refinement-r0-cdp.mjs'
    $introMode = if ($IncludeIntro) { 'intro' } else { 'skip' }
    $output = & node.exe $readerPath $Port $Width $Height $Motion $introMode | Out-String
    if ($LASTEXITCODE -ne 0) {
      throw "R0 browser verification failed for $Name."
    }
    Write-Output "$Name $output"
  } finally {
    if (-not $edgeProcess.HasExited) {
      Stop-Process -Id $edgeProcess.Id -Force
      Wait-Process -Id $edgeProcess.Id -Timeout 5 -ErrorAction SilentlyContinue
    }
  }
}

try {
  if (-not (Test-Path -LiteralPath $edgePath)) {
    throw "Microsoft Edge was not found at $edgePath"
  }

  New-Item -ItemType Directory -Path $tempRoot | Out-Null
  $server = Start-Process -FilePath 'node.exe' -ArgumentList @(
    $vitePath,
    '--host', '127.0.0.1',
    '--port', '4175'
  ) -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru

  $serverReady = $false
  for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
    try {
      $response = Invoke-WebRequest -Uri 'http://127.0.0.1:4175/' -UseBasicParsing -TimeoutSec 1
      if ($response.StatusCode -eq 200) {
        $serverReady = $true
        break
      }
    } catch {
      Start-Sleep -Milliseconds 200
    }
  }
  if (-not $serverReady) {
    throw 'Vite did not become ready on port 4175.'
  }

  Test-BaselineViewport -Name 'desktop-default' -Port 9351 -Width 1470 -Height 956 -Motion 'full' -IncludeIntro $false
  Test-BaselineViewport -Name 'desktop-safe-journey' -Port 9352 -Width 1470 -Height 850 -Motion 'full' -IncludeIntro $true
  Test-BaselineViewport -Name 'desktop-reduced' -Port 9353 -Width 1440 -Height 900 -Motion 'reduced' -IncludeIntro $false
  Test-BaselineViewport -Name 'mobile' -Port 9354 -Width 390 -Height 844 -Motion 'full' -IncludeIntro $false
} finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
  }
  if (Test-Path -LiteralPath $tempRoot) {
    $resolvedTemp = [IO.Path]::GetFullPath($tempRoot)
    $systemTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if (-not $resolvedTemp.StartsWith($systemTemp, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing to remove non-temp path: $resolvedTemp"
    }
    for ($cleanupAttempt = 0; $cleanupAttempt -lt 6; $cleanupAttempt += 1) {
      try {
        Remove-Item -LiteralPath $resolvedTemp -Recurse -Force -ErrorAction Stop
        break
      } catch {
        if ($cleanupAttempt -eq 5) { throw }
        Start-Sleep -Milliseconds 300
      }
    }
  }
}
