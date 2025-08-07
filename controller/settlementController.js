const {
  getPendingSettlements,
  markSettlementAsPaid,
  getSettlementHistory,
} = require("../model/settlementModel");

exports.fetchPendingSettlements = async (req, res) => {
  try {
    const userId = req.user.id;
    const settlements = await getPendingSettlements(userId);

    const formatted = settlements.map((s) => ({
      id: s.settlement_id,
      transaction_id: s.transaction_id,
      amount_owed: s.amount_owed,
      is_settled: s.is_settled,
      settled_on: s.settled_on,
      description: s.description,
      transaction_date: s.transaction_date,
      total_amount: s.total_amount,
      friend_name: s.paid_by_name,
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ Error fetching pending settlements:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


exports.settleTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { settlement_id } = req.body;

    if (!settlement_id) {
      return res.status(400).json({ error: "Settlement ID is required" });
    }

    const success = await markSettlementAsPaid(settlement_id, userId);

    if (!success) {
      return res.status(404).json({ error: "Settlement not found or already settled" });
    }

    res.json({ message: "Settlement marked as paid" });
  } catch (err) {
    console.error("❌ Error settling transaction:", err);
    res.status(500).json({ error: "Failed to settle transaction" });
  }
};

exports.fetchSettlementHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await getSettlementHistory(userId);
    res.json(history);
  } catch (err) {
    console.error("❌ Error fetching history:", err);
    res.status(500).json({ error: "Failed to fetch settlement history" });
  }
};
