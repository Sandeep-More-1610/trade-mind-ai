$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$logDir = Join-Path $projectRoot '.local-run'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$javaHome = Join-Path $env:USERPROFILE '.jdk\jdk-17.0.18'
$javaExe = Join-Path $javaHome 'bin\java.exe'
if (-not (Test-Path -LiteralPath $javaExe)) { $javaExe = (Get-Command java -ErrorAction Stop).Source }
$nodeExe = (Get-Command node -ErrorAction Stop).Source
$pythonExe = Join-Path $projectRoot 'ai-service\.venv\Scripts\python.exe'
$jarPath = Join-Path $projectRoot 'backend\target\trademind-backend-1.0.0.jar'
if (-not (Test-Path -LiteralPath $jarPath)) { throw 'Build the backend with Java 17 and mvn package first.' }
if (-not (Test-Path -LiteralPath $pythonExe)) { throw 'Create ai-service/.venv and install ai-service/requirements.txt first.' }
function Start-LocalService($Port, $Name, $Exe, $ServiceArgs, $ServiceDir) {
    if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
        Write-Host "$Name already has a listener on port $Port."
        return
    }
    $process = Start-Process -FilePath $Exe -ArgumentList $ServiceArgs -WorkingDirectory $ServiceDir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir "$Name.log") -RedirectStandardError (Join-Path $logDir "$Name-error.log") -PassThru
    Add-Content -LiteralPath (Join-Path $logDir 'processes.txt') -Value "$Name=$($process.Id)"
    Write-Host "Started $Name (PID $($process.Id))."
}
$env:JWT_SECRET = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
$socketDir = Join-Path $projectRoot 'backend\.local-data\java-sockets'
New-Item -ItemType Directory -Force -Path $socketDir | Out-Null
# Keep Java's temporary socket files within the local development data directory.
Start-LocalService 8080 'backend' $javaExe @(('"-Djdk.net.unixdomain.tmpdir=' + $socketDir + '"'), '-jar', 'target/trademind-backend-1.0.0.jar', '--spring.profiles.active=dev') (Join-Path $projectRoot 'backend')
Start-LocalService 5000 'ai-service' $pythonExe @('-m','flask','--app','app','run','--host','127.0.0.1','--port','5000') (Join-Path $projectRoot 'ai-service')
$env:BROWSER = 'none'
$env:HOST = '127.0.0.1'
$env:PORT = '3000'
Start-LocalService 3000 'frontend' $nodeExe @('node_modules/react-scripts/bin/react-scripts.js','start') (Join-Path $projectRoot 'frontend')
Write-Host 'Open http://localhost:3000 after the services finish starting.'
Write-Host "Logs: $logDir"
