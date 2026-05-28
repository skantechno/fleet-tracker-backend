# Contributing

This repo follows **GitHub Flow**: short-lived feature branches off `main`, merged via PR. `main` is always deployable.

## Per-phase workflow

1. Start from up-to-date main:
   ```bash
   git checkout main && git pull origin main
   ```
2. Create a phase branch using the naming convention:
   ```bash
   git checkout -b feat/phase-N-short-slug
   ```
3. Implement the phase per `CLAUDE.md`.
4. Commit in small, logical chunks using **Conventional Commits**.
5. Push and open a PR:
   ```bash
   git push -u origin feat/phase-N-short-slug
   gh pr create --title "Phase N — <name>" --body "<summary>"
   ```
6. Run the phase's verification command. Paste output in the PR description.
7. After verification passes, squash-merge and delete the branch:
   ```bash
   gh pr merge --squash --delete-branch
   ```

## Branch naming

```
<type>/phase-<n>-<short-slug>
```

Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`

## Commit message format (Conventional Commits)

```
<type>(<scope>): <subject>

[optional body]
```

Examples:
- `feat(auth): JWT sign/verify helpers and auth middleware`
- `fix(mqtt): handle reconnect with exponential backoff`
- `chore(deps): upgrade socket.io to 4.8.1`
- `refactor(routes): extract validation into zod schemas`
- `test(geofence): cover point-in-polygon edge cases`

## When direct commits to main are acceptable

Only two exceptions:
1. The initial project scaffold (already done)
2. Trivial doc-only changes (typo fixes) — use `docs:` prefix

Everything else goes through a branch + PR.