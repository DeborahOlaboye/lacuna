# Lacuna on Stellar

A privacy-preserving institutional order matching system built on Stellar using zero-knowledge proofs.

> Submitted to **Stellar Hacks: Real-World ZK** (June 2026)

## Live Contracts (Stellar Testnet)

| Contract | Address |
|---|---|
| Groth16 Verifier | [`CAGMPY2HGLNLLIYYXGRQ7ZJ3QUXPKUXHTEJL2ZZABHVFMGVK7HLIYZSF`](https://stellar.expert/explorer/testnet/contract/CAGMPY2HGLNLLIYYXGRQ7ZJ3QUXPKUXHTEJL2ZZABHVFMGVK7HLIYZSF) |
| Dark Pool | [`CBSCCHS6HTZWS6YDIU6MOBGGA4654XLIMRI7F3YVPGB2DG3N4WBCMFJF`](https://stellar.expert/explorer/testnet/contract/CBSCCHS6HTZWS6YDIU6MOBGGA4654XLIMRI7F3YVPGB2DG3N4WBCMFJF) |
| XLM Token (SAC) | [`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC) |

Initialization TX: [`2acbb23d...`](https://stellar.expert/explorer/testnet/tx/2acbb23da50ea76d819b34e7eba3b8c8f629eb6f3d99bfdedd20140f872724f5)

---

## What is this?

A dark pool is a private exchange where large institutional orders execute without revealing price or size to the market — preventing front-running. In traditional finance, dark pools handle 30–40% of all US equity trading. On public blockchains, this hasn't existed because everything is transparent.

This project brings dark pool mechanics to Stellar using zero-knowledge proofs:

- Traders submit **hidden order commitments** — only a Poseidon hash goes on-chain
- A permissionless matcher generates a **Groth16 ZK proof** that two orders are compatible (buyer bid ≥ seller ask, settlement price is within spread, amounts valid)
- The Stellar Soroban contract **verifies the BN254 pairing on-chain** — no price or amount is ever revealed
- On valid proof: tokens are transferred, nullifiers stored, orders closed

**No price is ever revealed. No amount is ever revealed. Anyone can be the matcher.**

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  OFF-CHAIN                       │
│                                                  │
│  Trader A                  Trader B              │
│  (BUY: price=1.01,         (SELL: price=1.00,   │
│   amount=300 USDC)          amount=300 USDC)     │
│       │                         │                │
│       └──── Poseidon hash ───── ┘                │
│                  │                               │
│            commitmentA, commitmentB              │
│                  │                               │
│              Matcher                             │
│    generates Groth16 proof:                      │
│    • commitments open correctly                  │
│    • priceA ≥ priceB                             │
│    • settlement within spread                    │
│    • amounts valid                               │
│    • nullifiers computed                         │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│                  ON-CHAIN (Stellar)              │
│                                                  │
│  DarkPool contract                               │
│  ├── submit_order(commitment, deposit)           │
│  ├── match_orders(proof, pub_signals)            │
│  │     └── calls Groth16Verifier                 │
│  │           └── BN254 pairing_check             │
│  │                  (Protocol 25 host fn)         │
│  └── settle: transfer tokens to both parties     │
└─────────────────────────────────────────────────┘
```

---

## ZK Circuit

**File**: `circuits/order_match.circom`

The circuit proves (without revealing any private values):

| Constraint | What it proves |
|---|---|
| `commitmentA = Poseidon(priceA, amountA, 0, secretA)` | Buyer's commitment is honest |
| `commitmentB = Poseidon(priceB, amountB, 1, secretB)` | Seller's commitment is honest |
| `priceA >= priceB` | A valid match exists |
| `settlementPrice >= priceB` | Seller gets at least their ask |
| `priceA >= settlementPrice` | Buyer pays at most their bid |
| `amountA >= settlementAmount` | Buyer's order covers the fill |
| `amountB >= settlementAmount` | Seller's order covers the fill |
| `nullifierA = Poseidon(secretA, traderA)` | Replay prevention for buyer |
| `nullifierB = Poseidon(secretB, traderB)` | Replay prevention for seller |

**Stats**: 1,411 non-linear constraints · Groth16 · BN254 curve

---

## Soroban Contracts

### `groth16_verifier`
Standalone Groth16 verifier using Stellar's BN254 host functions (Protocol 25).

```rust
pub fn verify_proof(vk: VerificationKey, proof: Proof, pub_signals: Vec<Fr>) -> Result<bool, VerifierError>
```

Implements: `e(-A, B) · e(α, β) · e(vk_x, γ) · e(C, δ) == 1`

### `dark_pool`
Main trading contract.

```rust
pub fn submit_order(trader, commitment, deposit) -> u64
pub fn match_orders(order_id_a, order_id_b, proof, pub_signals, ...) -> MatchResult
pub fn cancel_order(order_id) -> ()
pub fn get_order(order_id) -> Option<Order>
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| ZK circuit | Circom 2.2.3 |
| Proof system | Groth16 (BN254) |
| Hash function | Poseidon (ZK-friendly, native on Stellar) |
| Proof generation | snarkjs (browser WASM) |
| Smart contracts | Rust + Soroban SDK v25 |
| On-chain ZK verify | BN254 `pairing_check` host function (Protocol 25) |
| Frontend | Next.js 16 + Tailwind CSS |
| Network | Stellar Testnet |

---

## Project Structure

```
lacuna/
├── circuits/
│   └── order_match.circom        # ZK circuit (1,411 constraints)
├── contracts/
│   ├── groth16_verifier/         # Standalone BN254 Groth16 verifier
│   └── dark_pool/                # Main pool contract
├── scripts/
│   ├── utils.js                  # Shared: proof gen, key conversion
│   ├── deploy.js                 # Deploy to testnet
│   └── demo.js                   # End-to-end CLI demo
├── keys/
│   ├── verification_key.json     # Groth16 verification key
│   ├── order_match_final.zkey    # Proving key
│   └── order_match_js/           # WASM prover
├── frontend/                     # Next.js app
│   ├── src/app/
│   │   ├── page.tsx              # Main dark pool UI
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── OrderForm.tsx     # Submit hidden order
│   │   │   ├── OrderBook.tsx     # Commitment-only order list
│   │   │   └── MatchPanel.tsx    # ZK proof generation + matching
│   │   └── lib/
│   │       ├── circuit.ts        # Browser-side Poseidon + proof gen
│   │       └── types.ts
│   └── public/circuit/           # WASM + zkey served statically
└── Cargo.toml                    # Rust workspace
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Rust + `wasm32v1-none` target
- circom 2.x
- Stellar CLI v25+

### 1. Install dependencies

```bash
# Circuit tools
npm install -g snarkjs
# (circom already compiled — see circuits/README)

# Script dependencies
cd scripts && npm install

# Frontend
cd frontend && npm install
```

### 2. Trusted setup (already done — keys included)

```bash
cd circuits
snarkjs powersoftau new bn128 12 pot12_0000.ptau
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="Contribution"
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau
snarkjs groth16 setup order_match.r1cs pot12_final.ptau order_match_0000.zkey
snarkjs zkey contribute order_match_0000.zkey order_match_final.zkey
snarkjs zkey export verificationkey order_match_final.zkey verification_key.json
```

### 3. Build contracts

```bash
cargo build --target wasm32v1-none --release
```

### 4. Deploy to testnet

```bash
# Configure Stellar CLI with a testnet account first
stellar keys generate --global default --network testnet

cd scripts
node deploy.js --network testnet
```

### 5. Run CLI demo

```bash
cd scripts
node demo.js --network testnet
```

### 6. Run frontend

```bash
cd frontend
npm run dev
# Open http://localhost:3000
```

---

## How the Demo Works

1. **Connect wallet** — click "Connect Wallet" (demo mode generates a test address)
2. **Submit a BUY order** — enter price $1.01, amount 300 USDC → commitment computed client-side, nothing sent on-chain yet
3. **Submit a SELL order** — enter price $1.00, amount 300 USDC
4. **Select both orders** in the order book — the UI shows price compatibility
5. **Click "Generate Proof & Match"** — snarkjs runs the Groth16 prover in the browser (~15-30s), then submits the proof to Stellar
6. **Settlement** — both traders receive their tokens; the entire order book saw only commitment hashes

---

## Why Zero-Knowledge?

Without ZK, a public blockchain dark pool is a contradiction in terms — all order details are visible to everyone, enabling front-running and MEV extraction.

With ZK:
- **Confidentiality**: Price and amount stay private forever, even after settlement
- **Correctness**: The match is proven valid without revealing the inputs
- **Permissionless matching**: Anyone can be a matcher — they only learn the public settlement terms, not the private order details
- **Composability**: Any Stellar dApp can call `is_nullifier_used()` or `get_order()` without seeing private data

This is the first dark pool on Stellar, and one of the first ZK-native dark pools on any blockchain.

---

## Resources

- [ZK Proofs on Stellar](https://developers.stellar.org/docs/build/apps/zk)
- [Soroban BN254 SDK docs](https://docs.rs/soroban-sdk/latest/soroban_sdk/_migrating/v25_bn254/index.html)
- [Circom documentation](https://docs.circom.io/)
- [snarkjs](https://github.com/iden3/snarkjs)
- [Stellar Private Payments PoC](https://github.com/NethermindEth/stellar-private-payments) (inspiration for verifier pattern)

---

## Disclaimer

This is a hackathon prototype. The trusted setup uses a non-production ceremony. Do not use with real assets. The contracts have not been audited.
