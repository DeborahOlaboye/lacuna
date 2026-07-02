declare module "circomlibjs" {
  export function buildPoseidon(): Promise<{
    (inputs: bigint[]): Uint8Array;
    F: { toString: (h: Uint8Array) => string };
  }>;
  export function buildBabyjub(): Promise<unknown>;
  export function buildEddsa(): Promise<unknown>;
}
