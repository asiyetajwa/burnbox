#!/usr/bin/env bash
# Burn Box on a fresh Vultr VM (Ubuntu 24.04 LTS). Run as root:
#   curl -fsSL https://raw.githubusercontent.com/asiyetajwa/burnbox/main/deploy/setup-vultr.sh | bash
# Then put the inference key in /opt/burnbox/.env and run: cd /opt/burnbox && docker compose up -d
set -euo pipefail

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

# gVisor gives every box its own user-space kernel: a stronger wall than plain containers.
if [ "${WITH_GVISOR:-1}" = "1" ] && ! command -v runsc >/dev/null; then
  curl -fsSL https://gvisor.dev/archive.key | gpg --dearmor -o /usr/share/keyrings/gvisor-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/gvisor-archive-keyring.gpg] https://storage.googleapis.com/gvisor/releases release main" > /etc/apt/sources.list.d/gvisor.list
  apt-get update && apt-get install -y runsc
  runsc install
  systemctl restart docker
fi

mkdir -p /opt && cd /opt
[ -d burnbox ] || git clone https://github.com/asiyetajwa/burnbox.git
cd burnbox && git pull --ff-only

if [ ! -f .env ]; then
  cat > .env <<ENV
# Vultr Serverless Inference key. Lives only on this host; never in a box, the repo or a chat.
VULTR_INFERENCE_API_KEY=
# Leave empty to pick a model from the account's model list.
VULTR_MODEL=
SANDBOX_RUNTIME=$(command -v runsc >/dev/null && echo runsc || echo)
PUBLIC_PORT=80
ENV
  chmod 600 .env
fi

docker compose --profile images build
docker compose up -d --build

# Firewall: SSH and the web app only.
if command -v ufw >/dev/null; then ufw allow OpenSSH && ufw allow 80/tcp && ufw --force enable; fi

echo "Burn Box is up. Health: curl -s localhost/api/health"
