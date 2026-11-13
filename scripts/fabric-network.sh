#!/usr/bin/env bash
# Official external fabric-samples test-network only; all identities are synthetic.
set -euo pipefail

PROJECT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
FABRIC_SAMPLES=${FABRIC_SAMPLES:-"$HOME/fabric-samples"}
CHANNEL_NAME=qaitapass
CHAINCODE_NAME=qaitapass
export CONTAINER_CLI=docker
export CONTAINER_CLI_COMPOSE='docker compose'

fail() { echo "ERROR: $*" >&2; exit 1; }
usage() {
  cat <<'HELP'
Usage: bash scripts/fabric-network.sh COMMAND [arguments]
  check                         Check local prerequisites (no writes)
  up                            Start a fresh official test-network with CAs
  enroll                        Register/enroll synthetic certificate identities
  deploy                        Install/approve/commit QaitaPass on both peers
  invoke IDENTITY FUNCTION ...  Submit a write and wait for both peers to commit
  query IDENTITY DEV-ID         Query verifyHistory on that identity's peer
  demo                          Run scenario and negative checks on deployed network
  all                           check + up + enroll + deploy + demo
  down                          Official network.sh down (removes test ledgers/keys)
Identities: refurbisher, diagnostics, repairer, reviewer, reader, unattributed.
Set FABRIC_SAMPLES to an external official fabric-samples installation.
Set DEMO_DEVICE_ID to a fresh DEV-* ID to repeat only the demo.
HELP
}

check() {
  local errors=0 cmd
  for cmd in docker node npm jq git curl sha256sum; do
    if ! command -v "$cmd" >/dev/null; then
      echo "FAIL: missing $cmd" >&2; errors=1
    fi
  done
  if ! docker compose version; then echo 'FAIL: Docker Compose plugin unavailable' >&2; errors=1; fi
  if ! docker info >/dev/null; then echo 'FAIL: Docker daemon unavailable to this user' >&2; errors=1; fi
  if ! node -e 'if (Number(process.versions.node.split(".")[0]) < 20) process.exit(1)'; then
    echo 'FAIL: Node.js 20+ required; use Node.js 22 LTS' >&2; errors=1
  fi
  for cmd in peer configtxgen osnadmin fabric-ca-client; do
    if [[ ! -x "$FABRIC_SAMPLES/bin/$cmd" ]]; then
      echo "FAIL: missing $FABRIC_SAMPLES/bin/$cmd" >&2; errors=1
    fi
  done
  if [[ ! -f "$FABRIC_SAMPLES/test-network/network.sh" || ! -f "$FABRIC_SAMPLES/config/core.yaml" ]]; then
    echo "FAIL: install official Fabric samples/binaries/config externally; FABRIC_SAMPLES=$FABRIC_SAMPLES" >&2
    errors=1
  fi
  if (( errors )); then return 1; fi
  "$FABRIC_SAMPLES/bin/peer" version
  "$FABRIC_SAMPLES/bin/fabric-ca-client" version
  git -C "$FABRIC_SAMPLES" rev-parse HEAD
  echo 'PASS: local prerequisites accessible (this is not a deployment check)'
}

setup_paths() {
  [[ -f "$FABRIC_SAMPLES/test-network/network.sh" ]] || fail 'Run check and install external fabric-samples first.'
  FABRIC_SAMPLES=$(cd -- "$FABRIC_SAMPLES" && pwd -P)
  case "$FABRIC_SAMPLES/" in "$PROJECT_DIR/"*) fail 'fabric-samples must be installed outside this project.' ;; esac
  # Several upstream sample scripts expand paths unquoted.
  [[ "$FABRIC_SAMPLES$PROJECT_DIR" != *[[:space:]]* ]] || fail 'Use installation/project paths without whitespace (upstream test-network limitation).'
  NETWORK_DIR="$FABRIC_SAMPLES/test-network"
  ORGS="$NETWORK_DIR/organizations"
  export PATH="$FABRIC_SAMPLES/bin:$PATH"
  export FABRIC_CFG_PATH="$FABRIC_SAMPLES/config"
  ORG1_TLS="$ORGS/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
  ORG2_TLS="$ORGS/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"
  ORDERER_TLS="$ORGS/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt"
}

network() { (cd -- "$NETWORK_DIR" && bash ./network.sh "$@"); }

up() {
  [[ ! -d "$ORGS/peerOrganizations" ]] || fail 'Test-network identities already exist. Use enroll/deploy/demo as appropriate, or explicitly run down for a fresh disposable network.'
  network up createChannel -ca -c "$CHANNEL_NAME"
}

enroll_one() {
  local org=$1 port=$2 role=$3 base ca name secret target
  base="$ORGS/peerOrganizations/org${org}.example.com"
  ca="$ORGS/fabric-ca/org${org}/ca-cert.pem"
  name="qp-${role}"
  secret="${name}-synthetic-pw"
  target="$base/users/$name/msp"
  [[ -f "$base/msp/config.yaml" && -f "$ca" ]] || fail 'Start the test-network with up (including -ca) first.'
  if [[ -f "$target/signcerts/cert.pem" ]]; then
    cp "$base/msp/config.yaml" "$target/config.yaml"
    echo "Already enrolled: $name (Org${org}MSP)"
    return
  fi
  # The official up -ca script enrolled the bootstrap registrar under base/msp.
  FABRIC_CA_CLIENT_HOME="$base" fabric-ca-client register \
    --url "https://localhost:$port" --caname "ca-org$org" \
    --id.name "$name" --id.secret "$secret" --id.type client \
    --id.attrs "qaitapass.role=$role:ecert" --tls.certfiles "$ca"
  FABRIC_CA_CLIENT_HOME="$base/users/$name" fabric-ca-client enroll \
    --url "https://$name:$secret@localhost:$port" --caname "ca-org$org" \
    --mspdir "$target" --enrollment.attrs qaitapass.role --tls.certfiles "$ca"
  cp "$base/msp/config.yaml" "$target/config.yaml"
}

enroll() {
  # Fixed educational mapping, not data supplied by transaction callers.
  enroll_one 1 7054 refurbisher
  enroll_one 1 7054 diagnostics
  enroll_one 2 8054 repairer
  enroll_one 2 8054 reviewer
  enroll_one 1 7054 reader
}

deploy() {
  npm ci --prefix "$PROJECT_DIR/chaincode" --omit=dev
  network deployCC -c "$CHANNEL_NAME" -ccn "$CHAINCODE_NAME" \
    -ccp "$PROJECT_DIR/chaincode" -ccl javascript -ccv 1.0 -ccs 1 \
    -ccep "AND('Org1MSP.peer','Org2MSP.peer')"
}

use_identity() {
  local identity=$1 org
  case "$identity" in
    refurbisher|diagnostics|reader|unattributed) org=1 ;;
    repairer|reviewer) org=2 ;;
    *) fail "Unknown synthetic identity: $identity" ;;
  esac
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_LOCALMSPID="Org${org}MSP"
  export CORE_PEER_MSPCONFIGPATH="$ORGS/peerOrganizations/org${org}.example.com/users/qp-$identity/msp"
  if [[ "$identity" == unattributed ]]; then
    export CORE_PEER_MSPCONFIGPATH="$ORGS/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp"
  fi
  [[ -f "$CORE_PEER_MSPCONFIGPATH/config.yaml" ]] || fail "Identity not enrolled: $identity"
  if [[ "$org" == 1 ]]; then
    export CORE_PEER_ADDRESS=localhost:7051 CORE_PEER_TLS_ROOTCERT_FILE="$ORG1_TLS"
  else
    export CORE_PEER_ADDRESS=localhost:9051 CORE_PEER_TLS_ROOTCERT_FILE="$ORG2_TLS"
  fi
}

invoke() {
  [[ $# -eq 4 ]] || fail 'invoke requires IDENTITY FUNCTION DEVICE-ID DIGEST-OR-REASON'
  local identity=$1 fn=$2 payload
  shift 2
  case "$fn" in registerDevice|addDiagnostic|appendRepair|flagDispute) ;; *) fail 'Unknown write transaction' ;; esac
  use_identity "$identity"
  payload=$(jq -cn --arg fn "$fn" --args '$ARGS.positional as $args | {function:$fn,Args:$args}' -- "$@")
  peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
    --tls --cafile "$ORDERER_TLS" -C "$CHANNEL_NAME" -n "$CHAINCODE_NAME" \
    --peerAddresses localhost:7051 --tlsRootCertFiles "$ORG1_TLS" \
    --peerAddresses localhost:9051 --tlsRootCertFiles "$ORG2_TLS" \
    --waitForEvent --waitForEventTimeout 60s -c "$payload"
}

query() {
  [[ $# -eq 2 ]] || fail 'query requires IDENTITY DEVICE-ID'
  use_identity "$1"
  local payload
  payload=$(jq -cn --arg id "$2" '{function:"verifyHistory",Args:[$id]}')
  peer chaincode query -C "$CHANNEL_NAME" -n "$CHAINCODE_NAME" -c "$payload"
}

expect_rejected() {
  local pattern=$1 output
  shift
  if output=$("$@" 2>&1); then fail "Expected rejection but operation succeeded: $*"; fi
  # A connection failure must never be reported as a successful security check.
  [[ "$output" == *"$pattern"* ]] || fail "Unexpected failure for $*: $output"
  echo "PASS: expected rejection ($pattern)"
}

demo() {
  local id=${DEMO_DEVICE_ID:-DEV-FABRIC-001} intake battery repair first before final other
  intake=$(printf %s 'QaitaPass synthetic intake' | sha256sum | cut -d ' ' -f1)
  battery=$(printf %s 'QaitaPass synthetic battery result' | sha256sum | cut -d ' ' -f1)
  repair=$(printf %s 'QaitaPass synthetic SSD repair' | sha256sum | cut -d ' ' -f1)
  invoke refurbisher registerDevice "$id" "$intake"
  first=$(query reader "$id" | jq -cS '.events[0]')
  invoke diagnostics addDiagnostic "$id" "$battery"
  invoke repairer appendRepair "$id" "$repair"
  query reader "$id" | jq -e '.chronological and (.disputed == false) and (.events | length == 3)'
  invoke reviewer flagDispute "$id" REVIEW_REQUEST
  before=$(query reader "$id" | jq -cS .)
  expect_rejected 'Duplicate device passport' invoke refurbisher registerDevice "$id" "$intake"
  expect_rejected 'Not authorized' invoke reader appendRepair "$id" "$repair"
  expect_rejected 'SHA-256' invoke diagnostics addDiagnostic "$id" not-a-hash
  expect_rejected 'Unknown passport' invoke repairer appendRepair DEV-MISSING-999 "$repair"
  expect_rejected 'Unknown reason code' invoke reviewer flagDispute "$id" INVALID_REASON
  expect_rejected 'Not authorized' query unattributed "$id"
  final=$(query reader "$id" | jq -cS .)
  other=$(query reviewer "$id" | jq -cS .)
  [[ "$before" == "$final" && "$final" == "$other" ]] || fail 'State changed after rejections or peers disagree'
  [[ "$first" == "$(jq -cS '.events[0]' <<< "$final")" ]] || fail 'Original event was modified'
  jq -e --arg id "$id" --arg intake "$intake" --arg battery "$battery" --arg repair "$repair" '
    .deviceId == $id and .chronological and .disputed and
    ([.events[].index] == [0,1,2,3]) and
    ([.events[].supersedes] == [null,0,1,2]) and
    ([.events[].type] == ["DIAGNOSTIC","DIAGNOSTIC","REPAIR","DISPUTE"]) and
    ([.events[].digest] == [$intake,$battery,$repair,null]) and
    ([.events[].issuer] == ["Org1MSP","Org1MSP","Org2MSP","Org2MSP"]) and
    .events[3].status == "REVIEW_REQUEST" and
    ([.events[].txId] | unique | length == 4)
  ' <<< "$final" >/dev/null
  jq . <<< "$final"
  echo 'PASS: Fabric scenario, committed history on both peers, immutable first event and six negative checks'
}

command=${1:-help}
shift || true
case "$command" in
  help|-h|--help) usage; exit 0 ;;
  check) check; exit ;;
  up|all) check ;;
  enroll|deploy|invoke|query|demo|down) ;;
  *) usage; exit 1 ;;
esac
setup_paths
case "$command" in
  up) up ;;
  enroll) enroll ;;
  deploy) deploy ;;
  invoke) invoke "$@" ;;
  query) query "$@" ;;
  demo) demo ;;
  all) up; enroll; deploy; demo ;;
  down) network down ;;
esac
