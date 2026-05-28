You are starting work on `fleet-tracker-backend`. This is a fresh repo with starter files already in place: `package.json`, `tsconfig.json`, `.env.example`, `.gitignore`, `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, and `API_CONTRACT.md`.

**Before you write any code, read these four files in this order:**

1. `CLAUDE.md` — full context on what this service does, the tech stack, conventions, and the 10 build phases
2. `CONTRIBUTING.md` — the git workflow you must follow (branching, commits, PRs)
3. `API_CONTRACT.md` — the contract that both this repo and the frontend repo follow
4. `package.json` — confirms the dependencies you have available

---

## Pre-flight check: git state

Before starting Phase 1, verify the repo is correctly bootstrapped:

```bash
git branch --show-current      # should print "main"
git log --oneline -5            # should show at least the initial scaffold commit
git remote -v                   # should show "origin" pointing to GitHub
```

If any of these fail, STOP and ask the user to run the bootstrap commands from `BOOTSTRAP_AND_BRANCHING.md` before continuing.

---

## Your task

Execute the 10 build phases listed in `CLAUDE.md` **one phase at a time, each on its own branch, ending each with a PR**.

For every phase:

1. From `main`, create the phase branch (e.g. `git checkout -b feat/phase-3-auth`)
2. Implement the phase per `CLAUDE.md`
3. Commit in small logical chunks using **Conventional Commits** (`feat(scope): subject`, etc.) — not one giant commit
4. Run the verification command listed for that phase
5. Show me the output of the verification
6. Push the branch and open a PR:
   ```bash
   git push -u origin <branch>
   gh pr create --title "Phase N — <name>" --body "<summary including verification output>"
   ```
7. **STOP. Do NOT merge the PR yet.** Wait for the user to confirm verification passed and explicitly say "merge it."
8. Once the user confirms, merge:
   ```bash
   gh pr merge --squash --delete-branch
   git checkout main && git pull
   ```
9. Wait for the user's instruction before starting the next phase.

Do not skip ahead. Do not combine phases. Do not commit to main directly. If you hit ambiguity, ask me rather than assume.

---

## Start now

Begin **Phase 1 — Project skeleton**.

```bash
git checkout main && git pull origin main
git checkout -b chore/phase-1-project-skeleton
```

Expected deliverable:
- `src/index.ts` with Express app on `:3000` and a `GET /health` returning `{"status":"ok"}`
- `src/config.ts` with zod-validated env loader
- `src/logger.ts` using pino + pino-pretty in dev
- A working `npm run dev` that starts the server
- A `.vscode/extensions.json` recommending ESLint + Prettier

Verification command: `npm run dev` then in a new terminal `curl localhost:3000/health` should return `{"status":"ok"}`.

When verification passes, open the PR with title `Phase 1 — Project skeleton` and STOP. I will inspect and tell you "merge it" when I'm satisfied.

---

## Working agreement

- **Strict TypeScript.** No `any`. Use `unknown` + narrowing.
- **Named exports only**, except where the framework requires default (Express app, Socket.io server).
- **No new dependencies** beyond what's in `package.json` without asking me first.
- **All env vars** go through `src/config.ts` with zod validation.
- **All errors** flow through a central error middleware.
- **Branch per phase. PR per phase. Wait for my approval before merging.**
- **Conventional Commits** for every commit.

Proceed.