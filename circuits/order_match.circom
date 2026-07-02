pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/bitify.circom";

/*
 * ZK Dark Pool — Order Match Circuit
 *
 * Proves that two committed orders (a BUY and a SELL) can be validly matched
 * at a given settlement price and amount — without revealing any order details.
 *
 * Private inputs:  priceA, amountA, secretA, traderA  (buyer)
 *                  priceB, amountB, secretB, traderB  (seller)
 *
 * Public inputs:   commitmentA, commitmentB           (on-chain order hashes)
 *                  settlementPrice, settlementAmount   (proposed execution terms)
 *
 * Public outputs:  nullifierA, nullifierB             (mark orders as filled)
 *
 * Constraints proven:
 *   1. commitmentA == Poseidon(priceA, amountA, 0, secretA)   [0 = BUY]
 *   2. commitmentB == Poseidon(priceB, amountB, 1, secretB)   [1 = SELL]
 *   3. priceA >= priceB                                        [match is valid]
 *   4. settlementPrice >= priceB                               [seller gets >= ask]
 *   5. priceA >= settlementPrice                               [buyer pays <= bid]
 *   6. amountA >= settlementAmount                             [buyer has enough]
 *   7. amountB >= settlementAmount                             [seller has enough]
 *   8. nullifierA == Poseidon(secretA, traderA)
 *   9. nullifierB == Poseidon(secretB, traderB)
 */
template OrderMatch() {

    // ── Private inputs ──────────────────────────────────────────────────────
    signal input priceA;          // buyer's max price  (scaled, e.g. 6 decimals)
    signal input amountA;         // buyer's max amount (scaled)
    signal input secretA;         // buyer's blinding factor
    signal input traderA;         // buyer's address hash

    signal input priceB;          // seller's min price
    signal input amountB;         // seller's max amount
    signal input secretB;         // seller's blinding factor
    signal input traderB;         // seller's address hash

    // ── Public inputs ───────────────────────────────────────────────────────
    signal input commitmentA;     // Poseidon(priceA, amountA, 0, secretA)
    signal input commitmentB;     // Poseidon(priceB, amountB, 1, secretB)
    signal input settlementPrice;
    signal input settlementAmount;

    // ── Public outputs ──────────────────────────────────────────────────────
    signal output nullifierA;
    signal output nullifierB;

    // ── 1. Verify order commitments ─────────────────────────────────────────

    component hashA = Poseidon(4);
    hashA.inputs[0] <== priceA;
    hashA.inputs[1] <== amountA;
    hashA.inputs[2] <== 0;        // side: BUY
    hashA.inputs[3] <== secretA;
    commitmentA === hashA.out;

    component hashB = Poseidon(4);
    hashB.inputs[0] <== priceB;
    hashB.inputs[1] <== amountB;
    hashB.inputs[2] <== 1;        // side: SELL
    hashB.inputs[3] <== secretB;
    commitmentB === hashB.out;

    // ── 2. Price compatibility: buyer bid >= seller ask ──────────────────────

    component bidGeAsk = GreaterEqThan(64);
    bidGeAsk.in[0] <== priceA;
    bidGeAsk.in[1] <== priceB;
    bidGeAsk.out === 1;

    // ── 3. Settlement price is within the spread ─────────────────────────────

    component spGeAsk = GreaterEqThan(64);
    spGeAsk.in[0] <== settlementPrice;
    spGeAsk.in[1] <== priceB;
    spGeAsk.out === 1;

    component bidGeSp = GreaterEqThan(64);
    bidGeSp.in[0] <== priceA;
    bidGeSp.in[1] <== settlementPrice;
    bidGeSp.out === 1;

    // ── 4. Settlement amount does not exceed either order ────────────────────

    component amtGeA = GreaterEqThan(64);
    amtGeA.in[0] <== amountA;
    amtGeA.in[1] <== settlementAmount;
    amtGeA.out === 1;

    component amtGeB = GreaterEqThan(64);
    amtGeB.in[0] <== amountB;
    amtGeB.in[1] <== settlementAmount;
    amtGeB.out === 1;

    // ── 5. Nullifiers ─────────────────────────────────────────────────────────

    component nullHashA = Poseidon(2);
    nullHashA.inputs[0] <== secretA;
    nullHashA.inputs[1] <== traderA;
    nullifierA <== nullHashA.out;

    component nullHashB = Poseidon(2);
    nullHashB.inputs[0] <== secretB;
    nullHashB.inputs[1] <== traderB;
    nullifierB <== nullHashB.out;
}

component main {
    public [commitmentA, commitmentB, settlementPrice, settlementAmount]
} = OrderMatch();
