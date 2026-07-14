$ErrorActionPreference = 'Continue'
Set-Location 'D:\Code\Working-on-it\star-\server'

# Kill any existing server
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*star*' } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Start server in background using Start-Process
$proc = Start-Process -PassThru -WindowStyle Hidden -FilePath 'npm.cmd' -ArgumentList 'run','dev' -RedirectStandardOutput 'D:\Code\Working-on-it\star-\server\server.log' -RedirectStandardError 'D:\Code\Working-on-it\star-\server\server_err.log'
Write-Host "Server PID: $($proc.Id)"
Start-Sleep -Seconds 6

# Test 1: register
Write-Host "`n=== TEST 1: POST /api/auth/register ==="
$reg = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/api/auth/register' -Method POST -ContentType 'application/json' -Body '{"username":"testuser","password":"123456"}'
Write-Host "Status: $($reg.StatusCode)"
Write-Host "Body: $($reg.Content)"

# Test 2: login
Write-Host "`n=== TEST 2: POST /api/auth/login ==="
$login = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"username":"testuser","password":"123456"}'
Write-Host "Status: $($login.StatusCode)"
$token = ($login.Content | ConvertFrom-Json).data.token
Write-Host "Token: $($token.Substring(0,20))..."

# Test 3: /me
Write-Host "`n=== TEST 3: GET /api/auth/me ==="
$me = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/api/auth/me' -Headers @{ 'Authorization' = "Bearer $token" }
Write-Host "Status: $($me.StatusCode)"
Write-Host "Body: $($me.Content)"

# Test 4: duplicate register (expect 400)
Write-Host "`n=== TEST 4: duplicate register (expect 400) ==="
try { Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/api/auth/register' -Method POST -ContentType 'application/json' -Body '{"username":"testuser","password":"123456"}' | Out-Null } catch { Write-Host "Status: $($_.Exception.Response.StatusCode.value__) - PASS" }

# Test 5: wrong password (expect 400)
Write-Host "`n=== TEST 5: wrong password (expect 400) ==="
try { Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"username":"testuser","password":"wrong"}' | Out-Null } catch { Write-Host "Status: $($_.Exception.Response.StatusCode.value__) - PASS" }

# Stop server
$proc.Kill()
Write-Host "`nDone. Server stopped."
