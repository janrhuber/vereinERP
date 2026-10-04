# CLAUDE.md — vereinERP

Operating manual for this repo — invariants and pointers only; details live
in `docs/` and the workflow commands.

## Commands

Workflows (`.claude/commands/`): `/feature` (spec-first change), `/bugfix`
(regression test first), `/debug` (diagnose, don't fix), `/deps` (npm audit),
`/release <X.Y.Z>` (merge to main, tag, deploy, verify).

## What this is

Club cash book for a Swiss carnival group, tax rules of canton Aargau. Plain
HTML/CSS/JS without a build step, optional Node/Express backend in `server/`.
Two modes with identical data format (local folder / server). Production:
CT 116, public only `https://kasse.schmalzpicker.ch` (submit form),
everything else internal `http://192.168.1.16:3000`.
Start with `docs/architektur.md`.

## Hard constraints

- **Access model is security-critical.** External requests (header
  `X-Zugang: extern`, set by nginx) may only reach the submission page and
  `POST /api/eingang`. Every endpoint that shows or changes data starts with
  `nurIntern`. Any new file for the public page must be whitelisted in **both**
  `server/app.js` (`EXTERN_DATEIEN`) and nginx (`server-setup` repo). See
  `docs/specs/002-zugangsmodell.md`. When in doubt: internal only.
- **Logic that exists twice stays identical**: receipt naming and
  `sanitizeFilename` live in `js/basis.js` / `js/wiederkehrend.js` **and**
  `server/hilfen.js`. Change both or neither.
- **Data format is a contract.** `CSV_HEADER` order, BOM, `|` as receipt
  separator, status values `OK`/`GEPLANT`. The server treats the CSV as raw
  bytes — never `express.text`.
- **Never touch real data.** Tests use a temp dir. Production data lives in
  `/var/lib/vereinerp/daten`, outside the git checkout. Back it up before any
  deployment.
- **No new npm dependencies** without explicit approval. Frontend stays
  dependency-free and build-free.
- **No secrets** in committed files. The repo is public.
- **Tests required** for every server change: `cd server && npm test`
  (`node:test`). Frontend has no automated tests — verify in the browser and
  say so.
- **Cache busting**: after changing CSS or JS, bump `?v=YYYYMMDD` in
  `vereinERP.html` and `einreichen.html`. Cloudflare caches these files.
- **`server/index.js` stays a plain start script** — no
  `require.main === module` (false under PM2 fork mode, server would never listen).
- **Spec-first**: one spec per feature in `docs/specs/` (index:
  `docs/specs/README.md`; cross-cutting: `adr.md`, `glossar.md`, `changelog.md`).

## Git & commits

- Work on `develop`; branch off it, merge back with `--no-ff`. `main` is what
  runs in production and only changes through `/release`.
- Branch names: `feature/|fix/|refactor/|chore/|docs/|test/` + kebab-case.
- Conventional Commits, **English**, imperative: `feat(eingang): add …`, `fix: …`.
- Breaking changes (data format, API): `feat!:` / `BREAKING CHANGE:` footer +
  record as ADR in `docs/specs/adr.md`.
- Add user-visible changes to `docs/specs/changelog.md` under **Unreleased**.
- No "Co-Authored-By" / AI-generation notes in commit messages.
- Language: code identifiers and UI German (as existing), commits English,
  docs German.

## Working efficiently

- Read only the files relevant to the change — no speculative refactors.
- On uncertainty, read the affected spec in `docs/specs/` — only that one.
- Verify claims against the code before writing them into a spec.

## Key paths

| Purpose | Path |
|---|---|
| Architecture / operations | `docs/architektur.md` · `docs/betrieb.md` |
| Specs | `docs/specs/` |
| Frontend app / public page | `vereinERP.html`, `js/` · `einreichen.html`, `js/einreichen.js` |
| Backend | `server/` (`app.js` = app, `index.js` = start) |
| Tests | `server/test/` |
| Infrastructure (nginx, Ansible, deploy) | separate repo `C:\git\server-setup` |
