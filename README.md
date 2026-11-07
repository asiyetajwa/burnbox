# Burn Box

**Send us the file you're afraid to open.** A detonation chamber for small teams.

Forward a suspicious email, upload a suspicious file or paste a suspicious link. Burn Box opens it inside a disposable sandbox on a Vultr VM, records everything it tries to do, then burns the box. You get a plain-English verdict and a signed destruction receipt.

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

### Emails: don't open it, forward it

The riskiest moment is opening the email to get at its link or attachment. So the whole email is the sample.

- **Forward it.** Right-click the email in the inbox and choose Forward as Attachment, then send it to `check@<your Burn Box domain>`. The email itself is never opened. `server/src/mail.ts` receives it (inbound only). You can also drop a saved `.eml` on the web app.
- **The envelope is read inside a box.** Parsing a hostile email is itself risky, so `sandbox/box/email_reader.py` runs in a sealed box with no network. It unwraps a forwarded original and reads:
  - who really sent it, and the SPF, DKIM and DMARC results the user's own mail provider stamped on it;
  - a reply-to that points elsewhere, and lookalike domains (`northwind-paybles` for `northwind-payables`, `rnicrosoft` for `microsoft`);
  - link text that lies about where the link goes;
  - pressure language, and attachments that run code.
- **Then it splits.** Every link and attachment gets a fresh box of its own and its own verdict, side by side on screen. One combined verdict and one signed receipt cover every box that was burned.

The demo email is `samples/invoice_overdue.eml` (built by `samples/make_demo_email.py`). It opens three boxes, one each for the envelope, the attachment and the link. All three burn, and the verdict is Malicious.

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
| `samples/invoice_overdue.eml` | The demo phishing email: spoofed sender (SPF, DKIM, DMARC fail), a lookalike reply-to, a link whose text lies, and `invoice_sample.py` attached. | Malicious, 3 boxes |

`docs/demo/invoice-overdue-email.html` is the demo "invoice overdue" email for the video.

## Design

Dark machined hardware: graphite device shells, inset wells, one warm amber fill for progress and the main action, and the sealed box drawn as a knurled dial. Type is Geist and Geist Mono. Never use Bricolage Grotesque or the Instrument family (Instrument Sans, Instrument Serif).

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

## Run it on Vultr

Burn Box was built for Vultr, and it runs on Vultr's stack by configuration, not by porting.

1. Create any Ubuntu 24.04 VM (2 vCPU / 4 GB is the spec we run).
2. Run `deploy/setup-vultr.sh` from this repo.
3. Put a Vultr Serverless Inference key in `/opt/burnbox/.env` (leave `VULTR_INFERENCE_BASE_URL` unset; it defaults to https://api.vultrinference.com/v1) and run `docker compose up -d`.
4. Check `/api/health`: verdicts now come from Vultr Serverless Inference.

## Infrastructure note (hackathon demo)

The public demo linked from our LabLab submission runs on a Google Cloud VM, with verdicts written by Google Gemini through the same base URL setting, because our Vultr account could not be used. Vultr issued every participant $200 in credits at kickoff, and we redeemed the code into this account on November 3. The account has never been usable: it requires a linked payment method before it will create a VM or issue an API key, and its system rejected our cards in its own words: "This card is not eligible for free credit promotions" and "Linking denied for this card. Please deposit an amount of $5 or greater." The deposits it demanded then failed with an insufficient funds error that was not true. Support ticket YIA-00XAE, opened November 4 and followed up on November 6, asked for manual verification and is unanswered. Our rule for this vendor is no card, no PayPal, no money, so we deployed the identical stack where we hold credits. Same code, same boxes, same receipts. Moving the demo to Vultr is the four steps above and one settings change.
