"use strict";

const { buildPoseidon } = require("circomlibjs");
const snarkjs = require("snarkjs");
const path = require("path");
const fs = require("fs");

const KEYS_DIR = path.join(__dirname, "../keys");
const CIRCUIT_WASM = path.join(KEYS_DIR, "order_match_js/order_match.wasm");
const ZKEY = path.join(KEYS_DIR, "order_match_final.zkey");
const VK_JSON = path.join(KEYS_DIR, "verification_key.json");

// Scale factor: prices and amounts use 6 decimal places
// e.g. $1.50 = 1_500_000
const SCALE = 1_000_000n;

let _poseidon = null;
async function getPoseidon() {
  if (!_poseidon) _poseidon = await buildPoseidon();
  return _poseidon;
}

/**
 * Compute the Poseidon commitment for an order.
 * commitment = Poseidon(price, amount, side, secret)
 * side: 0 = BUY, 1 = SELL
 */
async function computeCommitment(price, amount, side, secret) {
  const poseidon = await getPoseidon();
  const hash = poseidon([
    BigInt(price),
    BigInt(amount),
    BigInt(side),
    BigInt(secret),
  ]);
  return poseidon.F.toString(hash);
}

/**
 * Compute a nullifier for an order.
 * nullifier = Poseidon(secret, traderAddressHash)
 */
async function computeNullifier(secret, traderHash) {
  const poseidon = await getPoseidon();
  const hash = poseidon([BigInt(secret), BigInt(traderHash)]);
  return poseidon.F.toString(hash);
}

/**
 * Convert a Stellar account public key (G) to a field element for use in circuits.
 * We hash the account ID bytes with Poseidon to get a single field element.
 */
async function accountToField(accountId) {
  const poseidon = await getPoseidon();
  // Use the raw bytes of the account ID (strkey decoded)
  const { StrKey } = require("@stellar/stellar-sdk");
  const raw = StrKey.decodeEd25519PublicKey(accountId);
  // Convert to two 128-bit chunks to fit in field elements
  const lo = BigInt("0x" + Buffer.from(raw.slice(0, 16)).toString("hex"));
  const hi = BigInt("0x" + Buffer.from(raw.slice(16, 32)).toString("hex"));
  const hash = poseidon([lo, hi]);
  return poseidon.F.toString(hash);
}

/**
 * Generate a Groth16 proof for an order match.
 *
 * orderA: { price, amount, secret, traderHash }  — BUY order
 * orderB: { price, amount, secret, traderHash }  — SELL order
 * settlement: { price, amount }
 */
async function generateMatchProof(orderA, orderB, settlement) {
  const commitmentA = await computeCommitment(
    orderA.price,
    orderA.amount,
    0,
    orderA.secret
  );
  const commitmentB = await computeCommitment(
    orderB.price,
    orderB.amount,
    1,
    orderB.secret
  );

  const input = {
    // Private
    priceA: orderA.price.toString(),
    amountA: orderA.amount.toString(),
    secretA: orderA.secret.toString(),
    traderA: orderA.traderHash.toString(),
    priceB: orderB.price.toString(),
    amountB: orderB.amount.toString(),
    secretB: orderB.secret.toString(),
    traderB: orderB.traderHash.toString(),
    // Public
    commitmentA,
    commitmentB,
    settlementPrice: settlement.price.toString(),
    settlementAmount: settlement.amount.toString(),
  };

  console.log("Generating Groth16 proof...");
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    CIRCUIT_WASM,
    ZKEY
  );

  // Verify locally before returning
  const vk = JSON.parse(fs.readFileSync(VK_JSON, "utf8"));
  const valid = await snarkjs.groth16.verify(vk, publicSignals, proof);
  if (!valid) throw new Error("Local proof verification failed");

  console.log("Proof verified locally ✓");

  return {
    proof,
    publicSignals,
    commitmentA,
    commitmentB,
    nullifierA: publicSignals[4],
    nullifierB: publicSignals[5],
  };
}

/**
 * Convert a snarkjs G1 point to 64-byte hex string (Soroban BN254 format).
 * G1: x (32 BE bytes) || y (32 BE bytes)
 */
function g1ToHex(point) {
  const x = BigInt(point[0]).toString(16).padStart(64, "0");
  const y = BigInt(point[1]).toString(16).padStart(64, "0");
  return x + y;
}

/**
 * Convert a snarkjs G2 point to 128-byte hex string (Soroban BN254 format).
 * Soroban G2: c1 (32 BE) || c0 (32 BE) || d1 (32 BE) || d0 (32 BE)
 * where X = c0 + c1*i  and  Y = d0 + d1*i  (snarkjs: [[c1,c0],[d1,d0]])
 */
function g2ToHex(point) {
  const c1 = BigInt(point[0][0]).toString(16).padStart(64, "0");
  const c0 = BigInt(point[0][1]).toString(16).padStart(64, "0");
  const d1 = BigInt(point[1][0]).toString(16).padStart(64, "0");
  const d0 = BigInt(point[1][1]).toString(16).padStart(64, "0");
  return c1 + c0 + d1 + d0;
}

/**
 * Convert a field element (BigInt or string) to 32-byte big-endian hex.
 */
function frToHex(value) {
  return BigInt(value).toString(16).padStart(64, "0");
}

/**
 * Convert snarkjs proof to Soroban-compatible hex strings.
 */
function proofToSoroban(proof) {
  return {
    a: g1ToHex(proof.pi_a),
    b: g2ToHex(proof.pi_b),
    c: g1ToHex(proof.pi_c),
  };
}

/**
 * Convert snarkjs verification key to Soroban VerificationKey format.
 */
function vkToSoroban(vk) {
  return {
    alpha: g1ToHex(vk.vk_alpha_1),
    beta: g2ToHex(vk.vk_beta_2),
    gamma: g2ToHex(vk.vk_gamma_2),
    delta: g2ToHex(vk.vk_delta_2),
    ic: vk.IC.map((pt) => g1ToHex(pt)),
  };
}

module.exports = {
  SCALE,
  KEYS_DIR,
  VK_JSON,
  computeCommitment,
  computeNullifier,
  accountToField,
  generateMatchProof,
  g1ToHex,
  g2ToHex,
  frToHex,
  proofToSoroban,
  vkToSoroban,
};
