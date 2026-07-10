# ============================================
# Quick Adjust Fine-Tuning Configuration
# Use this if fine-tuning results are not accurate
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Adjust Fine-Tuning Configuration" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$workerPath = Join-Path $PWD "worker"
$envPath = Join-Path $workerPath ".env"

# Check if .env exists, otherwise use 'env'
if (-not (Test-Path $envPath)) {
    $envPath = Join-Path $workerPath "env"
}

if (-not (Test-Path $envPath)) {
    Write-Host "❌ Environment file not found at: $envPath" -ForegroundColor Red
    Write-Host "   Please create it first or check the path." -ForegroundColor Yellow
    exit 1
}

Write-Host "📝 Current Configuration:" -ForegroundColor Yellow
Write-Host ""
$envContent = Get-Content $envPath -Raw

# Display current settings
if ($envContent -match "USE_FINE_TUNED_MODEL=([^\r\n]+)") {
    Write-Host "   USE_FINE_TUNED_MODEL = $($matches[1])" -ForegroundColor Cyan
} else {
    Write-Host "   USE_FINE_TUNED_MODEL = (not set)" -ForegroundColor Gray
}

if ($envContent -match "FINE_TUNED_MODEL=([^\r\n]+)") {
    Write-Host "   FINE_TUNED_MODEL = $($matches[1])" -ForegroundColor Cyan
} else {
    Write-Host "   FINE_TUNED_MODEL = (not set)" -ForegroundColor Gray
}

if ($envContent -match "OLLAMA_HOST=([^\r\n]+)") {
    Write-Host "   OLLAMA_HOST = $($matches[1])" -ForegroundColor Cyan
} else {
    Write-Host "   OLLAMA_HOST = (not set)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "What would you like to do?" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Enable/Disable fine-tuned model" -ForegroundColor White
Write-Host "   2. Change fine-tuned model name" -ForegroundColor White
Write-Host "   3. Switch to localhost Ollama (for local testing)" -ForegroundColor White
Write-Host "   4. Switch to remote Ollama (for production)" -ForegroundColor White
Write-Host "   5. View all fine-tuning related settings" -ForegroundColor White
Write-Host "   6. Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-6)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Enable or disable fine-tuned model?" -ForegroundColor Yellow
        Write-Host "   1. Enable (USE_FINE_TUNED_MODEL=true)" -ForegroundColor White
        Write-Host "   2. Disable (USE_FINE_TUNED_MODEL=false)" -ForegroundColor White
        $enableChoice = Read-Host "Enter choice (1-2)"
        
        if ($enableChoice -eq "1") {
            $newValue = "true"
        } else {
            $newValue = "false"
        }
        
        if ($envContent -match "USE_FINE_TUNED_MODEL=([^\r\n]+)") {
            $envContent = $envContent -replace "USE_FINE_TUNED_MODEL=([^\r\n]+)", "USE_FINE_TUNED_MODEL=$newValue"
        } else {
            # Add new line
            $envContent += "`nUSE_FINE_TUNED_MODEL=$newValue`n"
        }
        
        Set-Content -Path $envPath -Value $envContent -NoNewline
        Write-Host "✅ Updated USE_FINE_TUNED_MODEL=$newValue" -ForegroundColor Green
    }
    
    "2" {
        Write-Host ""
        $currentModel = if ($envContent -match "FINE_TUNED_MODEL=([^\r\n]+)") { $matches[1] } else { "ctrlchecks-workflow-builder" }
        Write-Host "Current model name: $currentModel" -ForegroundColor Cyan
        $newModel = Read-Host "Enter new model name (or press Enter to keep current)"
        
        if ([string]::IsNullOrWhiteSpace($newModel)) {
            $newModel = $currentModel
        }
        
        if ($envContent -match "FINE_TUNED_MODEL=([^\r\n]+)") {
            $envContent = $envContent -replace "FINE_TUNED_MODEL=([^\r\n]+)", "FINE_TUNED_MODEL=$newModel"
        } else {
            $envContent += "`nFINE_TUNED_MODEL=$newModel`n"
        }
        
        Set-Content -Path $envPath -Value $envContent -NoNewline
        Write-Host "✅ Updated FINE_TUNED_MODEL=$newModel" -ForegroundColor Green
    }
    
    "3" {
        Write-Host ""
        Write-Host "Switching to localhost Ollama..." -ForegroundColor Yellow
        
        # Update OLLAMA_HOST
        if ($envContent -match "OLLAMA_HOST=([^\r\n]+)") {
            $envContent = $envContent -replace "OLLAMA_HOST=([^\r\n]+)", "OLLAMA_HOST=http://localhost:11434"
        } else {
            $envContent += "`nOLLAMA_HOST=http://localhost:11434`n"
        }
        
        # Update OLLAMA_BASE_URL
        if ($envContent -match "OLLAMA_BASE_URL=([^\r\n]+)") {
            $envContent = $envContent -replace "OLLAMA_BASE_URL=([^\r\n]+)", "OLLAMA_BASE_URL=http://localhost:11434"
        } else {
            $envContent += "`nOLLAMA_BASE_URL=http://localhost:11434`n"
        }
        
        # Update FASTAPI_OLLAMA_URL (for local, use FastAPI on localhost:8000)
        if ($envContent -match "FASTAPI_OLLAMA_URL=([^\r\n]+)") {
            $envContent = $envContent -replace "FASTAPI_OLLAMA_URL=([^\r\n]+)", "FASTAPI_OLLAMA_URL=http://localhost:8000"
        } else {
            $envContent += "`nFASTAPI_OLLAMA_URL=http://localhost:8000`n"
        }
        
        Set-Content -Path $envPath -Value $envContent -NoNewline
        Write-Host "✅ Updated Ollama URLs to localhost" -ForegroundColor Green
    }
    
    "4" {
        Write-Host ""
        Write-Host "Switching to remote Ollama..." -ForegroundColor Yellow
        $remoteUrl = Read-Host "Enter remote Ollama URL (e.g., http://ollama.ctrlchecks.ai:8000)"
        
        if ([string]::IsNullOrWhiteSpace($remoteUrl)) {
            $remoteUrl = "http://ollama.ctrlchecks.ai:8000"
        }
        
        # Update OLLAMA_HOST
        if ($envContent -match "OLLAMA_HOST=([^\r\n]+)") {
            $envContent = $envContent -replace "OLLAMA_HOST=([^\r\n]+)", "OLLAMA_HOST=$remoteUrl"
        } else {
            $envContent += "`nOLLAMA_HOST=$remoteUrl`n"
        }
        
        # Update OLLAMA_BASE_URL
        if ($envContent -match "OLLAMA_BASE_URL=([^\r\n]+)") {
            $envContent = $envContent -replace "OLLAMA_BASE_URL=([^\r\n]+)", "OLLAMA_BASE_URL=$remoteUrl"
        } else {
            $envContent += "`nOLLAMA_BASE_URL=$remoteUrl`n"
        }
        
        # Update FASTAPI_OLLAMA_URL
        if ($envContent -match "FASTAPI_OLLAMA_URL=([^\r\n]+)") {
            $envContent = $envContent -replace "FASTAPI_OLLAMA_URL=([^\r\n]+)", "FASTAPI_OLLAMA_URL=$remoteUrl"
        } else {
            $envContent += "`nFASTAPI_OLLAMA_URL=$remoteUrl`n"
        }
        
        Set-Content -Path $envPath -Value $envContent -NoNewline
        Write-Host "✅ Updated Ollama URLs to $remoteUrl" -ForegroundColor Green
    }
    
    "5" {
        Write-Host ""
        Write-Host "📋 All Fine-Tuning Related Settings:" -ForegroundColor Cyan
        Write-Host ""
        
        $lines = Get-Content $envPath
        $relevantLines = $lines | Where-Object { 
            $_ -match "FINE_TUNED|BASE_MODEL|OLLAMA|USE_FINE" 
        }
        
        if ($relevantLines) {
            foreach ($line in $relevantLines) {
                Write-Host "   $line" -ForegroundColor White
            }
        } else {
            Write-Host "   No fine-tuning settings found" -ForegroundColor Gray
        }
    }
    
    "6" {
        Write-Host "Exiting..." -ForegroundColor Yellow
        exit 0
    }
    
    default {
        Write-Host "Invalid choice. Exiting..." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "⚠️  IMPORTANT: Restart the Worker service for changes to take effect!" -ForegroundColor Yellow
Write-Host ""
Write-Host "   If Worker is running, stop it (Ctrl+C) and restart with:" -ForegroundColor Gray
Write-Host "   cd worker" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
