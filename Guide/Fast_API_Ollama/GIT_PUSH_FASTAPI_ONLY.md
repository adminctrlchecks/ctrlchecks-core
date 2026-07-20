# Push Fast_API_Ollama Folder Separately to Git

**Guide for pushing only the Fast_API_Ollama folder to a separate Git repository**

---

## Option 1: Push to Separate Repository (Recommended)

### Step 1: Create New Repository

1. Go to GitHub/GitLab/Bitbucket
2. Create a new repository (e.g., `CtrlChecks-FastAPI`)
3. **Don't initialize with README** (we'll push existing code)

### Step 2: Initialize Git in Fast_API_Ollama Folder

```bash
# Navigate to Fast_API_Ollama folder
cd Fast_API_Ollama

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: FastAPI Ollama with LTX-2 integration"
```

### Step 3: Add Remote and Push

```bash
# Add remote repository (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/CtrlChecks-FastAPI.git

# Or if using SSH:
# git remote add origin git@github.com:YOUR_USERNAME/CtrlChecks-FastAPI.git

# Push to main branch
git branch -M main
git push -u origin main
```

**✅ Checkpoint:** Fast_API_Ollama folder pushed to separate repository

---

## Option 2: Push as Subdirectory to Existing Repo

### Step 1: Navigate to Project Root

```bash
# Go to project root
cd ctrlchecks-ai-workflow-os

# Check git status
git status
```

### Step 2: Add Only Fast_API_Ollama Folder

```bash
# Add only Fast_API_Ollama folder
git add Fast_API_Ollama/

# Commit
git commit -m "Add FastAPI Ollama with LTX-2 integration"

# Push
git push origin main
```

**✅ Checkpoint:** Fast_API_Ollama folder pushed to main repository

---

## Option 3: Create Subtree (Advanced)

If you want Fast_API_Ollama to be in a separate repository but also accessible from main repo:

```bash
# From project root
cd ctrlchecks-ai-workflow-os

# Add subtree remote
git remote add fastapi-origin https://github.com/YOUR_USERNAME/CtrlChecks-FastAPI.git

# Push subtree
git subtree push --prefix=Fast_API_Ollama fastapi-origin main
```

---

## Recommended: Separate Repository

**Best practice:** Push Fast_API_Ollama to a **separate repository** because:

1. ✅ Independent versioning
2. ✅ Separate deployment
3. ✅ Easier to manage
4. ✅ Can be used by other projects

### Repository Structure

```
CtrlChecks-FastAPI/
├── main.py
├── ltx_client.py
├── requirements.txt
├── env.example
├── Dockerfile
├── deploy.sh
├── README.md
├── LTX2_SETUP.md
└── ... (all Fast_API_Ollama files)
```

---

## Complete Setup for Separate Repository

### Step 1: Prepare Fast_API_Ollama Folder

```bash
# Navigate to Fast_API_Ollama
cd Fast_API_Ollama

# Check what files are there
ls -la

# Make sure .gitignore exists (if needed)
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
EOF
```

### Step 2: Initialize Git

```bash
# Initialize git
git init

# Add all files
git add .

# Check what will be committed
git status

# Commit
git commit -m "Initial commit: FastAPI Ollama service with LTX-2 integration"
```

### Step 3: Create Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `CtrlChecks-FastAPI` (or your preferred name)
3. Description: "FastAPI Ollama service with Lightricks LTX-2 integration"
4. **Don't** initialize with README, .gitignore, or license
5. Click "Create repository"

### Step 4: Connect and Push

```bash
# Add remote (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/CtrlChecks-FastAPI.git

# Verify remote
git remote -v

# Rename branch to main (if needed)
git branch -M main

# Push to remote
git push -u origin main
```

### Step 5: Verify Push

```bash
# Check remote status
git remote show origin

# Verify files are pushed
git ls-remote origin
```

**✅ Checkpoint:** Repository created and code pushed

---

## Update Deployment Guide

After pushing to separate repository, update the deployment guide:

### In COMPLETE_FRESH_DEPLOYMENT.md

Change the clone command from:
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .
```

To:
```bash
git clone https://github.com/YOUR_USERNAME/CtrlChecks-FastAPI.git .
```

---

## Future Updates

### To Update Fast_API_Ollama Repository

```bash
# Navigate to Fast_API_Ollama folder
cd Fast_API_Ollama

# Make changes to files
# ...

# Add changes
git add .

# Commit
git commit -m "Update: Description of changes"

# Push
git push origin main
```

### To Pull Latest on EC2

```bash
# On EC2 instance
cd /opt/fastapi-ollama

# Pull latest code
git pull origin main

# Restart service
sudo systemctl restart fastapi-ollama
```

---

## Repository URL for Deployment

After pushing, your repository URL will be:

```
https://github.com/YOUR_USERNAME/CtrlChecks-FastAPI.git
```

Use this URL in:
- Deployment scripts
- EC2 clone commands
- Documentation

---

## Quick Commands Summary

```bash
# 1. Navigate to Fast_API_Ollama
cd Fast_API_Ollama

# 2. Initialize git
git init

# 3. Add files
git add .

# 4. Commit
git commit -m "Initial commit: FastAPI Ollama with LTX-2"

# 5. Add remote
git remote add origin https://github.com/YOUR_USERNAME/CtrlChecks-FastAPI.git

# 6. Push
git branch -M main
git push -u origin main
```

---

## Verification

After pushing, verify:

1. ✅ Go to GitHub repository
2. ✅ Check all files are present
3. ✅ Verify main.py, ltx_client.py, requirements.txt are there
4. ✅ Check README.md is visible

---

## Next Steps

After pushing to Git:

1. **Update deployment guide** with new repository URL
2. **Test clone** on local machine:
   ```bash
   cd /tmp
   git clone https://github.com/YOUR_USERNAME/CtrlChecks-FastAPI.git test-clone
   ls test-clone
   ```
3. **Proceed with deployment** using:
   - [COMPLETE_FRESH_DEPLOYMENT.md](./COMPLETE_FRESH_DEPLOYMENT.md)

---

**Ready to deploy?** → Follow [COMPLETE_FRESH_DEPLOYMENT.md](./COMPLETE_FRESH_DEPLOYMENT.md)
