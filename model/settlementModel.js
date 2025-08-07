const db = require("../config/db");
const { decrypt, encrypt } = require("../utils/crypto");

/**
 * Fetch pending settlements for a user
 */
exports.getPendingSettlements = async (userId) => {
  console.log("📌 [getPendingSettlements] userId:", userId);
  try {
    const [rows] = await db.query(
      `
      SELECT 
        stu.id AS id,
        stu.transaction_id,
        stu.amount_owed,
        stu.is_settled,
        stu.settled_on,
        stu.confirmed AS is_confirmed,
        t.description,
        t.transaction_date,
        t.amount AS total_amount,
        t.paid_by,
        u.name AS friend_name
      FROM shared_transaction_users stu
      JOIN transactions t ON stu.transaction_id = t.id
      JOIN users u ON t.paid_by = u.id
      WHERE stu.user_id = ? AND stu.is_settled = false
      ORDER BY t.transaction_date DESC
      `,
      [userId]
    );

    const decryptedRows = rows.map((row) => ({
      id: row.id,
      transaction_id: row.transaction_id,
      friend_name: row.friend_name,
      description: row.description || "",
      transaction_date: row.transaction_date,
      is_settled: row.is_settled,
      settled_on: row.settled_on,
      is_confirmed: row.is_confirmed,
      owed_by_user: userId, // The current user owes this
      amount_owed: parseFloat(decrypt(row.amount_owed)),
      total_amount: parseFloat(decrypt(row.total_amount)),
    }));

    console.log("✅ [getPendingSettlements] rows fetched:", decryptedRows.length);
    return decryptedRows;
  } catch (error) {
    console.error("❌ [getPendingSettlements] Error:", error);
    throw error;
  }
};

/**
 * Mark settlement as paid (request confirmation)
 */
exports.markSettlementAsPaid = async (settlementId, userId) => {
  console.log("📌 [markSettlementAsPaid] settlementId:", settlementId, "userId:", userId);
  try {
    const [result] = await db.query(
      `
      UPDATE shared_transaction_users 
      SET confirmed = false -- Marked as payment initiated, waiting for confirmation
      WHERE id = ? AND user_id = ?
      `,
      [settlementId, userId]
    );
    console.log("✅ [markSettlementAsPaid] affected rows:", result.affectedRows);
    return result.affectedRows === 1;
  } catch (error) {
    console.error("❌ [markSettlementAsPaid] Error:", error);
    throw error;
  }
};

/**
 * Confirm that the payment has been received
 */
exports.confirmSettlement = async (settlementId, userId) => {
  console.log("📌 [confirmSettlement] settlementId:", settlementId, "userId:", userId);
  try {
    const [result] = await db.query(
      `
      UPDATE shared_transaction_users
      SET is_settled = true,
          confirmed = true,
          settled_on = NOW()
      WHERE id = ?
      `,
      [settlementId]
    );
    console.log("✅ [confirmSettlement] affected rows:", result.affectedRows);
    return result.affectedRows === 1;
  } catch (error) {
    console.error("❌ [confirmSettlement] Error:", error);
    throw error;
  }
};

/**
 * Cancel a pending payment request
 */
exports.cancelSettlementRequest = async (settlementId, userId) => {
  console.log("📌 [cancelSettlementRequest] settlementId:", settlementId, "userId:", userId);
  try {
    const [result] = await db.query(
      `
      UPDATE shared_transaction_users
      SET confirmed = NULL
      WHERE id = ? AND user_id = ?
      `,
      [settlementId, userId]
    );
    console.log("✅ [cancelSettlementRequest] affected rows:", result.affectedRows);
    return result.affectedRows === 1;
  } catch (error) {
    console.error("❌ [cancelSettlementRequest] Error:", error);
    throw error;
  }
};

/**
 * Fetch settlement history
 */
exports.getSettlementHistory = async (userId) => {
  console.log("📌 [getSettlementHistory] userId:", userId);
  try {
    const [rows] = await db.query(
      `
      SELECT 
        stu.id AS id,
        stu.transaction_id,
        stu.amount_owed,
        stu.settled_on,
        t.description,
        t.transaction_date,
        t.amount AS total_amount,
        u.name AS friend_name
      FROM shared_transaction_users stu
      JOIN transactions t ON stu.transaction_id = t.id
      JOIN users u ON t.paid_by = u.id
      WHERE stu.user_id = ? AND stu.is_settled = true
      ORDER BY stu.settled_on DESC
      `,
      [userId]
    );

    const decryptedRows = rows.map((row) => ({
      id: row.id,
      transaction_id: row.transaction_id,
      friend_name: row.friend_name,
      description: row.description || "",
      transaction_date: row.transaction_date,
      settled_on: row.settled_on,
      amount_owed: parseFloat(decrypt(row.amount_owed)),
      total_amount: parseFloat(decrypt(row.total_amount)),
    }));

    console.log("✅ [getSettlementHistory] decrypted rows:", decryptedRows.length);
    return decryptedRows;
  } catch (error) {
    console.error("❌ [getSettlementHistory] Error:", error);
    throw error;
  }
};
