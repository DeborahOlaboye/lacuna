"use client";

import type { Order } from "./types";

// Persists private order data (price, amount, side, secret) in localStorage
// keyed by wallet address. Commitment + deposit are also stored so the full
// Order can be reconstructed without chain calls.

const KEY = (addr: string) => `lacuna_orders_${addr}`;

interface StoredOrder {
  id: number;
  onChainId?: number;
  side: string;
  commitment: string;
  deposit: string;   // bigint serialised as string
  trader: string;
  matched: boolean;
  cancelled: boolean;
  txHash?: string;
  _price?: string;
  _amount?: string;
  _secret?: string;
}

export function loadOrders(walletAddress: string): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY(walletAddress));
    if (!raw) return [];
    const stored: StoredOrder[] = JSON.parse(raw);
    return stored.map((o) => ({
      id:          o.id,
      onChainId:   o.onChainId,
      side:        o.side as Order["side"],
      commitment:  o.commitment,
      deposit:     BigInt(o.deposit),
      trader:      o.trader,
      matched:     o.matched,
      cancelled:   o.cancelled,
      txHash:      o.txHash,
      _price:      o._price  !== undefined ? BigInt(o._price)  : undefined,
      _amount:     o._amount !== undefined ? BigInt(o._amount) : undefined,
      _secret:     o._secret !== undefined ? BigInt(o._secret) : undefined,
    }));
  } catch {
    return [];
  }
}

export function saveOrders(walletAddress: string, orders: Order[]): void {
  if (typeof window === "undefined") return;
  try {
    const stored: StoredOrder[] = orders.map((o) => ({
      id:         o.id,
      onChainId:  o.onChainId,
      side:       o.side,
      commitment: o.commitment,
      deposit:    o.deposit.toString(),
      trader:     o.trader,
      matched:    o.matched,
      cancelled:  o.cancelled,
      txHash:     o.txHash,
      _price:     o._price  !== undefined ? o._price.toString()  : undefined,
      _amount:    o._amount !== undefined ? o._amount.toString() : undefined,
      _secret:    o._secret !== undefined ? o._secret.toString() : undefined,
    }));
    localStorage.setItem(KEY(walletAddress), JSON.stringify(stored));
  } catch {
    // localStorage full or unavailable — silent fail
  }
}

/**
 * Merge chain orders (no private data) with locally stored orders (have private data).
 * Locally stored orders are the source of truth for private fields;
 * chain orders are the source of truth for matched/cancelled state.
 */
export function mergeOrders(local: Order[], chain: Order[]): Order[] {
  const byOnChainId = new Map<number, Order>();
  for (const o of local) {
    if (o.onChainId !== undefined) byOnChainId.set(o.onChainId, o);
  }

  const merged: Order[] = [];
  const seenOnChainIds = new Set<number>();

  // Update local orders with latest chain state
  for (const o of local) {
    const chainVersion = o.onChainId !== undefined ? chain.find((c) => c.onChainId === o.onChainId) : undefined;
    merged.push({
      ...o,
      matched:   chainVersion?.matched   ?? o.matched,
      cancelled: chainVersion?.cancelled ?? o.cancelled,
    });
    if (o.onChainId !== undefined) seenOnChainIds.add(o.onChainId);
  }

  // Add chain orders that aren't in local store (other traders' orders — no private data)
  for (const co of chain) {
    if (co.onChainId !== undefined && !seenOnChainIds.has(co.onChainId)) {
      merged.push(co);
    }
  }

  return merged;
}
