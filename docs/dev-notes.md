# Development Notes

## Project Identity

- Local repo: `/Users/lyn/nocturne_memory_plusmax`
- Fork repo: `https://github.com/Lyndall24/nocturne_memory_plusmax`
- Upstream repo: `https://github.com/Dataojitori/nocturne_memory`
- Default working branch: `feat/initial-vibe-coding`

## Git Workflow

- `origin` points to the fork: `Lyndall24/nocturne_memory_plusmax`
- `upstream` points to the source project: `Dataojitori/nocturne_memory`
- Do not develop directly on `main`
- Start new work from a feature branch

Common commands:

```bash
cd /Users/lyn/nocturne_memory_plusmax

git checkout main
git pull upstream main

git checkout feat/initial-vibe-coding
git status
git diff
```

## Local Development

This project uses:

- Backend: Python + FastAPI
- Frontend: Vite + React

Backend setup:

```bash
cd /Users/lyn/nocturne_memory_plusmax
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

Run backend:

```bash
cd /Users/lyn/nocturne_memory_plusmax/backend
source ../.venv/bin/activate
uvicorn main:app --reload --port 8000
```

Frontend setup and run:

```bash
cd /Users/lyn/nocturne_memory_plusmax/frontend
npm install
npm run dev
```

Frontend build:

```bash
cd /Users/lyn/nocturne_memory_plusmax/frontend
npm run build
```

## Context Recovery

If a new Codex session starts, point it to this file first:

- `docs/dev-notes.md`

Then mention:

- current repo path
- current branch
- what task is being changed
