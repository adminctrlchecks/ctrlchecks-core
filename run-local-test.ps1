# ============================================
# Run Backend and CtrlChecks Locally
# Tests fine-tuned model output
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CtrlChecks Local Testing Environment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Get project root
$projectRoot = $PWD
$fastApiPath = Join-Path $projectRoot "Fast_API_Ollama"
$workerPath = Join-Path $projectRoot "worker"
$frontendPath = Join-Path $projectRoot "ctrl_checks"

# ============================================
# Step 1: Check Prerequisites
# ============================================
Write-Host "🔍 Step 1: Checking Prerequisites..." -ForegroundColor Yellow
Write-Host ""

# Check Ollama
Write-Host "   Checking Ollama..." -ForegroundColor Gray
try {
    $ollamaCheck = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method GET -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   ✅ Ollama is running on localhost:11434" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Ollama is NOT running!" -ForegroundColor Red
    Write-Host "   Please start Ollama first: ollama serve" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Check if fine-tuned model exists
Write-Host "   Checking for fine-tuned model..." -ForegroundColor Gray
try {
    $models = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 3
    $fineTunedModel = "ctrlchecks-workflow-builder"
    $modelExists = $models.models | Where-Object { $_.name -like "*$fineTunedModel*" }
    if ($modelExists) {
        Write-Host "   ✅ Fine-tuned model found: $($modelExists.name)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Fine-tuned model '$fineTunedModel' not found" -ForegroundColor Yellow
        Write-Host "   Available models:" -ForegroundColor Gray
        foreach ($model in $models.models) {
            Write-Host "      - $($model.name)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ⚠️  Could not check models" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# Step 2: Check Environment Configuration
# ============================================
Write-Host "🔧 Step 2: Checking Environment Configuration..." -ForegroundColor Yellow
Write-Host ""

# Check worker .env
$workerEnvPath = Join-Path $workerPath ".env"
if (-not (Test-Path $workerEnvPath)) {
    $workerEnvPath = Join-Path $workerPath "env"
}

if (Test-Path $workerEnvPath) {
    Write-Host "   Reading worker environment..." -ForegroundColor Gray
    $workerEnv = Get-Content $workerEnvPath -Raw
    
    # Check fine-tuned model config
    if ($workerEnv -match "USE_FINE_TUNED_MODEL=(true|false)") {
        $useFineTuned = $matches[1]
        if ($useFineTuned -eq "true") {
            Write-Host "   ✅ Fine-tuned model is ENABLED" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Fine-tuned model is DISABLED" -ForegroundColor Yellow
        }
    }
    
    # Check model name
    if ($workerEnv -match "FINE_TUNED_MODEL=([^\r\n]+)") {
        $modelName = $matches[1]
        Write-Host "   📝 Fine-tuned model name: $modelName" -ForegroundColor Cyan
    }
    
    # Check Ollama URL (should be localhost for local testing)
    if ($workerEnv -match "OLLAMA_BASE_URL=([^\r\n]+)") {
        $ollamaUrl = $matches[1]
        if ($ollamaUrl -like "*localhost*" -or $ollamaUrl -like "*127.0.0.1*") {
            Write-Host "   ✅ Ollama URL configured for local: $ollamaUrl" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Ollama URL points to remote: $ollamaUrl" -ForegroundColor Yellow
            Write-Host "      (Should be http://localhost:11434 for local testing)" -ForegroundColor Gray
            Write-Host ""
            $fixUrl = Read-Host "   Fix Ollama URL to localhost? (Y/N)"
            if ($fixUrl -eq "Y" -or $fixUrl -eq "y") {
                $workerEnv = $workerEnv -replace "OLLAMA_HOST=([^\r\n]+)", "OLLAMA_HOST=http://localhost:11434"
                $workerEnv = $workerEnv -replace "OLLAMA_BASE_URL=([^\r\n]+)", "OLLAMA_BASE_URL=http://localhost:11434"
                $workerEnv = $workerEnv -replace "FASTAPI_OLLAMA_URL=([^\r\n]+)", "FASTAPI_OLLAMA_URL=http://localhost:8000"
                Set-Content -Path $workerEnvPath -Value $workerEnv -NoNewline
                Write-Host "   ✅ Updated Ollama URLs to localhost" -ForegroundColor Green
            }
        }
    }
} else {
    Write-Host "   ⚠️  Worker .env file not found at: $workerEnvPath" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# Step 3: Check if Services are Already Running
# ============================================
Write-Host "🔍 Step 3: Checking Running Services..." -ForegroundColor Yellow
Write-Host ""

$services = @(
    @{Name="Fast_API_Ollama"; Port=8000},
    @{Name="Worker"; Port=3001},
    @{Name="Frontend"; Port=8080}
)

$runningServices = @()
foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$($service.Port)" -Method GET -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        Write-Host "   ⚠️  $($service.Name) is already running on port $($service.Port)" -ForegroundColor Yellow
        $runningServices += $service.Name
    } catch {
        Write-Host "   ✅ Port $($service.Port) is free for $($service.Name)" -ForegroundColor Green
    }
}

if ($runningServices.Count -gt 0) {
    Write-Host ""
    Write-Host "   ⚠️  Some services are already running. They will be reused." -ForegroundColor Yellow
    Write-Host ""
}

# ============================================
# Step 4: Start Services
# ============================================
Write-Host "🚀 Step 4: Starting Services..." -ForegroundColor Yellow
Write-Host ""

# Start Fast_API_Ollama
if ("Fast_API_Ollama" -notin $runningServices) {
    Write-Host "   1️⃣  Starting Fast_API_Ollama (Backend) on port 8000..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$fastApiPath'; Write-Host '🚀 Fast_API_Ollama Backend Starting...' -ForegroundColor Green; Write-Host 'Port: 8000' -ForegroundColor Cyan; Write-Host 'Ollama: http://localhost:11434' -ForegroundColor Cyan; Write-Host ''; if (Test-Path 'venv\Scripts\Activate.ps1') { .\venv\Scripts\Activate.ps1 }; uvicorn main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal
    Start-Sleep -Seconds 3
} else {
    Write-Host "   1️⃣  Fast_API_Ollama already running" -ForegroundColor Gray
}

# Start Worker
if ("Worker" -notin $runningServices) {
    Write-Host "   2️⃣  Starting Worker on port 3001..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workerPath'; Write-Host '🚀 Worker Service Starting...' -ForegroundColor Green; Write-Host 'Port: 3001' -ForegroundColor Cyan; Write-Host 'Ollama: http://localhost:11434' -ForegroundColor Cyan; Write-Host ''; npm run dev" -WindowStyle Normal
    Start-Sleep -Seconds 3
} else {
    Write-Host "   2️⃣  Worker already running" -ForegroundColor Gray
}

# Start Frontend
if ("Frontend" -notin $runningServices) {
    Write-Host "   3️⃣  Starting CtrlChecks Frontend on port 8080..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '🚀 CtrlChecks Frontend Starting...' -ForegroundColor Green; Write-Host 'Port: 8080' -ForegroundColor Cyan; Write-Host ''; npm run dev" -WindowStyle Normal
    Start-Sleep -Seconds 2
} else {
    Write-Host "   3️⃣  Frontend already running" -ForegroundColor Gray
}

Write-Host ""

# ============================================
# Step 5: Wait and Verify Services
# ============================================
Write-Host "⏳ Step 5: Waiting for services to start (15 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "🔍 Verifying services..." -ForegroundColor Yellow
Write-Host ""

$allRunning = $true
foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$($service.Port)" -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-Host "   ✅ $($service.Name) is running on http://localhost:$($service.Port)" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  $($service.Name) may not be ready yet on port $($service.Port)" -ForegroundColor Yellow
        $allRunning = $false
    }
}

Write-Host ""

# ============================================
# Step 6: Display Testing Instructions
# ============================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Services Started!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Service URLs:" -ForegroundColor Cyan
Write-Host "   - Fast_API_Ollama Backend: http://localhost:8000" -ForegroundColor White
Write-Host "   - Worker Service:          http://localhost:3001" -ForegroundColor White
Write-Host "   - CtrlChecks Frontend:     http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Testing Fine-Tuned Model:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   1. Open http://localhost:8080 in your browser" -ForegroundColor White
Write-Host "   2. Create a new workflow or test an existing one" -ForegroundColor White
Write-Host "   3. Check the workflow output quality" -ForegroundColor White
Write-Host ""
Write-Host "📝 If Results Are Not Accurate:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Option 1: Adjust Fine-Tuned Model Settings" -ForegroundColor Cyan
Write-Host "   - Edit: worker\.env (or worker\.env)" -ForegroundColor Gray
Write-Host "   - Change: USE_FINE_TUNED_MODEL=true/false" -ForegroundColor Gray
Write-Host "   - Change: FINE_TUNED_MODEL=your-model-name" -ForegroundColor Gray
Write-Host "   - Restart Worker service" -ForegroundColor Gray
Write-Host ""
Write-Host "   Option 2: Modify Model Selection Logic" -ForegroundColor Cyan
Write-Host "   - File: worker\src\services\ai\ollama-orchestrator.ts" -ForegroundColor Gray
Write-Host "   - Method: selectOptimalModel() (around line 274)" -ForegroundColor Gray
Write-Host ""
Write-Host "   Option 3: Adjust Workflow Generation Prompts" -ForegroundColor Cyan
Write-Host "   - File: worker\src\services\ai\workflow-builder.ts" -ForegroundColor Gray
Write-Host "   - Modify system prompts and generation logic" -ForegroundColor Gray
Write-Host ""
Write-Host "   Option 4: Update Training Data" -ForegroundColor Cyan
Write-Host "   - File: worker\data\workflow_training_dataset_100.json" -ForegroundColor Gray
Write-Host "   - Add more examples, then retrain model" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 Quick Commands:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   # Test backend health" -ForegroundColor Gray
Write-Host "   Invoke-RestMethod -Uri http://localhost:8000/health" -ForegroundColor White
Write-Host ""
Write-Host "   # Test worker health" -ForegroundColor Gray
Write-Host "   Invoke-RestMethod -Uri http://localhost:3001/health" -ForegroundColor White
Write-Host ""
Write-Host "   # List Ollama models" -ForegroundColor Gray
Write-Host "   Invoke-RestMethod -Uri http://localhost:11434/api/tags" -ForegroundColor White
Write-Host ""
Write-Host "   # Test fine-tuned model directly" -ForegroundColor Gray
Write-Host "   ollama run ctrlchecks-workflow-builder 'Create a workflow to send daily emails'" -ForegroundColor White
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
