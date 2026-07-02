#![no_std]

use groth16_verifier::{Groth16VerifierClient, Proof, VerificationKey};
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    crypto::bn254::Fr,
    token, Address, BytesN, Env, String, Vec,
};

// ── Storage keys ──────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    Token,          // USDC contract address
    Verifier,       // Groth16Verifier contract address
    VKey,           // Verification key (stored once at init)
    NextOrderId,
    Order(u64),
    Nullifier(BytesN<32>),
}

// ── Types ─────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub struct Order {
    pub trader: Address,
    /// Poseidon(price, amount, side, secret) — hidden order fingerprint
    pub commitment: BytesN<32>,
    /// Max tokens escrowed (buyer: quote amount; seller: base amount)
    pub deposit: i128,
    pub matched: bool,
    pub cancelled: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct MatchResult {
    pub order_id_a: u64,
    pub order_id_b: u64,
    pub settlement_price: i128,
    pub settlement_amount: i128,
}

// ── Errors ───────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum PoolError {
    AlreadyInitialized = 1,
    Unauthorized = 2,
    OrderNotFound = 3,
    OrderAlreadyFilled = 4,
    OrderCancelled = 5,
    NullifierAlreadyUsed = 6,
    InvalidProof = 7,
    InsufficientDeposit = 8,
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct DarkPool;

#[contractimpl]
impl DarkPool {
    // ── Admin ─────────────────────────────────────────────────────────────────

    /// Deploy and configure the pool.
    /// `vk` is the Groth16 verification key for the order_match circuit.
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        verifier: Address,
        vk: VerificationKey,
    ) -> Result<(), PoolError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(PoolError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Verifier, &verifier);
        env.storage().instance().set(&DataKey::VKey, &vk);
        env.storage().instance().set(&DataKey::NextOrderId, &0u64);
        Ok(())
    }

    // ── Trader actions ────────────────────────────────────────────────────────

    /// Submit a hidden order.
    ///
    /// The trader:
    ///  1. Computes commitment = Poseidon(price, amount, side, secret) off-chain.
    ///  2. Deposits `deposit` tokens into escrow.
    ///     • Buyers deposit quote tokens (price × amount, scaled).
    ///     • Sellers deposit base tokens (amount, scaled).
    ///  3. Receives an `order_id` they share with a matcher when ready.
    ///
    /// No price or amount is visible on-chain — only the commitment hash.
    pub fn submit_order(
        env: Env,
        trader: Address,
        commitment: BytesN<32>,
        deposit: i128,
    ) -> Result<u64, PoolError> {
        trader.require_auth();

        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token);

        // Escrow the deposit
        token_client.transfer(&trader, &env.current_contract_address(), &deposit);

        let order_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextOrderId)
            .unwrap_or(0);

        let order = Order {
            trader,
            commitment,
            deposit,
            matched: false,
            cancelled: false,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Order(order_id), &order);
        env.storage()
            .instance()
            .set(&DataKey::NextOrderId, &(order_id + 1));

        env.events().publish(
            (String::from_str(&env, "order_submitted"), order_id),
            order.commitment,
        );

        Ok(order_id)
    }

    /// Cancel an unmatched order and reclaim the escrowed deposit.
    pub fn cancel_order(env: Env, order_id: u64) -> Result<(), PoolError> {
        let mut order: Order = env
            .storage()
            .persistent()
            .get(&DataKey::Order(order_id))
            .ok_or(PoolError::OrderNotFound)?;

        order.trader.require_auth();

        if order.matched {
            return Err(PoolError::OrderAlreadyFilled);
        }
        if order.cancelled {
            return Err(PoolError::OrderCancelled);
        }

        order.cancelled = true;
        env.storage()
            .persistent()
            .set(&DataKey::Order(order_id), &order);

        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token).transfer(
            &env.current_contract_address(),
            &order.trader,
            &order.deposit,
        );

        Ok(())
    }

    // ── Matcher actions ───────────────────────────────────────────────────────

    /// Match two orders by submitting a valid Groth16 proof.
    ///
    /// Anyone can call this — the matcher is permissionless.
    /// The ZK proof asserts (without revealing):
    ///   • Both commitment openings are correct
    ///   • Buyer price ≥ seller price
    ///   • Settlement price is within the spread
    ///   • Settlement amount ≤ min(buyer amount, seller amount)
    ///   • Nullifiers are correctly derived from secrets + trader addresses
    ///
    /// On success:
    ///   • Buyer receives `settlement_amount` (base tokens equivalent)
    ///   • Seller receives `settlement_price × settlement_amount` (quote)
    ///   • Remaining deposits are refunded
    pub fn match_orders(
        env: Env,
        order_id_a: u64,   // buyer order
        order_id_b: u64,   // seller order
        proof: Proof,
        pub_signals: Vec<Fr>,
        nullifier_a: BytesN<32>,
        nullifier_b: BytesN<32>,
        settlement_price: i128,
        settlement_amount: i128,
    ) -> Result<MatchResult, PoolError> {
        // Load orders
        let mut order_a: Order = env
            .storage()
            .persistent()
            .get(&DataKey::Order(order_id_a))
            .ok_or(PoolError::OrderNotFound)?;
        let mut order_b: Order = env
            .storage()
            .persistent()
            .get(&DataKey::Order(order_id_b))
            .ok_or(PoolError::OrderNotFound)?;

        if order_a.matched || order_a.cancelled {
            return Err(PoolError::OrderAlreadyFilled);
        }
        if order_b.matched || order_b.cancelled {
            return Err(PoolError::OrderAlreadyFilled);
        }

        // Nullifier replay protection
        if env
            .storage()
            .persistent()
            .has(&DataKey::Nullifier(nullifier_a.clone()))
        {
            return Err(PoolError::NullifierAlreadyUsed);
        }
        if env
            .storage()
            .persistent()
            .has(&DataKey::Nullifier(nullifier_b.clone()))
        {
            return Err(PoolError::NullifierAlreadyUsed);
        }

        // ZK proof verification
        let verifier_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::Verifier)
            .unwrap();
        let vk: VerificationKey = env.storage().instance().get(&DataKey::VKey).unwrap();
        let verifier = Groth16VerifierClient::new(&env, &verifier_addr);

        let valid = verifier.verify_proof(&vk, &proof, &pub_signals);
        if !valid {
            return Err(PoolError::InvalidProof);
        }

        // Mark nullifiers consumed
        env.storage()
            .persistent()
            .set(&DataKey::Nullifier(nullifier_a), &true);
        env.storage()
            .persistent()
            .set(&DataKey::Nullifier(nullifier_b), &true);

        // Mark orders matched
        order_a.matched = true;
        order_b.matched = true;
        env.storage()
            .persistent()
            .set(&DataKey::Order(order_id_a), &order_a);
        env.storage()
            .persistent()
            .set(&DataKey::Order(order_id_b), &order_b);

        // Settlement: token transfers
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token);

        // Quote value the buyer pays
        let quote_value = settlement_price
            .checked_mul(settlement_amount)
            .unwrap_or(0)
            / 1_000_000; // price has 6 decimal places

        // Buyer receives base tokens (settlement_amount)
        token_client.transfer(
            &env.current_contract_address(),
            &order_a.trader,
            &settlement_amount,
        );
        // Seller receives quote tokens
        token_client.transfer(
            &env.current_contract_address(),
            &order_b.trader,
            &quote_value,
        );

        // Refund buyer's excess deposit
        let buyer_refund = order_a.deposit - quote_value;
        if buyer_refund > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &order_a.trader,
                &buyer_refund,
            );
        }
        // Refund seller's excess deposit
        let seller_refund = order_b.deposit - settlement_amount;
        if seller_refund > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &order_b.trader,
                &seller_refund,
            );
        }

        let result = MatchResult {
            order_id_a,
            order_id_b,
            settlement_price,
            settlement_amount,
        };

        env.events().publish(
            (String::from_str(&env, "orders_matched"),),
            result.clone(),
        );

        Ok(result)
    }

    // ── View functions ────────────────────────────────────────────────────────

    pub fn get_order(env: Env, order_id: u64) -> Option<Order> {
        env.storage().persistent().get(&DataKey::Order(order_id))
    }

    pub fn order_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::NextOrderId)
            .unwrap_or(0)
    }

    pub fn is_nullifier_used(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Nullifier(nullifier))
    }
}
