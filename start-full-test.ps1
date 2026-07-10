# ============================================
# Start Full Application for Testing
# Worker (Local) + Frontend (Local) + AWS Ollama
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Starting Full Application for Testing" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PWD
$workerPath = Join-Path $projectRoot "worker"
$frontendPath = Join-Path $projectRoot "ctrl_checks"

# ============================================
# Step 1: Check Configuration
# ============================================
Write-Host "[STEP 1] Checking Configuration..." -ForegroundColor Yellow
Write-Host ""

# Check Worker env
$workerEnvPath = Join-Path $workerPath ".env"
if (-not (Test-Path $workerEnvPath)) {
    $workerEnvPath = Join-Path $workerPath "env"
}

if (Test-Path $workerEnvPath) {
    $workerEnv = Get-Content $workerEnvPath -Raw
    
    # Check Ollama URL
    if ($workerEnv -match "OLLAMA_BASE_URL=(.+)") {
        $ollamaUrl = ($matches[1] -split "`r?`n")[0].Trim()
        Write-Host "   Worker Ollama URL: $ollamaUrl" -ForegroundColor Cyan
    }
    
    # Check fine-tuned model
    if ($workerEnv -match "USE_FINE_TUNED_MODEL=(true|false)") {
        $useFineTuned = ($matches[1] -split "`r?`n")[0].Trim()
        if ($useFineTuned -eq "true") {
            Write-Host "   [OK] Fine-tuned model is ENABLED" -ForegroundColor Green
        } else {
            Write-Host "   [WARNING] Fine-tuned model is DISABLED" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "   [WARNING] Worker .env file not found" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# Step 2: Check Services
# ============================================
Write-Host "[STEP 2] Checking Running Services..." -ForegroundColor Yellow
Write-Host ""

$workerPort = 3001
$frontendPort = 8080

try {
    $workerCheck = Invoke-WebRequest -Uri "http://localhost:$workerPort/health" -Method GET -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   [OK] Worker is already running on port $workerPort" -ForegroundColor Green
    $workerRunning = $true
} catch {
    Write-Host "   [INFO] Worker is not running on port $workerPort" -ForegroundColor Gray
    $workerRunning = $false
}

try {
    $frontendCheck = Invoke-WebRequest -Uri "http://localhost:$frontendPort" -Method GET -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   [OK] Frontend is already running on port $frontendPort" -ForegroundColor Green
    $frontendRunning = $true
} catch {
    Write-Host "   [INFO] Frontend is not running on port $frontendPort" -ForegroundColor Gray
    $frontendRunning = $false
}

Write-Host ""

# ============================================
# Step 3: Start Worker
# ============================================
if (-not $workerRunning) {
    Write-Host "[STEP 3] Starting Worker Service..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Starting Worker on port $workerPort..." -ForegroundColor Cyan
    Write-Host "   Connecting to AWS Ollama..." -ForegroundColor Cyan
    Write-Host ""
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workerPath'; Write-Host '[WORKER] Starting Worker Service...' -ForegroundColor Green; Write-Host 'Port: $workerPort' -ForegroundColor Cyan; Write-Host 'Ollama: AWS (ollama.ctrlchecks.ai:8000)' -ForegroundColor Cyan; Write-Host ''; npm run dev" -WindowStyle Normal
    
    Write-Host "   Waiting 20 seconds for Worker to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 20
    
    # Verify
    try {
        $workerCheck = Invoke-WebRequest -Uri "http://localhost:$workerPort/health" -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-Host "   [OK] Worker is now running!" -ForegroundColor Green
    } catch {
        Write-Host "   [WARNING] Worker may still be starting. Check the Worker window." -ForegroundColor Yellow
    }
} else {
    Write-Host "[OK] Worker is already running." -ForegroundColor Green
}

Write-Host ""

# ============================================
# Step 4: Start Frontend
# ============================================
if (-not $frontendRunning) {
    Write-Host "[STEP 4] Starting Frontend..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Starting Frontend on port $frontendPort..." -ForegroundColor Cyan
    Write-Host ""
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '[FRONTEND] Starting CtrlChecks Frontend...' -ForegroundColor Green; Write-Host 'Port: $frontendPort' -ForegroundColor Cyan; Write-Host 'Worker: http://localhost:$workerPort' -ForegroundColor Cyan; Write-Host ''; npm run dev" -WindowStyle Normal
    
    Write-Host "   Waiting 15 seconds for Frontend to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    
    Write-Host "   [OK] Frontend should be starting!" -ForegroundColor Green
} else {
    Write-Host "[OK] Frontend is already running." -ForegroundColor Green
}

Write-Host ""

# ============================================
# Step 5: Verify Setup
# ============================================
Write-Host "[STEP 5] Verifying Setup..." -ForegroundColor Yellow
Write-Host ""

# Test Worker
try {
    $workerHealth = Invoke-RestMethod -Uri "http://localhost:$workerPort/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   [OK] Worker is responding" -ForegroundColor Green
} catch {
    Write-Host "   [WARNING] Worker may not be ready yet" -ForegroundColor Yellow
}

# Test AWS Ollama (via Worker or direct)
try {
    $ollamaHealth = Invoke-RestMethod -Uri "http://ollama.ctrlchecks.ai:8000/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   [OK] AWS Ollama is accessible" -ForegroundColor Green
} catch {
    Write-Host "   [WARNING] Could not reach AWS Ollama" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# Summary
# ============================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Service URLs:" -ForegroundColor Cyan
Write-Host "   - Frontend:  http://localhost:$frontendPort" -ForegroundColor White
Write-Host "   - Worker:    http://localhost:$workerPort" -ForegroundColor White
Write-Host "   - AWS Ollama: http://ollama.ctrlchecks.ai:8000" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Testing Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   1. Open http://localhost:$frontendPort in your browser" -ForegroundColor White
Write-Host "   2. Login/Sign Up (if required)" -ForegroundColor White
Write-Host "   3. Create a new workflow" -ForegroundColor White
Write-Host "   4. Test with different prompts:" -ForegroundColor White
Write-Host "      - Similar to training data: 'Send daily email report'" -ForegroundColor Gray
Write-Host "      - Partially similar: 'Automate invoice generation'" -ForegroundColor Gray
Write-Host "      - Completely new: 'Monitor IoT sensors and alert'" -ForegroundColor Gray
Write-Host "   5. Check Worker logs for:" -ForegroundColor White
Write-Host "      - '🎯 Using fine-tuned model'" -ForegroundColor Gray
Write-Host "      - '📚 Using 100-example training dataset'" -ForegroundColor Gray
Write-Host ""
Write-Host "🔍 What to Check:" -ForegroundColor Cyan
Write-Host "   - Are workflows generated successfully?" -ForegroundColor White
Write-Host "   - Are nodes selected correctly?" -ForegroundColor White
Write-Host "   - Are connections logical?" -ForegroundColor White
Write-Host "   - Do results match expectations?" -ForegroundColor White
Write-Host ""
Write-Host "📝 If Results Need Adjustment:" -ForegroundColor Cyan
Write-Host "   - Use: .\adjust-fine-tuning.ps1" -ForegroundColor White
Write-Host "   - Check: worker\HOW_FINE_TUNING_WORKS.md" -ForegroundColor White
Write-Host "   - Modify: worker\src\services\ai\workflow-builder.ts" -ForegroundColor White
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
