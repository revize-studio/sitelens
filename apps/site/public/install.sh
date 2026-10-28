#!/bin/sh
# sitelens installer for macOS and Linux:
#   curl -fsSL https://sitelens.pl/install.sh | sh
# Puts Node.js (from nodejs.org, checksum verified) and sitelens in ~/.sitelens and adds
# ~/.sitelens/bin to PATH. No administrator rights, nothing outside the home folder changes.
# Uninstall: rm -rf ~/.sitelens and remove the "# sitelens" lines from your shell profile.
set -eu

SITELENS_HOME="${SITELENS_HOME:-$HOME/.sitelens}"
PACKAGE="${SITELENS_PACKAGE:-sitelens@latest}"
NODE_DIST="https://nodejs.org/dist/latest-v24.x"

case "${LC_ALL:-}${LANG:-}" in
  *pl*) LANG_PL=1 ;;
  *) LANG_PL=0 ;;
esac
say() { if [ "$LANG_PL" = 1 ]; then printf '%s\n' "$1"; else printf '%s\n' "$2"; fi; }
fail() {
  if [ "$LANG_PL" = 1 ]; then printf 'sitelens: %s\n' "$1" >&2; else printf 'sitelens: %s\n' "$2" >&2; fi
  exit 1
}

case "$(uname -s)" in
  Darwin) platform=darwin ;;
  Linux) platform=linux ;;
  *) fail "ten instalator działa na macOS i Linuxie. Na Windows użyj install.ps1." "this installer is for macOS and Linux. On Windows use install.ps1." ;;
esac
case "$(uname -m)" in
  x86_64 | amd64) cpu=x64 ;;
  arm64 | aarch64) cpu=arm64 ;;
  *) fail "nieobsługiwany procesor: $(uname -m)." "unsupported processor: $(uname -m)." ;;
esac

if command -v curl >/dev/null 2>&1; then
  fetch() { curl -fsSL "$1" -o "$2"; }
elif command -v wget >/dev/null 2>&1; then
  fetch() { wget -q "$1" -O "$2"; }
else
  fail "potrzebny jest curl albo wget." "curl or wget is required."
fi
if command -v shasum >/dev/null 2>&1; then
  sha256() { shasum -a 256 "$1" | cut -d ' ' -f 1; }
else
  sha256() { sha256sum "$1" | cut -d ' ' -f 1; }
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT INT TERM

say "Pobieram Node.js…" "Downloading Node.js…"
fetch "$NODE_DIST/SHASUMS256.txt" "$tmp/SHASUMS256.txt" || fail "nie udało się połączyć z nodejs.org." "could not reach nodejs.org."
line="$(grep -E "node-v[0-9.]+-$platform-$cpu\.tar\.gz\$" "$tmp/SHASUMS256.txt" | head -n 1)"
[ -n "$line" ] || fail "nodejs.org nie ma Node.js dla $platform-$cpu." "nodejs.org has no Node.js build for $platform-$cpu."
expected="${line%% *}"
archive="${line##* }"
fetch "$NODE_DIST/$archive" "$tmp/$archive" || fail "nie udało się pobrać $archive." "could not download $archive."
[ "$(sha256 "$tmp/$archive")" = "$expected" ] || fail "suma kontrolna Node.js się nie zgadza, przerwano." "the Node.js checksum does not match, stopped."

mkdir -p "$SITELENS_HOME"
tar -xzf "$tmp/$archive" -C "$tmp"
rm -rf "$SITELENS_HOME/node"
mv "$tmp/${archive%.tar.gz}" "$SITELENS_HOME/node"
NODE="$SITELENS_HOME/node/bin/node"
"$NODE" -v >/dev/null 2>&1 || fail "Node.js nie uruchamia się na tym systemie (za stara wersja?)." "Node.js does not run on this system (too old?)."

say "Instaluję sitelens…" "Installing sitelens…"
PATH="$SITELENS_HOME/node/bin:$PATH" "$SITELENS_HOME/node/bin/npm" install --global --prefix "$SITELENS_HOME" \
  --no-fund --no-audit --no-update-notifier --loglevel=error "$PACKAGE" >/dev/null ||
  fail "npm nie zainstalował sitelens." "npm could not install sitelens."

# npm links the command to Node through PATH; ours points at the Node installed above
mkdir -p "$SITELENS_HOME/bin"
rm -f "$SITELENS_HOME/bin/sitelens"
cat >"$SITELENS_HOME/bin/sitelens" <<EOF
#!/bin/sh
exec "$NODE" "$SITELENS_HOME/lib/node_modules/sitelens/dist/cli.js" "\$@"
EOF
chmod +x "$SITELENS_HOME/bin/sitelens"

case "$(basename "${SHELL:-sh}")" in
  zsh) profile="$HOME/.zshrc" ;;
  bash) if [ "$platform" = darwin ]; then profile="$HOME/.bash_profile"; else profile="$HOME/.bashrc"; fi ;;
  fish) profile="$HOME/.config/fish/conf.d/sitelens.fish" ;;
  *) profile="$HOME/.profile" ;;
esac
if ! grep -qs "$SITELENS_HOME/bin" "$profile"; then
  mkdir -p "$(dirname "$profile")"
  if [ "${profile##*.}" = fish ]; then
    printf '\n# sitelens\nfish_add_path "%s/bin"\n' "$SITELENS_HOME" >>"$profile"
  else
    printf '\n# sitelens\nexport PATH="%s/bin:$PATH"\n' "$SITELENS_HOME" >>"$profile"
  fi
fi

say "" ""
say "Gotowe. Otwórz nowe okno terminala i wpisz:" "Done. Open a new terminal window and type:"
say "  sitelens https://twojastrona.pl" "  sitelens https://yourwebsite.com --lang en"
