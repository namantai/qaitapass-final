Educational project for the course Introduction to Finance. Not a real product, service or investment offer. Do not use with real funds.

# QaitaPass — Final Project, Team 04

An educational digital health passport for refurbished laptops in Kazakhstan, using only synthetic organisations, device IDs, document commitments and test identities. No payments, tokens, real-asset wallets or public networks.

## Implementation and verification

- **Preserved simulation:** `src/`, `tests/contract.test.js`, `scripts/demo.js` and `scripts/local-server.js` are unchanged. This in-memory, single-authority ledger uses temporary Ed25519 signatures; it is **not Fabric**.
- **Fabric prototype:** `chaincode/` extends the official `fabric-contract-api.Contract`, using `fabric-shim`. `scripts/fabric-network.sh` deploys it to an **external official fabric-samples/test-network**, with two peer organisations, an orderer, CAs, TLS and endorsement by both organisations. No sample repository is vendored.

**Fabric integration: NOT VERIFIED in this workspace.** Docker daemon access fails with `permission denied` on `/var/run/docker.sock`; external Fabric samples and binaries are absent. No deployment or committed Fabric transaction is claimed. Run the local steps below to complete verification.

| Check | Status | Evidence / remaining work |
| --- | --- | --- |
| Original 12 tests | PASS | Original file unchanged; all 12 also run directly |
| Fabric contract unit tests | PASS | 16 tests, real Contract class with mocked Fabric context |
| Original CLI demonstration | PASS | Scenario and chain integrity check complete |
| Fabric runtime metadata generation | PASS | Installed Fabric CLI discovers exactly five application transactions |
| Bash syntax and argument encoding | PASS | `bash -n` and CLI JSON construction checked |
| Integration prerequisite check | FAIL | Docker daemon inaccessible; Fabric installation missing |
| CA enrollment, deployment, endorsement, commit, peer queries, negative network checks | NOT RUN | Requires local Docker/Fabric installation |

Workspace checks used Node.js **26.12.0**, npm **12.2.1** and Fabric npm libraries **2.5.8**. The intended deployment baseline below uses Node.js **22 LTS**, Fabric **2.5.12**, Fabric CA **1.5.15**, Docker Engine **28.x** and the Docker Compose plugin. That deployment combination is **not verified here**. Unit tests do not verify certificate signatures, consensus, endorsement or MVCC commit validation.

## Five Fabric operations

Transaction arguments are positional strings. There is **no actor or role request field**. Fabric authenticates the proposal identity; chaincode reads `ctx.clientIdentity.getMSPID()`, `getID()` and the CA-signed certificate attribute `qaitapass.role`.

| Operation | Arguments | Allowed certificate role / MSP |
| --- | --- | --- |
| `registerDevice` | `deviceId`, `digest` | `refurbisher` / `Org1MSP` |
| `addDiagnostic` | `deviceId`, `digest` | `diagnostics` or `refurbisher` / `Org1MSP` |
| `appendRepair` | `deviceId`, `digest` | `repairer` / `Org2MSP` |
| `flagDispute` | `deviceId`, `reasonCode` | `reviewer` / `Org2MSP` |
| `verifyHistory` | `deviceId` | Any above role with its matching MSP, or `reader` / either MSP |

The two sample organisations host five synthetic participant identities; they are not five independently governed organisations. Refurbishers retain the original simulation's diagnostic permission. A sample admin or `User1` without an application role has no application access. The script's identity argument selects an enrolled certificate/private key; it does not assign a transaction role.

IDs must match `^DEV-[A-Z0-9-]{3,24}$`. Digests must contain exactly 64 hexadecimal characters and are stored in lowercase. Dispute reasons are `UNVERIFIED_INPUT`, `LABEL_MISMATCH` or `REVIEW_REQUEST`. Registration creates the initial `DIAGNOSTIC` event, matching the simulation.

Each event has a separate composite-key state record with its index, type, commitment, authenticated issuer, role, transaction ID and previous index (`supersedes`, retained from the simulation). This links events without erasing prior records. A passport holds its event count and dispute flag. There is no transaction for deleting or rewriting old events. Appends check that the next event key is absent. Reading and updating the passport counter makes concurrent appends conflict under Fabric MVCC; a rejected transaction must be retried against fresh state. Duplicate registration also reads the absent passport key before writing.

`verifyHistory` reads keys in numeric order, checks sequence links and returns `{deviceId, chronological, disputed, events}` without writes. It does not require the optional peer history database. Full-history reads are intended for small classroom datasets. A commitment does not prove document truth or device condition; documents remain off ledger. Application read restrictions do not hide channel data from peer administrators. CA registrars and chaincode lifecycle administrators remain trusted. This is an educational prototype, not a production governance or privacy design.

## Tests and preserved simulation

From the project root, with Node.js 20+ (use 22 LTS for the Fabric exercise):

```bash
# Original simulation: no external dependencies.
npm test
npm run demo
npm start
# Another terminal: curl http://127.0.0.1:8040/status
# Stop the status server with Ctrl-C.

# Fabric dependencies are isolated under chaincode/ and locked.
npm ci --prefix chaincode
npm run test:fabric
npm run test:all

# Direct runs show individual cases on runners that collapse file output.
node tests/contract.test.js
node chaincode/test/contract.test.js

# Offline runtime discovery; this does not deploy anything.
(cd chaincode && ./node_modules/.bin/fabric-chaincode-node metadata generate --file /tmp/qaitapass-metadata.json)
jq '.contracts.QaitaPass.transactions | map(.name)' /tmp/qaitapass-metadata.json
bash -n scripts/fabric-network.sh
```

The 16 new tests cover the scenario, disallowed writer-role combinations, missing attributes, MSP restrictions, request-field spoofing, duplicate IDs, invalid IDs/hashes, missing devices, disputes, numeric history order, read-only behavior, immutable event slots and independent passports.

## Linux prerequisites

Use a disposable local **Ubuntu 24.04 LTS amd64 or arm64** machine/VM, Bash, Git, curl, jq, Node.js 22 LTS, npm, Docker Engine 28.x and Docker Compose v2 or newer. The following is for a fresh Ubuntu machine. Manage an existing installation using [Docker's Ubuntu instructions](https://docs.docker.com/engine/install/ubuntu/). Use paths without spaces because some upstream sample scripts expand paths without quoting.

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git jq build-essential xz-utils
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
DOCKER_VERSION=$(apt-cache madison docker-ce | awk '$3 ~ /:28\./ {print $3; exit}')
test -n "$DOCKER_VERSION"
sudo apt-get install -y docker-ce="$DOCKER_VERSION" docker-ce-cli="$DOCKER_VERSION" containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Log out and back in to activate group membership. The Docker group grants administrative access to this disposable machine. `docker info` must work **without sudo**. Docker 28.x is the selected baseline for this older Fabric release; other combinations need separate compatibility verification.

Install Node.js 22 from the official binary distribution, or retain an existing 22.x installation. These commands resolve the current 22.x patch and check its checksum:

```bash
mkdir -p "$HOME/.local/qaitapass-node" /tmp/qaitapass-node-download
cd /tmp/qaitapass-node-download
case "$(uname -m)" in x86_64) NODE_ARCH=x64 ;; aarch64) NODE_ARCH=arm64 ;; *) exit 1 ;; esac
curl -fsSLO https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt
NODE_ARCHIVE=$(awk -v suffix="-linux-$NODE_ARCH.tar.xz" 'index($2,suffix) && $2 !~ /headers/ {print $2}' SHASUMS256.txt)
test -n "$NODE_ARCHIVE"
curl -fsSLO "https://nodejs.org/dist/latest-v22.x/$NODE_ARCHIVE"
awk -v archive="$NODE_ARCHIVE" '$2 == archive' SHASUMS256.txt | sha256sum -c -
tar -xJf "$NODE_ARCHIVE" --strip-components=1 -C "$HOME/.local/qaitapass-node"
export PATH="$HOME/.local/qaitapass-node/bin:$PATH"
node --version
npm --version
docker info
docker compose version
```

Keep the Node PATH export in later terminals. Fabric libraries are pinned to **2.5.8**; the [official compatibility table](https://github.com/hyperledger/fabric-chaincode-node/blob/main/COMPATIBILITY.md) lists Node.js 22 for that release. No Go toolchain is needed: this is JavaScript chaincode using precompiled Fabric tools.

## Install official Fabric samples externally

Use the [official installer](https://hyperledger-fabric.readthedocs.io/en/latest/install.html) with released [Fabric 2.5.12](https://github.com/hyperledger/fabric/releases/tag/v2.5.12) and [CA 1.5.15](https://github.com/hyperledger/fabric-ca/releases/tag/v1.5.15). Downloads and the first chaincode build need access to GitHub, Docker Hub and npm. Do not put `fabric-samples` inside this project.

```bash
mkdir -p "$HOME/qaitapass-fabric-lab"
cd "$HOME/qaitapass-fabric-lab"
curl -fsSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
bash install-fabric.sh --fabric-version 2.5.12 --ca-version 1.5.15 docker samples binary
export FABRIC_SAMPLES="$HOME/qaitapass-fabric-lab/fabric-samples"
export PATH="$FABRIC_SAMPLES/bin:$PATH"
peer version
fabric-ca-client version
git -C "$FABRIC_SAMPLES" rev-parse HEAD
```

The installer selects the external samples revision and tags the downloaded images. Record the samples commit and image IDs with your demo, then reuse that checkout for repeat runs. Samples are not pinned by this project. Do not retag another Fabric release as `latest` during this exercise: upstream Compose files use that tag.

## Start, enroll, deploy, demonstrate

Return to QaitaPass and use the same `FABRIC_SAMPLES` in every terminal:

```bash
cd /absolute/path/to/QaitaPass_Final_Code
export FABRIC_SAMPLES="$HOME/qaitapass-fabric-lab/fabric-samples"
npm ci --prefix chaincode
npm run test:all
bash scripts/fabric-network.sh check
bash scripts/fabric-network.sh up
bash scripts/fabric-network.sh enroll
bash scripts/fabric-network.sh deploy
bash scripts/fabric-network.sh demo

# Alternatively, on a fresh network: check + up + enroll + deploy + demo.
# npm run fabric:demo
```

`up` runs `network.sh up createChannel -ca -c qaitapass`. It refuses an existing sample identity directory instead of deleting another exercise. `enroll` uses the test CAs' bootstrap registrars to register `qp-refurbisher`, `qp-diagnostics`, `qp-repairer`, `qp-reviewer` and `qp-reader` with the `qaitapass.role` enrollment attribute and sample NodeOU configuration. Fixed enrollment passwords are synthetic test credentials. Keys/certificates stay in the external test-network's `organizations/`, not this repository. Successful enrollments can be reused. After an interruption between registration and enrollment, reset the disposable network with `down` and start again.

`deploy` packages, installs, approves and commits on both peers with `AND('Org1MSP.peer','Org2MSP.peer')`. No `InitLedger` or unrelated asset transactions exist. Its equivalent direct command is:

```bash
# Alternative to deploy above; do not deploy twice at the same sequence.
QAITA_PROJECT=/absolute/path/to/QaitaPass_Final_Code
(cd "$FABRIC_SAMPLES/test-network" && bash ./network.sh deployCC -c qaitapass -ccn qaitapass -ccp "$QAITA_PROJECT/chaincode" -ccl javascript -ccv 1.0 -ccs 1 -ccep "AND('Org1MSP.peer','Org2MSP.peer')")
```

The demo submits four writes, waits for VALID commits on both peers, compares peer queries, checks the original event is unchanged, and checks six rejections: duplicate registration, reader write, malformed digest, missing passport, invalid dispute reason and a read without an application role. It matches specific contract errors, so connection failures cannot masquerade as successful security checks. `PASS` prints only after assertions succeed. The network stays running for inspection.

## Individual invokes and queries

Use a fresh synthetic ID on the deployed network. The wrapper executes real `peer chaincode invoke/query` commands with TLS and the selected enrolled MSP. Every write uses both endorsing peers and `--waitForEvent --waitForEventTimeout 60s`.

```bash
DEVICE=DEV-MANUAL-001
INTAKE=$(printf %s 'synthetic intake document' | sha256sum | cut -d ' ' -f1)
DIAGNOSTIC=$(printf %s 'synthetic battery document' | sha256sum | cut -d ' ' -f1)
REPAIR=$(printf %s 'synthetic SSD repair document' | sha256sum | cut -d ' ' -f1)
bash scripts/fabric-network.sh invoke refurbisher registerDevice "$DEVICE" "$INTAKE"
bash scripts/fabric-network.sh invoke diagnostics addDiagnostic "$DEVICE" "$DIAGNOSTIC"
bash scripts/fabric-network.sh invoke repairer appendRepair "$DEVICE" "$REPAIR"
bash scripts/fabric-network.sh query reader "$DEVICE" | jq .
bash scripts/fabric-network.sh invoke reviewer flagDispute "$DEVICE" REVIEW_REQUEST
bash scripts/fabric-network.sh query reader "$DEVICE" | jq .
# Query Org2 with its authorised reviewer certificate:
bash scripts/fabric-network.sh query reviewer "$DEVICE" | jq .
# Expected nonzero exit:
bash scripts/fabric-network.sh invoke reader appendRepair "$DEVICE" "$REPAIR"
```

Repeat the demo with a new ID and record genuine evidence:

```bash
mkdir -p /tmp/qaitapass-evidence
set -o pipefail
DEMO_DEVICE_ID=DEV-RECORD-001 bash scripts/fabric-network.sh demo 2>&1 | tee /tmp/qaitapass-evidence/demo.log
git -C "$FABRIC_SAMPLES" rev-parse HEAD > /tmp/qaitapass-evidence/samples-commit.txt
docker images --digests > /tmp/qaitapass-evidence/images.txt
```

If an invoke times out, query before retrying: it may already have committed. For `MVCC_READ_CONFLICT`, refresh history before resubmitting. Deployment uses definition sequence 1; reset this disposable network before deploying changed code. For failures, inspect `docker ps -a`, `docker logs peer0.org1.example.com` and `docker logs peer0.org2.example.com`.

## Shutdown

```bash
bash scripts/fabric-network.sh down
# Equivalent: (cd "$FABRIC_SAMPLES/test-network" && bash ./network.sh down)
```

Official cleanup removes test ledgers, containers, keys and generated chaincode images. It can also remove other sample Fabric containers with matching labels/names; use a dedicated disposable Docker environment. Cleanup is never automatic. The official network publishes host ports: use an isolated local machine/VM, not a public host. See the [test-network guide](https://hyperledger-fabric.readthedocs.io/en/latest/test_network.html) and [CA attribute guide](https://hyperledger-fabric-ca.readthedocs.io/en/latest/users-guide.html#attribute-based-access-control).

## Submission and attribution

- Repository: `ADD_GITHUB_URL_AFTER_CREATING_REPOSITORY`
- Demonstration video (up to 3 minutes): `ADD_PUBLIC_VIDEO_URL_AFTER_UPLOAD`

Record the actual Fabric deployment before claiming integration in the defense. Existing `docs/LOCAL_DEMO_OUTPUT.txt` and `docs/TEST_RESULTS.txt` concern the simulation, not Fabric. The report, finance model and presentation have not been changed.

Team: Serik Nurassyl; Nurtas Amantay; Dauren Tilek; Farkhod Sapayev (group 04). Record contributions through real commits from each member's account; no commits or contributions are fabricated. ChatGPT/Codex assisted with implementation, tests and documentation; students must review, understand and disclose use. The simulation uses built-ins; the chaincode depends on official Apache-2.0-licensed Fabric npm libraries and invokes external official sample scripts.


ср








































