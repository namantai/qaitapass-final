Educational project for the course Introduction to Finance. Not a real product, service or investment offer. Do not use with real funds.

# QaitaPass

### Blockchain-Based Digital Health Passport for Refurbished Laptops

**Astana IT University | Introduction to Finance | Team 04**

QaitaPass is an educational blockchain prototype that allows authorised organisations to create and verify digital service histories for refurbished laptops.

The project uses **Hyperledger Fabric** to record diagnostics, repairs and disputes in an append-only ledger shared between organisations.

## 1. Project Overview

When a refurbished laptop moves between sellers, diagnostic centres and repair workshops, its service records may be stored in separate systems.

QaitaPass addresses this problem by providing a shared, verifiable history of device-related records.

**Main features:**
- Digital device passport registration
- Diagnostic history recording
- Repair history tracking
- Device history verification
- Dispute reporting
- Role-based access control

The blockchain stores document hashes and synthetic device identifiers, not personal information or complete diagnostic files.

## 2. Technology Stack

| Component | Technology |
|---|---|
| Blockchain | Hyperledger Fabric 2.5 |
| Smart contract | JavaScript Chaincode |
| Runtime | Node.js 22 |
| Container environment | Docker / Docker Compose |
| Identity management | Fabric CA, MSP, X.509 certificates |
| Document integrity | SHA-256 |
| Testing | Node.js Test Runner |

The prototype runs locally using the official Hyperledger Fabric Test Network with two peer organisations.

## 3. Smart Contract Functions

| Function | Description | Authorised role |
|---|---|---|
| `registerDevice` | Creates a new device passport | Refurbisher |
| `addDiagnostic` | Adds a diagnostic record | Diagnostics |
| `appendRepair` | Adds a repair record | Repairer |
| `flagDispute` | Flags a disputed passport | Reviewer |
| `verifyHistory` | Returns the device history | Authorised reader |

Access permissions are checked using authenticated Fabric identities and organisation membership.

Previous records are preserved when new events are added.

## 4. Project Structure

```text
QaitaPass_Final_Code/
├── chaincode/
│   ├── lib/                 # Fabric smart contract
│   ├── test/                # Fabric unit tests
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
├── scripts/
│   ├── fabric-network.sh   # Fabric deployment and demo
│   ├── demo.js             # Original local simulation
│   └── local-server.js
├── src/                    # Original simulation
├── tests/                  # Simulation unit tests
├── docs/                   # Test evidence and documentation
├── package.json
└── README.md
```

## 5. Installation

### Prerequisites

Install:

- Git
- Node.js 20+ (22 recommended)
- npm
- Docker Engine and Docker Compose
- curl and jq
- Hyperledger Fabric Samples, CLI binaries and Docker images

Official documentation: [Hyperledger Fabric Test Network](https://hyperledger-fabric.readthedocs.io/en/latest/test_network.html).

### Clone the repository

```bash
git clone https://github.com/namantai/qaitapass-final.git
cd qaitapass-final
```

### Install chaincode dependencies

```bash
npm ci --prefix chaincode
```

### Configure Fabric

Install the official Fabric Samples and tools outside this repository.

Set the path to your Fabric installation.

**Bash:**

```bash
export FABRIC_SAMPLES="$HOME/fabric-lab/fabric-samples"
```

**Fish:**

```fish
set -gx FABRIC_SAMPLES "$HOME/fabric-lab/fabric-samples"
```

Verify the environment:

```bash
bash scripts/fabric-network.sh check
```

## 6. Run the Fabric Prototype

On a fresh local test network, run:

```bash
npm run fabric:demo
```

This starts the local Fabric network, prepares the test identities, deploys QaitaPass chaincode and executes its demonstration workflow.

If the network is already configured and the contract is deployed, run the scenario separately:

```bash
DEMO_DEVICE_ID=DEV-NEW-001 bash scripts/fabric-network.sh demo
```

Use a new synthetic device ID for each demonstration.

**Note:** The full setup command requires a fresh network. Existing network identities must not be overwritten automatically.

### Manual transaction example

Use Bash for the following commands:

```bash
DEVICE=DEV-MANUAL-001

INTAKE=$(printf %s 'synthetic intake' | sha256sum | cut -d ' ' -f1)
DIAGNOSTIC=$(printf %s 'synthetic diagnostic' | sha256sum | cut -d ' ' -f1)
REPAIR=$(printf %s 'synthetic repair' | sha256sum | cut -d ' ' -f1)
```

**Register a device**

```bash
bash scripts/fabric-network.sh invoke refurbisher registerDevice "$DEVICE" "$INTAKE"
```

**Add a diagnostic record**

```bash
bash scripts/fabric-network.sh invoke diagnostics addDiagnostic "$DEVICE" "$DIAGNOSTIC"
```

**Add a repair record**

```bash
bash scripts/fabric-network.sh invoke repairer appendRepair "$DEVICE" "$REPAIR"
```

**Verify device history**

```bash
bash scripts/fabric-network.sh query reader "$DEVICE" | jq .
```

**Flag a dispute**

```bash
bash scripts/fabric-network.sh invoke reviewer flagDispute "$DEVICE" REVIEW_REQUEST
```

**Verify the updated history**

```bash
bash scripts/fabric-network.sh query reviewer "$DEVICE" | jq .
```

### Access control example

The following operation is expected to fail because a reader cannot add repair records:

```bash
bash scripts/fabric-network.sh invoke reader appendRepair "$DEVICE" "$REPAIR"
```

Expected rejection:

```text
Not authorized for this QaitaPass operation
```

This is an intentional security check, not a system failure.

## 7. Testing

Run all automated tests:

```bash
npm run test:all
```

**Verified local test results:**

| Test suite | Passed | Failed |
|---|---:|---:|
| Original simulation | 12 | 0 |
| Fabric chaincode unit tests | 16 | 0 |
| **Total** | **28** | **0** |

The tests cover:

- Authorised and unauthorised transactions
- Device registration and duplicate prevention
- Diagnostic and repair events
- Record preservation and chronological history
- MSP and certificate-based permissions
- Invalid document hashes
- Dispute validation
- Missing and corrupted records

**Fabric integration:** The local demonstration successfully committed transactions on both peer nodes, verified the recorded history and passed six negative checks.

Unit tests and live Fabric integration are separate forms of verification. These results do not constitute a production security audit.

## 8. Demo Video

**Final demonstration:** [[Add Google Drive video link here](https://drive.google.com/file/d/14XY3v568u43K5_BzIEFYwAjVZlRQEtAG/view?usp=sharing)]

The video demonstrates:

1. Local Hyperledger Fabric deployment
2. Device passport creation
3. Diagnostic and repair transactions
4. Device history verification
5. Role-based security checks
6. Automated test results

Duration: 2 minutes maximum.

## 9. Team Members

**Team 04 — Astana IT University**

| Member | Project area |
|---|---|
| Nurtas Amantay | Blockchain prototype and security |
| Serik Nurassyl | Market analysis and business model |
| Dauren Tilek | Financial planning and calculations |
| Farkhod Sapayev | Risk assessment and investment pitch |

Individual contributions should be confirmed through actual project work, Git commits and self-evaluations.

## 10. AI Disclosure

ChatGPT (GPT-6) assisted with project documentation, technical planning and code review.

AI coding assistance was also used during prototype development. The team must confirm the exact Codex model used and disclose it in the final academic submission.

All project code, calculations and results must be reviewed and understood by the team.

## 11. Safety and Limitations

QaitaPass is a classroom prototype, not a production application.

- All devices and organisations are fictional.
- No real customer or personal data is used.
- No real cryptocurrency or financial transactions are involved.
- The network runs locally with test identities.
- Smart contract tests do not replace an external security audit.
- The business model and financial forecasts are educational assumptions.

---

**QaitaPass — Team 04 | Astana IT University | 2026–2027**
