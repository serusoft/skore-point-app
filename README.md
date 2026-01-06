# Skore Point — Run Locally

Best option: run a local static server so absolute imports, modules, and the service worker resolve correctly.

Recommended commands

- Using Python 3 (serve parent directory so the app path matches `/skore-point-app/`):

```powershell
cd %USERPROFILE%\Desktop
python -m http.server 8000
# then open: http://localhost:8000/skore-point-app/
```

- Using `serve` (Node, no install if using `npx`):

```powershell
cd %USERPROFILE%\Desktop
npx serve . -l 5000
# then open: http://localhost:5000/skore-point-app/
```

Notes
- Many files and the service worker use root-absolute paths like `/shared/js/app.js` or `/skore-point-app/...`. Serving from a static server (above) preserves those paths.
- If you prefer to open files directly in the browser (file://), that will fail for module imports and service worker registration. Use a server instead.
- If you must serve the site from a different path, either:
  - edit `sw.js` and other absolute paths to match your deployment path, or
  - add a `<base href="/skore-point-app/">` in the `<head>` of `index.html` so relative links resolve (I can add this for you).

Next steps I can take (choose):
- Add a `package.json` with a `start` script using `serve` or `http-server`.
- Insert a `<base>` tag into `index.html` to fix relative resolution when served from `/skore-point-app/`.

If you'd like, I can add one of the optional fixes now.
