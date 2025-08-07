const db = require("../config/db");
const { decrypt } = require("../utils/crypto");

exports.fetchSharedExpenses = async (userId) => {
  const [transactions] = await db.query(`
    SELECT DISTINCT
      t.id AS transaction_id,
      t.description,
      t.amount,
      t.paid_by,
      t.transaction_date,
      t.created_at,
      u.name AS paid_by_name
    FROM transactions t
    JOIN users u ON u.id = t.paid_by
    JOIN shared_transaction_users stu ON stu.transaction_id = t.id
    WHERE t.is_shared = 1
      AND (t.paid_by = ? OR stu.user_id = ?)
    ORDER BY t.transaction_date DESC
  `, [userId, userId]);

  for (const tx of transactions) {
    // 🔓 Decrypt encrypted fields
    tx.amount = parseFloat(decrypt(tx.amount));
    tx.description = decrypt(tx.description || "");

    // 📅 Format date
    tx.transaction_date_formatted = new Date(tx.transaction_date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    // 👥 Get all participants
    const [participants] = await db.query(`
      SELECT 
        stu.user_id,
        u.name,
        stu.amount_owed,
        stu.is_settled
      FROM shared_transaction_users stu
      JOIN users u ON u.id = stu.user_id
      WHERE stu.transaction_id = ?
    `, [tx.transaction_id]);

    // 🔍 Decrypt participant shares + mark 'You'
    let yourShare = 0;
    let totalOwedToYou = 0;

    tx.participants = participants.map(p => {
      const amountOwed = parseFloat(decrypt(p.amount_owed));
      
      if (p.user_id === userId && tx.paid_by !== userId) {
        yourShare = amountOwed;
      }

      if (tx.paid_by === userId && p.user_id !== userId) {
        totalOwedToYou += amountOwed;
      }

      return {
        user_id: p.user_id,
        name: p.user_id === userId ? "You" : p.name,
        amount_owed: amountOwed,
        is_settled: p.is_settled
      };
    });

    // ✅ Add additional fields needed for frontend
    tx.your_share = yourShare;                     // How much the current user owes
    tx.total_owed_to_you = totalOwedToYou;         // How much others owe current user
    tx.current_user_id = userId;                   // To compare in frontend
  }

  return transactions;
};
