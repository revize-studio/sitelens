# sitelens

A website audit anyone can understand. One command checks performance, SEO, accessibility and security on up to 50 pages and writes a PDF report in plain language: what is wrong, why it matters and how to fix it.

```sh
npx sitelens
```

On its own, sitelens asks for the report language, the website address and the audit mode; pick with the arrow keys. When the report is ready, sitelens prints its full path and opens it when you press Enter. To skip the questions, give the address and options straight away:

```sh
npx sitelens https://yourwebsite.com --lang en --out report.pdf
```

Polski: `npx sitelens` zapyta o język raportu, adres strony i tryb, a raport po polsku zapisze w `raport.pdf`.

## Install without Node.js

```sh
# macOS and Linux
curl -fsSL https://sitelens.pl/install.sh | sh

# Windows (PowerShell)
irm https://sitelens.pl/install.ps1 | iex
```

The installer puts its own Node.js (downloaded from nodejs.org, checksum verified) and sitelens in your user folder, with no administrator rights. Open a new terminal window afterwards and type `sitelens`. To remove it, delete `~/.sitelens` (Windows: `%LOCALAPPDATA%\sitelens`) and the PATH entry it added.

## Requirements

- Node.js 22.19 or newer (the installer brings its own)
- A Chromium-based browser already on the computer (Chrome, Edge, Brave or Chromium). If there is none, `sitelens --install-browser` downloads Chromium once.

## Modes

| Mode     | Same as      | Checks                       |
| -------- | ------------ | ---------------------------- |
| Quick    | `--pages 1`  | the homepage only            |
| Standard | `--pages 10` | up to 10 pages (default)     |
| Thorough | `--pages 50` | up to 50 pages, takes longer |

## Options

| Option                 | What it does                                                                   |
| ---------------------- | ------------------------------------------------------------------------------ |
| `--pages <n>`          | How many pages to check, default 10, at most 50                                |
| `--lang pl\|en`        | Report language, default `pl`                                                  |
| `--out <file.pdf>`     | Where to save the report, default `raport.pdf` (`report.pdf` with `--lang en`) |
| `--json`               | Also save the raw results as JSON next to the PDF                              |
| `--fail-under <score>` | Exit with code 1 when the overall score is lower, for CI                       |
| `--install-browser`    | Download Chromium if no browser was found                                      |

## Brandbook

A separate command reads the logo, colours, typography, buttons, navigation and tone of voice of a live website and writes a brandbook: a landscape A4 PDF, an interactive HTML page that works offline, Design Tokens (`tokens.json`), CSS variables (`tokens.css`) and a Tailwind CSS 4 theme (`tailwind.css`) with the dark theme, the site's logo files with their sources, screenshots and a ZIP of it all.

```sh
npx sitelens brand https://yourwebsite.com --lang en
```

| Option            | What it does                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `--out <folder>`  | Where to save it, default `brandbook-<domain>`                                              |
| `--lang pl\|en`   | Brandbook language, default `pl`                                                            |
| `--pages <n>`     | How many pages from the navigation to compare with the homepage, default 2, at most 10      |
| `--format <list>` | Which files to write: `pdf`, `html`, `tokens`, `zip`, `json`, default `pdf,html,tokens,zip` |

What is read from the site is stated as fact; clear space, minimum sizes and don'ts are labelled proposals for a person to approve. No font files are included, and a brand typeface is embedded in the PDF only under an open licence. Logos and marks belong to the brand owner. Online version: [sitelens.pl/en/brandbook](https://sitelens.pl/en/brandbook).

## What it does

sitelens behaves like a visitor: it only downloads public pages with GET requests, follows links on the same site, respects robots.txt and identifies itself as `sitelens`. Pages open in your own browser; Lighthouse and axe-core run locally. Nothing is sent to sitelens or anyone else.

Every result comes from a concrete, repeatable test. Advice texts come from a hand-written library of cards, and the report appendix lists the technical details, tool versions and how the score is calculated.

Exit codes: `0` done, `1` score under `--fail-under`, `2` wrong usage, `3` site unreachable, `4` no browser or file could not be saved.

## License

MIT, built by [Revize Studio](https://revize.pl).
