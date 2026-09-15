$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$edgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$vitePath = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('twinkle-phase45-' + [guid]::NewGuid().ToString('N'))
$server = $null

function Test-LetterViewport {
  param(
    [Parameter(Mandatory)] [string] $Name,
    [Parameter(Mandatory)] [int] $Port,
    [Parameter(Mandatory)] [int] $Width,
    [Parameter(Mandatory)] [int] $Height,
    [Parameter(Mandatory)] [string] $Motion
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
  $arguments += "http://127.0.0.1:4174/?section=all&experience=off&quality=full#letter"

  $edgeProcess = Start-Process -FilePath $edgePath -ArgumentList $arguments -WindowStyle Hidden -PassThru
  try {
    $readerPath = Join-Path $PSScriptRoot 'verify-letter-layout-cdp.mjs'
    $output = & node.exe $readerPath $Port $Width $Height $Motion | Out-String
    if ($LASTEXITCODE -ne 0) {
      throw "Letter browser verification failed for $Name."
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
    '--port', '4174'
  ) -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru

  $serverReady = $false
  for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
    try {
      $response = Invoke-WebRequest -Uri 'http://127.0.0.1:4174/' -UseBasicParsing -TimeoutSec 1
      if ($response.StatusCode -eq 200) {
        $serverReady = $true
        break
      }
    } catch {
      Start-Sleep -Milliseconds 200
    }
  }
  if (-not $serverReady) {
    throw 'Vite did not become ready on port 4174.'
  }

  Test-LetterViewport -Name 'desktop-default' -Port 9341 -Width 1470 -Height 956 -Motion 'full'
  Test-LetterViewport -Name 'desktop-safe' -Port 9342 -Width 1470 -Height 850 -Motion 'full'
  Test-LetterViewport -Name 'desktop-reduced' -Port 9343 -Width 1440 -Height 900 -Motion 'reduced'
  Test-LetterViewport -Name 'mobile' -Port 9344 -Width 390 -Height 844 -Motion 'full'
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
