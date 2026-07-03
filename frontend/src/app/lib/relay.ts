"use client";

// Off-chain encrypted relay for private order data.
//
// Architecture:
//  - When a trader submits an order, they encrypt {price, amount, side, secret}
//    with the relay public key (NaCl box / ECIES) and POST the blob to /api/orders.
//  - Any user loading the order book fetches all encrypted blobs, decrypts them
//    with the relay secret key, and gets full private data for every order.
//  - The relay key is hardcoded in the frontend (open source / hackathon).
//    In production it would live in a TEE or MPC network.
//  - On-chain: only commitments and ZK proofs — terms never touch the chain.

import nacl from "tweetnacl";

const RELAY_PUBLIC_KEY  = Uint8Array.from(Buffer.from("503ccc071191cc95dc67eef0ba313e8667183daf7d6128df4bdb0025ce9ea328", "hex"));
const RELAY_SECRET_KEY  = Uint8Array.from(Buffer.from("693eb11896a8fb4bf004df75d04bdff543fc014113a7c05eabc7ba2ca16088e4", "hex"));

export interface PrivateOrderData {
  price:       bigint;
  amount:      bigint;
  side:        "BUY" | "SELL";
  secret:      bigint;
  submittedAt: number; // Unix ms — used for age display in the order book
}

// Encrypt private order data for relay storage.
export function encryptOrderData(data: PrivateOrderData): string {
  const msg = new TextEncoder().encode(JSON.stringify({
    price:       data.price.toString(),
    amount:      data.amount.toString(),
    side:        data.side,
    secret:      data.secret.toString(),
    submittedAt: data.submittedAt,
  }));
  const ephemeral = nacl.box.keyPair();
  const nonce     = nacl.randomBytes(nacl.box.nonceLength);
  const cipher    = nacl.box(msg, nonce, RELAY_PUBLIC_KEY, ephemeral.secretKey);

  // Layout: [32 ephemeralPub | 24 nonce | cipher]
  const blob = new Uint8Array(32 + 24 + cipher.length);
  blob.set(ephemeral.publicKey, 0);
  blob.set(nonce,               32);
  blob.set(cipher,              56);
  return Buffer.from(blob).toString("base64");
}

// Decrypt a relay blob. Returns null if tampered / unrecognised.
export function decryptOrderData(blob: string): PrivateOrderData | null {
  try {
    const bytes      = Buffer.from(blob, "base64");
    const ephPub     = bytes.slice(0, 32);
    const nonce      = bytes.slice(32, 56);
    const cipher     = bytes.slice(56);
    const plain      = nacl.box.open(
      new Uint8Array(cipher),
      new Uint8Array(nonce),
      new Uint8Array(ephPub),
      RELAY_SECRET_KEY
    );
    if (!plain) return null;
    const d = JSON.parse(new TextDecoder().decode(plain));
    return {
      price:       BigInt(d.price),
      amount:      BigInt(d.amount),
      side:        d.side as "BUY" | "SELL",
      secret:      BigInt(d.secret),
      submittedAt: d.submittedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

// Post encrypted blob to relay. Fire-and-forget — non-fatal.
export async function postOrderToRelay(commitment: string, data: PrivateOrderData): Promise<void> {
  const blob = encryptOrderData(data);
  await fetch("/api/orders", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ commitment, blob }),
  });
}

// Fetch all encrypted blobs from relay and decrypt them.
// Returns a map from commitment (decimal string) → private data.
export async function fetchRelayOrders(): Promise<Map<string, PrivateOrderData>> {
  const map = new Map<string, PrivateOrderData>();
  try {
    const res = await fetch("/api/orders");
    if (!res.ok) return map;
    const entries: { commitment: string; blob: string }[] = await res.json();
    for (const { commitment, blob } of entries) {
      const data = decryptOrderData(blob);
      if (data) map.set(commitment, data);
    }
  } catch { /* non-fatal */ }
  return map;
}
