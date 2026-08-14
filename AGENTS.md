# Repository instructions

## Scope and sources of truth

- AriaNg is a static AngularJS frontend. Edit source under `src/`; Gulp generates `.tmp/` intermediates and `dist/` release files. Do not edit either generated directory directly.
- `src/scripts/core/app.js` defines the `ariaNg` module and `src/scripts/core/router.js` owns route-to-view/controller mappings. Keep page behavior in the matching controller/view and shared Angular services under `src/scripts/services/`.
- Aria2 RPC calls go through `src/scripts/services/aria2RpcService.js`, which selects the HTTP or WebSocket implementation. Reuse that facade instead of adding transport calls in controllers.
- For translation work, edit `src/langs/`. When adding a language, register it in `src/scripts/config/languages.js` and use `i18n/en.sample.txt` as the key template.
- For container or deployment changes, read `deploy/ariang.Dockerfile` and `deploy/ariang-nginx.conf` before editing deployment behavior.

## Environment and commands

- Use Node.js 14 or newer with npm; `package-lock.json` is the dependency lockfile.
- Install dependencies with `npm install`.
- Standard release build: `npm run build`. It cleans `.tmp/` and `dist/`, lints `src/scripts/**/*.js`, and writes the release files to `dist/`.
- All-in-one build: `npx gulp clean build-bundle`.
- Local development: `npm run dev`; BrowserSync serves at `http://localhost:6880` and watches source files.

## Verification

- Run `npm run build` for JavaScript or UI changes; the build includes the repository's JavaScript lint task.
- There is no automated test suite: `npm test` is a placeholder that exits successfully without running tests. Do not use it as behavior evidence.
- Exercise affected routes through `npm run dev` when a change needs browser-level verification.

## Release safety

- `scripts/publish_dailybuild.sh` uses SSH to push `dist/` to the `mayswind/AriaNg-DailyBuild` repository from the CircleCI master job. Treat it as CI-only; do not run it locally unless explicitly requested.


Backend code at `../aria2-transfer-gateway`,
