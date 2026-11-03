# Burn Box

**Send us the file you're afraid to open.** A detonation chamber for small teams.

Upload a suspicious file or paste a suspicious link. Burn Box opens it inside a disposable sandbox on a Vultr VM, records everything it tries to do, then burns the box. You get a plain-English verdict and a signed destruction receipt.

Built for the Vultr Agent Rush, Challenge 1: Blast Radius Zero. Here the containment is the product: Burn Box does work that is only safe because of the box.

## What a run looks like

1. **Seal.** A fresh container starts with no network, a read-only system, a non-root user, no Linux capabilities, and CPU, memory, process and time limits. The Vultr setup script installs gVisor, and boxes then run under it with their own user-space kernel (`SANDBOX_RUNTIME=runsc`).
2. **Plant canaries.** Fake secrets are written inside the box, new for every run: a cloud key file, a crypto wallet and a password file. Their only job is to be reached for.
3. **Detonate.** The file runs under `strace` while a sampler lists every process. A link opens in headless Chromium on a private lab network.
4. **Record.** Every file open, write, delete, process start and connection attempt streams live to the browser. Every attempt to leave the box fails and is logged.
5. **Burn.** The container is removed, and the app checks that Docker no longer knows it.
6. **Verdict.** An LLM on Vultr Serverless Inference reads the behavioural facts and writes the report: what the sample pretended to be, what it tried, and safe, suspicious or malicious. A signed Ed25519 receipt records the container, the limits, the canaries and the destroyed-at time.

### The sample cannot talk the judge out of it

Everything the sample prints is attacker-controlled text. The model sees it only as quoted evidence, and the verdict has a floor set by rules from the facts alone. Reading planted secrets and then reaching out is malicious, whatever the model says. The model can raise a verdict, never lower it below that floor. There is a test for this (`server/test/verdict.test.ts`).

### Links: nothing real is ever typed

For a link, the browser in the box visits the page and screenshots it. If the page asks for a login, the box types a canary email and password and traces where the form sends them. No human approval is needed, because nothing real is entered. Lab pages are fully observable. Real sites can only be read: the browser stops every request that would send data out (POST, PUT, uploads, WebSockets) and every download. The gate proxy, the box's only way out, allows HTTPS tunnels and plain GETs to public addresses only. It refuses private, loopback, link-local and metadata addresses, so a link can never reach the VM itself.

## Architecture on Vultr

```
                        Vultr Cloud Compute VM (Ubuntu 24.04, agent-rush, Los Angeles)
 browser ──HTTP──▶ app (Node 22) ──tcp──▶ docker-proxy ──▶ Docker Engine (+ gVisor runsc)
                    │    ▲                (containers and images only)       │
                    │    │ live events (SSE)                                 ├─ file box: --network none, read-only, strace
                    │    └──────────── box stdout (events + report) ◀────────┤
                    │                                                        └─ link box: Chromium on burnbox-lab (internal)
                    │                                                                     │
                    │                                              lab (phish page, collector)   gate ──▶ internet (GET/HTTPS only)
                    ▼
       Vultr Serverless Inference  (https://api.vultrinference.com/v1, OpenAI compatible)
       key in VULTR_INFERENCE_API_KEY on the host only; never in a box, the repo or a log
```

- **Control layer:** `server/` on the VM. It plans each run, starts the box through a restricted Docker socket proxy (no exec, no volumes, no system calls), streams events, writes the verdict and signs the receipt. It has no runtime dependencies beyond Node 22.
- **Inference:** every LLM call goes to Vultr Serverless Inference over its OpenAI-compatible API (`server/src/verdict.ts`). The model is chosen from the account's model list, or set with `VULTR_MODEL`. `STUB_LLM=1` writes rule-based verdicts for development.
- **Sandbox lifecycle:** one container per run, never reused. The sample goes in over stdin, so nothing is mounted from the host. The report comes out over stdout. Then the container is removed and its removal is confirmed. Leftover boxes from a crash are burned at start-up.

## Deploy on Vultr

On a fresh Ubuntu 24.04 VM, as root:

```bash
curl -fsSL https://raw.githubusercontent.com/asiyetajwa/burnbox/main/deploy/setup-vultr.sh | bash
nano /opt/burnbox/.env            # set VULTR_INFERENCE_API_KEY
cd /opt/burnbox && docker compose up -d
curl -s localhost/api/health
```

The script installs Docker and gVisor, builds the two box images (`docker compose --profile images build`), starts the app, the Docker proxy, the lab and the gate, and opens only SSH and port 80.

## Run locally

```bash
npm install
docker build -t burnbox-box:dev sandbox/box
docker build -t burnbox-browser:dev sandbox/browser      # for links
docker network create --internal burnbox-lab
docker build -t burnbox-lab:dev sandbox/lab
docker run -d --name bb-lab --network burnbox-lab --network-alias invoices-portal.lab.test --network-alias collector.lab.test burnbox-lab:dev
STUB_LLM=1 BOX_IMAGE=burnbox-box:dev BROWSER_IMAGE=burnbox-browser:dev npm start   # http://localhost:8080
npm test && npm run check
```

## Test samples

All self-written; there is no real malware here and never will be.

| Sample | What it does | Expected |
|---|---|---|
| `samples/invoice_sample.py` | Poses as an invoice helper. Reads the canary files, tries to send them to `collector.lab.test` and `203.0.113.7` (a reserved test address), tries to install itself in `/etc/cron.d`, tries to delete shared documents. Does nothing outside a Burn Box. | Malicious |
| phish page (`sandbox/lab/lab.py`) | A fake invoice sign-in page that sends whatever is typed to a collector on another host. Lab network only. | Malicious |
| `samples/benign_sample.py` | Writes one note in its own folder. | Safe |

`docs/demo/invoice-overdue-email.html` is the demo "invoice overdue" email for the video.

## API

- `POST /api/runs` with a file body (`?name=`), or JSON `{"sample": "invoice" | "phish" | "benign"}` or `{"url": "https://..."}`
- `GET /api/runs/:id/events`: live server-sent events
- `GET /api/runs/:id`: the run, verdict and receipt
- `GET /api/runs/:id/receipt`: the signed receipt as a file
- `GET /api/pubkey` and `POST /api/verify`: check a receipt's signature

## Limits, plainly

- Documents (Office, PDF) and archives are checked statically, without opening: macros that run on open, launch actions, embedded URLs. Only scripts and Linux executables are run.
- The sample runs as the same user as the tracer inside the box, so a sample written to attack the harness could hide its own trace. It still cannot leave the box.
- Real links are read-only by design: we trace where a real login form would send data, but the data is never sent.

## License

MIT
