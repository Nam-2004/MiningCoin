WebMiner site snapshot and mirror instructions

Files in this folder:
- index.html: a short snapshot (partial) of https://webminer.pages.dev/

How to create a full mirror (recommended)

Option A — Using wget (PowerShell on Windows):

1. Open PowerShell and run:

   wget --version; \ # check wget availability
   

2. Recommended mirror command (this will download the whole site into the current directory):

```powershell
# Run from the directory where you want to save the mirror
wget --mirror --convert-links --adjust-extension --page-requisites --no-parent https://webminer.pages.dev/
```

Notes:
- On Windows, the GNU wget may not be installed by default. You can install it via Chocolatey or use WSL.
- The command downloads all assets (JS, WASM, images, CSS) referenced from the HTML and rewrites links for local browsing.

Option B — Using HTTrack (recommended for larger sites):

1. Install HTTrack for Windows: https://www.httrack.com/
2. Use the GUI or run from command-line:

```powershell
# Example HTTrack command
httrack "https://webminer.pages.dev/" -O "webminer_clone" +*.pages.dev/* -v
```

Run the included PowerShell mirror script

To run the script added to this repo which downloads HTML and same-host assets (JS, CSS, WASM, images), execute the following from PowerShell (run as user that can write to repo):

```powershell
# Example: run mirror script, saving into webminer_clone/full_mirror
pwsh -ExecutionPolicy Bypass -File .\webminer_clone\mirror_site.ps1 -Url "https://webminer.pages.dev/" -OutputDir ".\webminer_clone\full_mirror" -MaxFiles 2000
```

Safety and ethics
- This site runs an in-browser miner (Dev Fee: 2%) and contains wallet addresses. Be careful when running the mirrored copy — it may contain code that uses CPU heavily.
- If you plan to host a copy, remove or inspect any miner JS/WASM before serving to users.

Safety checklist before opening downloaded mirror in a browser
- Inspect and remove any .wasm or miner JS files if you don't want the copy to run mining.
- You can search downloaded files for common miner strings: e.g., "miner", "wasm", "WebAssembly.instantiate", "dev fee", or the wallet string `RVZD5AjUBXoNnsBg9B2AzTTdEeBNLfqs65`.
- Serve the mirror locally using a simple static server and open with a browser profile that you can safely monitor.

What I can do next
- I can attempt an automated download of all linked JS and WASM files and save them into this folder, then run a quick static analysis to find miner code and wallet strings.
- Or I can provide a step-by-step PowerShell script that automates wget/httrack on your machine.
- Run the automated download myself and save the full mirror into this repo (I will only fetch same-host assets; tell me if you want cross-host assets too).
- After downloading, I can scan files for miner code, wallet addresses, and summarize what's running.

Tell me which next step you want.