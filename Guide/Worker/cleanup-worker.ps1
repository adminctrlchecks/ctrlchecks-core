# cleanup-worker.ps1
# Script to clean up CtrlChecks Worker deployment completely

param(
    [string]$Region = "us-east-1",
    [switch]$Force = $false
)

Write-Host "==========================================" -ForegroundColor Red
Write-Host "COMPLETE CLEANUP - CtrlChecks Worker" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Red
Write-Host ""

if (-not $Force) {
    $confirm = Read-Host "This will DELETE ALL Worker resources. Type 'DELETE' to continue"
    if ($confirm -ne "DELETE") {
        Write-Host "Cleanup cancelled." -ForegroundColor Yellow
        exit
    }
}

Write-Host "Starting cleanup process..." -ForegroundColor Yellow
Write-Host ""

# Step 1: Find and terminate instance
Write-Host "[1/5] Finding EC2 instance..." -ForegroundColor Cyan
$instances = aws ec2 describe-instances `
    --region $Region `
    --filters "Name=tag:Name,Values=ctrlchecks-worker" `
    --query "Reservations[*].Instances[*].[InstanceId,PublicIpAddress,State.Name]" `
    --output json | ConvertFrom-Json

$instanceId = $null
if ($instances.Count -gt 0 -and $instances[0].Count -gt 0) {
    $instanceId = $instances[0][0][0]
    $instanceState = $instances[0][0][2]
    $instanceIp = $instances[0][0][1]
    Write-Host "  Found instance: $instanceId" -ForegroundColor Green
    Write-Host "  State: $instanceState" -ForegroundColor Green
    Write-Host "  IP: $instanceIp" -ForegroundColor Green
} else {
    Write-Host "  No instance found with name 'ctrlchecks-worker'" -ForegroundColor Yellow
}

# Step 2: Find and release Elastic IP
Write-Host "`n[2/5] Finding Elastic IP..." -ForegroundColor Cyan
$allocationId = $null
if ($instanceId) {
    $eipInfo = aws ec2 describe-addresses `
        --region $Region `
        --filters "Name=instance-id,Values=$instanceId" `
        --query "Addresses[0].[AllocationId,AssociationId,PublicIp]" `
        --output json | ConvertFrom-Json
    
    if ($eipInfo -and $eipInfo[0] -ne $null) {
        $allocationId = $eipInfo[0]
        $associationId = $eipInfo[1]
        $eipAddress = $eipInfo[2]
        Write-Host "  Found Elastic IP: $eipAddress" -ForegroundColor Green
        
        # Disassociate
        Write-Host "  Disassociating Elastic IP..." -ForegroundColor Yellow
        aws ec2 disassociate-address --association-id $associationId --region $Region 2>&1 | Out-Null
        
        # Release
        Write-Host "  Releasing Elastic IP..." -ForegroundColor Yellow
        aws ec2 release-address --allocation-id $allocationId --region $Region 2>&1 | Out-Null
        Write-Host "  Elastic IP released" -ForegroundColor Green
    } else {
        Write-Host "  No Elastic IP associated with instance" -ForegroundColor Yellow
    }
} else {
    # Try to find unassociated Elastic IPs with the tag
    $eipInfo = aws ec2 describe-addresses `
        --region $Region `
        --filters "Name=tag:Name,Values=ctrlchecks-worker" `
        --query "Addresses[0].[AllocationId,PublicIp]" `
        --output json | ConvertFrom-Json
    
    if ($eipInfo -and $eipInfo[0] -ne $null) {
        $allocationId = $eipInfo[0]
        $eipAddress = $eipInfo[1]
        Write-Host "  Found unassociated Elastic IP: $eipAddress" -ForegroundColor Green
        Write-Host "  Releasing..." -ForegroundColor Yellow
        aws ec2 release-address --allocation-id $allocationId --region $Region 2>&1 | Out-Null
        Write-Host "  Elastic IP released" -ForegroundColor Green
    } else {
        Write-Host "  No Elastic IP found" -ForegroundColor Yellow
    }
}

# Step 3: Terminate instance
if ($instanceId) {
    Write-Host "`n[3/5] Terminating instance..." -ForegroundColor Cyan
    if ($instanceState -eq "running" -or $instanceState -eq "stopped") {
        Write-Host "  Terminating instance: $instanceId" -ForegroundColor Yellow
        aws ec2 terminate-instances --instance-ids $instanceId --region $Region 2>&1 | Out-Null
        Write-Host "  Waiting for termination (this may take 1-2 minutes)..." -ForegroundColor Yellow
        aws ec2 wait instance-terminated --instance-ids $instanceId --region $Region
        Write-Host "  Instance terminated" -ForegroundColor Green
    } else {
        Write-Host "  Instance is already in state: $instanceState" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n[3/5] Skipping instance termination (no instance found)" -ForegroundColor Yellow
}

# Step 4: Delete security group
Write-Host "`n[4/5] Finding security group..." -ForegroundColor Cyan
Start-Sleep -Seconds 5  # Wait a bit for instance to fully terminate
$sg = aws ec2 describe-security-groups `
    --region $Region `
    --filters "Name=group-name,Values=ctrlchecks-worker-sg" `
    --query "SecurityGroups[0].GroupId" `
    --output text

if ($sg -and $sg -ne "None" -and $sg -ne "") {
    Write-Host "  Found security group: $sg" -ForegroundColor Green
    Write-Host "  Deleting security group..." -ForegroundColor Yellow
    aws ec2 delete-security-group --group-id $sg --region $Region 2>&1 | Out-Null
    Write-Host "  Security group deleted" -ForegroundColor Green
} else {
    Write-Host "  No security group found" -ForegroundColor Yellow
}

# Step 5: Delete key pair (optional - uncomment if you want to delete the key pair too)
# Write-Host "`n[5/5] Deleting key pair..." -ForegroundColor Cyan
# aws ec2 delete-key-pair --key-name ctrlchecks-worker-key --region $Region 2>&1 | Out-Null
# Write-Host "  Key pair deleted" -ForegroundColor Green

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "✅ CLEANUP COMPLETE!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "All Worker resources have been deleted." -ForegroundColor Green
Write-Host "You can now proceed with a fresh deployment starting from Step 1." -ForegroundColor Green
Write-Host ""
