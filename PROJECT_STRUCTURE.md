# 📁 Project Structure

## 🏗️ Clean, Production-Ready Structure

```
ctrlchecks-ai-workflow-os/
│
├── 📄 RUN_APPLICATION.md          # Complete setup and run guide
├── 📄 QUICK_START.md              # Quick 5-minute setup
├── 📄 PROJECT_STRUCTURE.md       # This file
│
├── 📁 worker/                     # Node.js Backend Service
│   ├── 📁 src/                    # Source code
│   │   ├── 📁 api/                # API routes
│   │   ├── 📁 core/               # Core utilities
│   │   ├── 📁 services/           # Business logic
│   │   └── 📁 memory/             # Memory system
│   ├── 📁 migrations/             # Database migrations
│   ├── 📁 scripts/                # Utility scripts
│   ├── 📁 data/                   # Training data & templates
│   ├── 📁 docs/                   # Documentation
│   ├── 📄 package.json            # Dependencies
│   ├── 📄 env.example             # Environment template
│   ├── 📄 README.md               # Worker documentation
│   └── 📄 tsconfig.json           # TypeScript config
│
├── 📁 ctrl_checks/                # React Frontend
│   ├── 📁 src/                    # Source code
│   │   ├── 📁 components/         # React components
│   │   ├── 📁 pages/              # Page components
│   │   ├── 📁 config/             # Configuration
│   │   └── 📁 lib/                # Utilities
│   ├── 📁 public/                 # Static assets
│   ├── 📁 docs/                    # Documentation
│   ├── 📄 package.json            # Dependencies
│   ├── 📄 env.example             # Environment template
│   ├── 📄 README.md               # Frontend documentation
│   └── 📄 vite.config.ts         # Vite config
│
├── 📁 Fast_API_Ollama/            # Python FastAPI Service (Remote)
│   ├── 📄 main.py                 # FastAPI app
│   ├── 📄 ollama_client.py        # Ollama client
│   └── 📄 requirements.txt        # Python dependencies
│
└── 📁 Guide/                      # Deployment guides (optional)
```

---

## 🎯 Key Directories

### Worker Service (`worker/`)

- **`src/`** - Main source code
  - `api/` - Express routes and handlers
  - `core/` - Configuration, database, utilities
  - `services/` - Business logic (workflow execution, AI, etc.)
  - `memory/` - Memory system for workflow storage

- **`migrations/`** - SQL migration files for database schema
- **`scripts/`** - Utility scripts (setup, testing, etc.)
- **`data/`** - Training datasets, templates, node library
- **`docs/`** - Documentation files

### Frontend (`ctrl_checks/`)

- **`src/`** - React application source
  - `components/` - Reusable React components
  - `pages/` - Page-level components
  - `config/` - Configuration (endpoints, etc.)
  - `lib/` - Utility functions

- **`public/`** - Static assets (images, icons, etc.)
- **`docs/`** - Documentation

---

## 📝 Important Files

### Configuration Files

- **`worker/.env`** - Worker environment variables (create from `env.example`)
- **`ctrl_checks/.env.local`** - Frontend environment variables (create from `env.example`)

### Documentation Files

- **`RUN_APPLICATION.md`** - Complete setup and run guide
- **`QUICK_START.md`** - Quick setup guide
- **`worker/README.md`** - Worker service documentation
- **`ctrl_checks/README.md`** - Frontend documentation

---

## 🚫 Files to Ignore (Git)

- `node_modules/` - Dependencies (auto-generated)
- `dist/` - Build output (auto-generated)
- `.env` / `.env.local` - Environment variables (sensitive)
- `*.log` - Log files
- `.git/` - Git repository

---

## ✅ Production-Ready Checklist

- [x] Clean folder structure
- [x] No unnecessary files
- [x] Environment templates provided
- [x] Documentation complete
- [x] No linter errors
- [x] TypeScript configured
- [x] Dependencies defined

---

**Structure is clean and ready for testing! 🎉**
