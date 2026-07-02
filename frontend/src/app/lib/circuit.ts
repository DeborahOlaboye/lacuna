"use client";

import type { ProofOutput } from "./types";

const WASM_PATH = "/circuit/order_match.wasm";
const ZKEY_PATH = "/circuit/order_match_final.zkey";

let poseidon: ((inputs: bigint[]) => Uint8Array) & { F: { toString: (h: Uint8Array) => string } };

async function getPoseidon() {
  if (poseidon) return poseidon;
  const { buildPoseidon } = await import("circomlibjs");
  poseidon = await buildPoseidon();
  return poseidon;
}

export async function computeCommitment(
  price: bigint,
  amount: bigint,
  side: 0n | 1n,
  secret: bigint
): Promise<string> {
  const p = await getPoseidon();
  const hash = p([price, amount, side, secret]);
  return p.F.toString(hash);
}

export async function computeNullifier(
  secret: bigint,
  traderHash: bigint
): Promise<string> {
  const p = await getPoseidon();
  const hash = p([secret, traderHash]);
  return p.F.toString(hash);
}

export async function accountToField(accountId: string): Promise<bigint> {
  const { StrKey } = await import("@stellar/stellar-sdk");
  const raw = StrKey.decodeEd25519PublicKey(accountId);
  const p = await getPoseidon();
  const lo = BigInt("0x" + Buffer.from(raw.slice(0, 16)).toString("hex"));
  const hi = BigInt("0x" + Buffer.from(raw.slice(16, 32)).toString("hex"));
  const hash = p([lo, hi]);
  return BigInt(p.F.toString(hash));
}

export function randomSecret(): bigint {
  const bytes = new Uint8Array(30);
  crypto.getRandomValues(bytes);
  return BigInt(
    "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")
  );
}

export async function generateMatchProof(
  orderA: { price: bigint; amount: bigint; secret: bigint; traderHash: bigint },
  orderB: { price: bigint; amount: bigint; secret: bigint; traderHash: bigint },
  settlement: { price: bigint; amount: bigint }
): Promise<ProofOutput> {
  const { groth16 } = await import("snarkjs");

  const commitmentA = await computeCommitment(orderA.price, orderA.amount, 0n, orderA.secret);
  const commitmentB = await computeCommitment(orderB.price, orderB.amount, 1n, orderB.secret);

  const input = {
    priceA:           orderA.price.toString(),
    amountA:          orderA.amount.toString(),
    secretA:          orderA.secret.toString(),
    traderA:          orderA.traderHash.toString(),
    priceB:           orderB.price.toString(),
    amountB:          orderB.amount.toString(),
    secretB:          orderB.secret.toString(),
    traderB:          orderB.traderHash.toString(),
    commitmentA,
    commitmentB,
    settlementPrice:  settlement.price.toString(),
    settlementAmount: settlement.amount.toString(),
  };

  const { proof, publicSignals } = await groth16.fullProve(input, WASM_PATH, ZKEY_PATH);

  // snarkjs outputs come first: [nullifierA, nullifierB, commitmentA, commitmentB, settlementPrice, settlementAmount]
  return {
    proof,
    publicSignals,
    commitmentA,
    commitmentB,
    nullifierA: publicSignals[0],
    nullifierB: publicSignals[1],
  };
}
