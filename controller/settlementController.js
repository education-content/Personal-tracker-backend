// controller/settlementController.js
const model = require("../model/settlementModel");
const db = require("../config/db")

/**
 * GET /settlements/summary
 */
exports.getSummary = async (req, res) => {
  const userId = req.user.id;
  try {
    const data = await model.getNetSettlements(userId);
    // Return a consistent shape for frontend
    res.json(data);
  } catch (err) {
    console.error("❌ [settlementController.getSummary] Error:", err);
    res.status(500).json({ error: "Failed to load settlement summary" });
  }
};

/**
 * GET /settlements/breakup/:friendId
 */
exports.getBreakup = async (req, res) => {
  const userId = req.user.id;
  const friendId = parseInt(req.params.friendId, 10);
  if (isNaN(friendId)) return res.status(400).json({ error: "Invalid friendId" });

  try {
    const data = await model.getSettlementBreakup(userId, friendId);
    res.json(data);
  } catch (err) {
    console.error("❌ [settlementController.getBreakup] Error:", err);
    res.status(500).json({ error: "Failed to load settlement breakup" });
  }
};

/**
 * POST /settlements/settle
 * Body: { settlement_id }
 * Action: payer (debtor) marks a specific shared_transaction_users row as paid (claim)
 */
exports.settle = async (req, res) => {
  const userId = req.user.id;
  const { settlement_id } = req.body;
  if (!settlement_id) return res.status(400).json({ error: "settlement_id required" });

  try {
    const ok = await model.markAsPaid(settlement_id, userId);
    if (!ok) return res.status(400).json({ error: "Unable to mark as paid (invalid id or already settled)" });
    res.json({ message: "Marked as paid (claim recorded). Waiting for receiver confirmation." });
  } catch (err) {
    console.error("❌ [settlementController.settle] Error:", err);
    res.status(500).json({ error: "Failed to mark as paid" });
  }
};

/**
 * POST /settlements/confirm
 * Body: { settlement_id }
 * Action: receiver (original payer) confirms the claim -> finalize settlement and update balances
 */
exports.confirm = async (req, res) => {
  const receiverId = req.user?.id;
  if (!receiverId) {
    return res.status(401).json({ error: "Unauthorized: receiverId missing" });
  }

  const { settlement_ids } = req.body;

  if (!Array.isArray(settlement_ids) || settlement_ids.length === 0) {
    return res.status(400).json({ error: "settlement_ids array required" });
  }

  try {
    const results = await Promise.allSettled(
      settlement_ids.map((id) => model.confirmSettlement(id, receiverId))
    );

    const confirmed = [];
    const failed = [];

    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) {
        confirmed.push(settlement_ids[i]);
      } else {
        failed.push(settlement_ids[i]);
      }
    });

    return res.json({
      message: "Confirmation process completed",
      confirmed,
      failed
    });
  } catch (err) {
    console.error("❌ [settlementController.confirm] Error:", err);
    return res.status(500).json({ error: err.message || "Failed to confirm settlements" });
  }
};





/**
 * POST /settlements/cancel
 * Body: { settlement_id }
 * Action: payer cancels a previously marked-as-paid claim
 */
exports.cancel = async (req, res) => {
  const userId = req.user.id;
  const { settlement_id } = req.body;
  if (!settlement_id) return res.status(400).json({ error: "settlement_id required" });

  try {
    const ok = await model.cancelClaim(settlement_id, userId);
    if (!ok) return res.status(400).json({ error: "Unable to cancel claim (invalid id or not in claimed state)." });
    res.json({ message: "Claim cancelled" });
  } catch (err) {
    console.error("❌ [settlementController.cancel] Error:", err);
    res.status(500).json({ error: "Failed to cancel claim" });
  }
};

exports.confirmSettlement = async (req, res) => {
  const receiverId = req.user.id;
  const { settlement_ids } = req.body;

  if (!settlement_ids) {
    return res.status(400).json({ error: "settlement_id is required" });
  }

  try {
    const result = await model.confirmSettlement(settlement_ids, receiverId);
    res.json(result);
  } catch (err) {
    console.error("❌ [settlementController.confirmSettlement] Error:", err);
    res.status(400).json({ error: err.message || "Failed to confirm settlement" });
  }
};

exports.claimPayment = async (req, res) => {
  try {
    const { friend_id, settlement_ids } = req.body;

    if (!friend_id || !Array.isArray(settlement_ids) || settlement_ids.length === 0) {
      return res.status(400).json({ error: "Friend ID and settlement IDs are required" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const ok = await model.claimPayment(settlement_ids, userId);

    if (!ok) {
      return res.status(400).json({ error: "Unable to mark as paid (invalid IDs or not your settlements)" });
    }

    res.json({ message: "Marked as paid. Waiting for other person's confirmation." });
  } catch (err) {
    console.error("❌ [settlementController.claimPayment] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getPendingConfirmations = async (req, res) => {
  const receiverId = req.user.id;

  try {
    const data = await model.getPendingConfirmations(receiverId);
    console.log(data);
    res.json(data);
  } catch (err) {
    console.error("❌ [settlementController.getPendingConfirmations] Error:", err);
    res.status(500).json({ error: "Failed to load pending confirmations" });
  }
};



