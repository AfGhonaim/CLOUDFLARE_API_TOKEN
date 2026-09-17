#!/usr/bin/env bash
#
# One-shot setup for the WhatsApp bot's Cloudflare side.
#
# Everything here could be done by hand from docs/WHATSAPP-BOT.md; this just
# does it in one pass and checks its own work at the end. It is safe to re-run —
# it asks before overwriting anything already configured.
#
# What it cannot do is the Meta console or the Anthropic console. Collect these
# five values first, then run it:
#
#   1. Phone number ID     Meta > WhatsApp > API Setup
#   2. App secret          Meta > App settings > Basic
#   3. Access token        Meta > WhatsApp > API Setup
#   4. Anthropic API key   console.anthropic.com/settings/keys
#   5. Your own number     the phone you will message the bot from
#
set -euo pipefail

cd "$(dirname "$0")"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
step() { printf '\n\033[1;34m==>\033[0m \033[1m%s\033[0m\n' "$1"; }
warn() { printf '\033[33m!\033[0m %s\n' "$1"; }
die()  { printf '\033[31mx\033[0m %s\n' "$1" >&2; exit 1; }

# Ask for a value, refusing to continue on an empty answer.
ask() {
  local prompt="$1" var="$2" value=""
  while [ -z "$value" ]; do
    read -r -p "  $prompt: " value
    [ -z "$value" ] && warn "That cannot be empty."
  done
  printf -v "$var" '%s' "$value"
}

# Same, but never echoes what is typed.
ask_secret() {
  local prompt="$1" var="$2" value=""
  while [ -z "$value" ]; do
    read -r -s -p "  $prompt: " value
    echo
    [ -z "$value" ] && warn "That cannot be empty."
  done
  printf -v "$var" '%s' "$value"
}

confirm() {
  local answer
  read -r -p "  $1 [y/N]: " answer
  [[ "$answer" =~ ^[Yy]$ ]]
}

# --- Preflight ---------------------------------------------------------------

step "Checking prerequisites"

command -v node >/dev/null || die "Node is not installed. You need Node 22 or newer."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 22 ] || die "Node $(node --version) is too old — Wrangler needs 22 or newer."
echo "  Node $(node --version)"

[ -f wrangler.toml ] || die "Run this from the repository; worker/wrangler.toml is missing."

if [ ! -d node_modules ]; then
  echo "  Installing dependencies..."
  npm install --silent
fi
echo "  Dependencies ready"

WRANGLER="npx --no-install wrangler"

step "Cloudflare account"
if $WRANGLER whoami 2>/dev/null | grep -qi "you are logged in"; then
  echo "  Already logged in."
else
  echo "  Opening a browser to log in to Cloudflare..."
  $WRANGLER login || die "Cloudflare login failed."
fi

# --- KV namespace ------------------------------------------------------------

step "Conversation storage (Workers KV)"

if grep -q 'REPLACE_WITH_YOUR_KV_NAMESPACE_ID' wrangler.toml; then
  echo "  Creating the CHATS namespace..."
  KV_OUTPUT="$($WRANGLER kv namespace create CHATS 2>&1)" || {
    echo "$KV_OUTPUT"
    die "Could not create the namespace. If it already exists, paste its id into wrangler.toml by hand and re-run."
  }
  KV_ID="$(printf '%s' "$KV_OUTPUT" | grep -oE '[0-9a-f]{32}' | head -1)"
  [ -n "$KV_ID" ] || { echo "$KV_OUTPUT"; die "Created the namespace but could not find its id in that output."; }
  echo "  Namespace id: $KV_ID"
else
  echo "  wrangler.toml already names a namespace — leaving it alone."
  KV_ID=""
fi

# --- Plain config ------------------------------------------------------------

step "Worker configuration"

PHONE_ID=""
if grep -q 'REPLACE_WITH_YOUR_PHONE_NUMBER_ID' wrangler.toml; then
  echo "  Meta > WhatsApp > API Setup. This is a long number, not the phone number."
  ask "Phone number ID" PHONE_ID
  [[ "$PHONE_ID" =~ ^[0-9]+$ ]] || die "A phone number ID is all digits."
fi

NUMBERS=""
if grep -q 'REPLACE_WITH_YOUR_NUMBER' wrangler.toml; then
  echo "  Your own number, full international form, digits only (e.g. 201001234567)."
  echo "  Comma-separate to allow several. Anyone not listed is ignored."
  ask "Allowed number(s)" NUMBERS
  NUMBERS="$(printf '%s' "$NUMBERS" | tr -d ' +()-')"
  [[ "$NUMBERS" =~ ^[0-9,]+$|^\*$ ]] || die "Expected digits and commas (or * to allow everyone)."
fi

# Patch only the placeholders we have replacements for.
[ -n "$KV_ID" ]    && sed -i.bak "s|REPLACE_WITH_YOUR_KV_NAMESPACE_ID|$KV_ID|"        wrangler.toml
[ -n "$PHONE_ID" ] && sed -i.bak "s|REPLACE_WITH_YOUR_PHONE_NUMBER_ID|$PHONE_ID|"     wrangler.toml
[ -n "$NUMBERS" ]  && sed -i.bak "s|REPLACE_WITH_YOUR_NUMBER|$NUMBERS|"               wrangler.toml
rm -f wrangler.toml.bak

grep -q 'REPLACE_WITH_' wrangler.toml && die "wrangler.toml still has placeholders in it — fill them in and re-run."
echo "  wrangler.toml is filled in."

# --- Secrets -----------------------------------------------------------------

step "Secrets"
echo "  Nothing typed here is echoed or written to disk."
echo

VERIFY_TOKEN=""
if confirm "Set the four secrets now?"; then
  ask_secret "Anthropic API key           " ANTHROPIC_KEY
  ask_secret "WhatsApp access token       " WA_TOKEN
  ask_secret "Meta app secret             " APP_SECRET

  # This one is invented rather than looked up, so generate a good default.
  VERIFY_TOKEN="$(node -e 'console.log(require("crypto").randomBytes(24).toString("hex"))')"
  echo
  echo "  Generated a webhook verify token for you:"
  bold "    $VERIFY_TOKEN"
  echo "  You will paste this into Meta's webhook form in a moment."

  printf '%s' "$ANTHROPIC_KEY" | $WRANGLER secret put ANTHROPIC_API_KEY      >/dev/null
  printf '%s' "$WA_TOKEN"      | $WRANGLER secret put WHATSAPP_TOKEN         >/dev/null
  printf '%s' "$APP_SECRET"    | $WRANGLER secret put WHATSAPP_APP_SECRET    >/dev/null
  printf '%s' "$VERIFY_TOKEN"  | $WRANGLER secret put WHATSAPP_VERIFY_TOKEN  >/dev/null

  unset ANTHROPIC_KEY WA_TOKEN APP_SECRET
  echo "  All four secrets stored."
else
  echo "  Skipped. Set them yourself with: npx wrangler secret put <NAME>"
fi

# --- Deploy ------------------------------------------------------------------

step "Deploying"

DEPLOY_OUTPUT="$($WRANGLER deploy 2>&1)" || { echo "$DEPLOY_OUTPUT"; die "Deploy failed."; }
WORKER_URL="$(printf '%s' "$DEPLOY_OUTPUT" | grep -oE 'https://[a-z0-9.-]+\.workers\.dev' | head -1)"
[ -n "$WORKER_URL" ] || { echo "$DEPLOY_OUTPUT"; die "Deployed, but could not find the Worker URL in that output."; }
echo "  Live at $WORKER_URL"

# --- Self-test ---------------------------------------------------------------

if [ -n "$VERIFY_TOKEN" ]; then
  step "Checking the Worker answers Meta's handshake"
  CHALLENGE="selftest$RANDOM"
  RESPONSE="$(curl -fsS --max-time 20 \
    "$WORKER_URL/webhook?hub.mode=subscribe&hub.verify_token=$VERIFY_TOKEN&hub.challenge=$CHALLENGE" \
    2>/dev/null || true)"

  if [ "$RESPONSE" = "$CHALLENGE" ]; then
    echo "  The Worker echoed the challenge — it is live and the verify token took."
  else
    warn "Expected '$CHALLENGE', got '${RESPONSE:-<nothing>}'."
    warn "The Worker deployed but is not answering correctly. Check: npm run tail"
  fi
fi

# --- What is left ------------------------------------------------------------

step "Your turn — the part only you can do"
cat <<INSTRUCTIONS

  In Meta > WhatsApp > Configuration > Webhook, click Edit and enter:

    Callback URL   $WORKER_URL/webhook
INSTRUCTIONS

if [ -n "$VERIFY_TOKEN" ]; then
  echo "    Verify token   $VERIFY_TOKEN"
else
  echo "    Verify token   (the WHATSAPP_VERIFY_TOKEN you set)"
fi

cat <<'INSTRUCTIONS'

  Save, then click Manage and subscribe to the "messages" field.

  Then message your WhatsApp number from an allowed phone. To watch it work:

    cd worker && npm run tail

  Full reference, including swapping the 24-hour token for a permanent one:
  docs/WHATSAPP-BOT.md

INSTRUCTIONS
