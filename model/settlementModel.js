// model/settlementModel.js
const db = require("../config/db");
const { decrypt, encrypt } = require("../utils/crypto");

/**
 * Returns net settlement summary per friend for given userId.
 * net_amount = (they owe you total) - (you owe them total)
 */
exports.getNetSettlements = async (userId) => {
  const sql = `
    SELECT
      -- friend id is the other participant in the shared split
      CASE WHEN stu.user_id = ? THEN t.paid_by ELSE stu.user_id END AS friend_id,
      u.name AS friend_name,
      stu.user_id AS debtor_user_id,
      t.paid_by AS payer_user_id,
      stu.amount_owed,
      stu.is_settled
    FROM shared_transaction_users stu
    JOIN transactions t ON stu.transaction_id = t.id
    JOIN users u ON u.id = CASE WHEN stu.user_id = ? THEN t.paid_by ELSE stu.user_id END
    WHERE (stu.user_id = ? OR t.paid_by = ?) -- either you are the owed user or the payer (participant)
      AND stu.user_id != t.paid_by
  `;

  const [rows] = await db.query(sql, [userId, userId, userId, userId]);

  // aggregate per friend
  const map = {};
  for (const r of rows) {
    const friendId = r.friend_id;
    if (!map[friendId]) {
      map[friendId] = {
        friend_id: friendId,
        friend_name: r.friend_name,
        total_given: 0, // they owe me
        total_taken: 0, // I owe them
        net_amount: 0,
      };
    }

    // skip settled entries (we care pending)
    if (r.is_settled) continue;

    let amount;
    try {
      // amount_owed stored encrypted
      amount = Number(decrypt(r.amount_owed));
    } catch (err) {
      // safe fallback
      amount = Number(r.amount_owed) || 0;
    }

    // If stu.user_id === userId => current user is debtor (they paid originally, we owe) => we owe them
    if (r.debtor_user_id === userId) {
      map[friendId].total_taken += amount;
    } else {
      // else they are debtor => they owe us
      map[friendId].total_given += amount;
    }

    map[friendId].net_amount = map[friendId].total_given - map[friendId].total_taken;
  }

  return Object.values(map);
};

/**
 * Get detailed breakup between userId and friendId.
 * Returns list of shared_transaction_users rows with decrypted amounts and extra fields
 */
exports.getSettlementBreakup = async (userId, friendId) => {
  const sql = `
    SELECT
      stu.id AS settlement_id,
      stu.transaction_id,
      stu.amount_owed,
      stu.is_settled,
      stu.settled_on,
      stu.is_paid_by_user,
      stu.is_confirmed_by_receiver,
      t.description,
      t.transaction_date,
      t.amount AS transaction_total,
      t.paid_by
    FROM shared_transaction_users stu
    JOIN transactions t ON stu.transaction_id = t.id
    WHERE 
      (stu.user_id = ? AND t.paid_by = ?) OR
      (stu.user_id = ? AND t.paid_by = ?)
    ORDER BY t.transaction_date DESC
  `;

  const [rows] = await db.query(sql, [userId, friendId, friendId, userId]);

  return rows.map((r) => {
    // decrypt amount_owed (robust)
    let amount_owed = null;
    try {
      amount_owed = Number(decrypt(r.amount_owed));
    } catch (err) {
      amount_owed = Number(r.amount_owed) || 0;
    }

    // decrypt description if encrypted string (defensive)
    let description = r.description;
    try {
      // description is encrypted per your note
      description = decrypt(description || "");
    } catch (err) {
      // if decrypt failed, leave as-is
    }

    // determine who owes (userId or friend)
    const owed_by_user = r.user_id ? r.user_id : null; // (we didn't select ?), but safe fallback
    // we included stu.user_id? not selected; but we can add it easily — but keep as-is: infer from paid_by
    // better to return paid_by and debtor info: if stu.user_id === userId => you owe, else they owe
    return {
      settlement_id: r.settlement_id,
      transaction_id: r.transaction_id,
      description,
      transaction_date: r.transaction_date,
      transaction_total: r.transaction_total ? (() => {
        try { return Number(decrypt(r.transaction_total)); } catch (e) { return Number(r.transaction_total) || null; }
      })() : null,
      amount_owed,
      is_settled: !!r.is_settled,
      settled_on: r.settled_on,
      is_paid_by_user: !!r.is_paid_by_user,
      is_confirmed_by_receiver: !!r.is_confirmed_by_receiver,
      paid_by: r.paid_by, // id of who originally paid
      // For frontend convenience:
      owed_by_user_id: (r.user_id) ? r.user_id : null, // if you want the exact debtor id (if present), else null
    };
  });
};

/**
 * Payer (the user who owes money) marks a particular shared_transaction_users row as "paid (claimed)".
 * We only set is_paid_by_user = true, is_settled = true, settled_on = NOW(). Confirmation by receiver is still needed to finalize ledger.
 */
exports.markAsPaid = async (settlementId, userId) => {
  const sql = `
    UPDATE shared_transaction_users
    SET is_paid_by_user = 1, is_settled = 1, settled_on = NOW()
    WHERE id = ? AND user_id = ? AND is_settled = 0
  `;
  const [result] = await db.query(sql, [settlementId, userId]);
  return result.affectedRows === 1;
};

/**
 * Receiver confirms the settled claim. This finalizes settlement:
 * - set is_confirmed_by_receiver = true
 * - ensure is_settled = true
 * - update payer and receiver balances (encrypted)
 * - create two transactions: a debit for the payer and a credit for the receiver
 *
 * Returns object with details or throws.
 */
// exports.confirmSettlement = async (settlementId, receiverId) => {
//   const conn = await db.getConnection();
//   try {
//     await conn.beginTransaction();

//     // fetch the shared row and its transaction
//     const [rows] = await conn.query(
//       `
//       SELECT stu.*, t.paid_by AS original_payer_id, t.user_id AS transaction_user_id, t.description AS t_description
//       FROM shared_transaction_users stu
//       JOIN transactions t ON stu.transaction_id = t.id
//       WHERE stu.id = ?
//       FOR UPDATE
//       `,
//       [settlementId]
//     );

//     if (!rows || rows.length === 0) {
//       throw new Error("Settlement not found");
//     }
//     const row = rows[0];

//     // paid_by on transaction is the original payer (the one who paid expense originally and others owe him)
//     const originalPayerId = row.original_payer_id; // who paid the original transaction
//     // In shared_transaction_users, user_id is the user who owes money (debtor)
//     const debtorId = row.user_id;
//     const creditorId = originalPayerId;

//     // only creditor (originalPayerId) can confirm
//     if (Number(creditorId) !== Number(receiverId)) {
//       throw new Error("Only the receiver (original payer) can confirm the settlement");
//     }

//     // decrypt amount_owed
//     let amount;
//     try {
//       amount = Number(decrypt(row.amount_owed));
//     } catch (err) {
//       amount = Number(row.amount_owed) || 0;
//     }
//     if (!amount || amount <= 0) {
//       throw new Error("Invalid amount to settle");
//     }

//     // update shared_transaction_users to mark confirmed
//     await conn.query(
//       `
//       UPDATE shared_transaction_users
//       SET is_confirmed_by_receiver = 1, is_settled = 1, settled_on = NOW()
//       WHERE id = ?
//       `,
//       [settlementId]
//     );

//     // ---- Update balances: decrement debtor, increment creditor ----
//     // Fetch balances (FOR UPDATE)
//     const [debtorRows] = await conn.query(`SELECT initial_balance FROM users WHERE id = ? FOR UPDATE`, [debtorId]);
//     const [creditorRows] = await conn.query(`SELECT initial_balance FROM users WHERE id = ? FOR UPDATE`, [creditorId]);

//     if (!debtorRows.length || !creditorRows.length) {
//       throw new Error("User(s) not found");
//     }

//     let debtorBalance = 0;
//     let creditorBalance = 0;
//     try {
//       debtorBalance = Number(decrypt(debtorRows[0].initial_balance));
//     } catch (e) {
//       debtorBalance = Number(debtorRows[0].initial_balance) || 0;
//     }
//     try {
//       creditorBalance = Number(decrypt(creditorRows[0].initial_balance));
//     } catch (e) {
//       creditorBalance = Number(creditorRows[0].initial_balance) || 0;
//     }

//     const updatedDebtorBalance = debtorBalance - amount;
//     const updatedCreditorBalance = creditorBalance + amount;

//     // encrypt balances
//     const encDebtorBalance = encrypt(String(updatedDebtorBalance));
//     const encCreditorBalance = encrypt(String(updatedCreditorBalance));

//     await conn.query(`UPDATE users SET initial_balance = ? WHERE id = ?`, [encDebtorBalance, debtorId]);
//     await conn.query(`UPDATE users SET initial_balance = ? WHERE id = ?`, [encCreditorBalance, creditorId]);

//     // ---- Create ledger transactions for both sides (optional, but keeps history) ----
//     const descForDebtor = encrypt(`Settlement payment to user ${creditorId}`);
//     const descForCreditor = encrypt(`Settlement received from user ${debtorId}`);
//     const encAmount = encrypt(String(amount));

//     // Debtor transaction (debit)
//     const [debtorTx] = await conn.query(
//       `INSERT INTO transactions (user_id, category_id, description, amount, paid_by, transaction_date, is_shared, created_at, type) VALUES (?, NULL, ?, ?, ?, NOW(), 0, NOW(), 'debit')`,
//       [debtorId, descForDebtor, encAmount, debtorId]
//     );

//     // Creditor transaction (credit)
//     const [creditorTx] = await conn.query(
//       `INSERT INTO transactions (user_id, category_id, description, amount, paid_by, transaction_date, is_shared, created_at, type) VALUES (?, NULL, ?, ?, ?, NOW(), 0, NOW(), 'credit')`,
//       [creditorId, descForCreditor, encAmount, creditorId]
//     );

//     await conn.commit();
//     conn.release();
//     return {
//       success: true,
//       amount,
//       debtorId,
//       creditorId,
//       debtorTxId: debtorTx.insertId,
//       creditorTxId: creditorTx.insertId,
//     };
//   } catch (err) {
//     await conn.rollback();
//     conn.release();
//     throw err;
//   }
// };

exports.confirmSettlement = async (settlementId, receiverId) => {
  // Fetch settlement details
  const [[settlement]] = await db.query(
    `SELECT stu.id, stu.amount_owed, stu.user_id AS payer_id
     FROM shared_transaction_users stu
     JOIN transactions t ON stu.transaction_id = t.id
     WHERE stu.id = ?
       AND t.paid_by = ?
       AND stu.is_paid_by_user = 1
       AND stu.is_confirmed_by_receiver = 0`,
    [settlementId, receiverId]
  );

  if (!settlement) {
    throw new Error("Settlement not found or not pending confirmation");
  }

  const amountOwed = parseFloat(decrypt(settlement.amount_owed));
  const payerId = settlement.payer_id;

  // Fetch and decrypt balances
  const [[payer]] = await db.query(`SELECT initial_balance FROM users WHERE id = ?`, [payerId]);
  if (!payer) throw new Error("Payer not found");

  const [[receiver]] = await db.query(`SELECT initial_balance FROM users WHERE id = ?`, [receiverId]);
  if (!receiver) throw new Error("Receiver not found");

  const payerBalance = parseFloat(decrypt(payer.initial_balance));
  const receiverBalance = parseFloat(decrypt(receiver.initial_balance));

  if (payerBalance < amountOwed) {
    throw new Error("Payer does not have sufficient balance");
  }

  // Transaction: update balances + mark confirmed
  await db.query("START TRANSACTION");
  try {
    // Deduct from payer
    await db.query(
      `UPDATE users SET initial_balance = ? WHERE id = ?`,
      [encrypt((payerBalance - amountOwed).toString()), payerId]
    );

    // Add to receiver
    await db.query(
      `UPDATE users SET initial_balance = ? WHERE id = ?`,
      [encrypt((receiverBalance + amountOwed).toString()), receiverId]
    );

    // Mark as confirmed
    await db.query(
      `UPDATE shared_transaction_users
       SET is_confirmed_by_receiver = 1, confirmed_on = NOW()
       WHERE id = ?`,
      [settlementId]
    );

    await db.query("COMMIT");
    return { success: true, message: "Settlement confirmed" };
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }
};
/**
 * Cancel a claim: payer cancels their "marked paid" claim.
 */
exports.cancelClaim = async (settlementId, userId) => {
  const sql = `
    UPDATE shared_transaction_users
    SET is_paid_by_user = 0, is_settled = 0, settled_on = NULL
    WHERE id = ? AND user_id = ? AND is_settled = 1
  `;
  const [result] = await db.query(sql, [settlementId, userId]);
  return result.affectedRows === 1;
};


exports.claimPayment = async (settlementIds, userId) => {
  if (!settlementIds.length) return false;

  const placeholders = settlementIds.map(() => "?").join(",");
  const sql = `
    UPDATE shared_transaction_users
    SET 
      is_paid_by_user = 1, 
      is_settled = 1, 
      settled_on = NOW(), 
      is_confirmed_by_receiver = 0
    WHERE id IN (${placeholders}) 
      AND user_id = ?
  `;

  const params = [...settlementIds, userId];
  const [result] = await db.query(sql, params);

  return result.affectedRows > 0;
};

exports.getPendingConfirmations = async (receiverId) => {
  const [rows] = await db.query(
    `SELECT 
       stu.id AS settlement_id,
       stu.user_id AS payer_id,
       u.name AS payer_name,
       stu.amount_owed,
       stu.settled_on
     FROM shared_transaction_users stu
     JOIN transactions t ON stu.transaction_id = t.id
     JOIN users u ON stu.user_id = u.id
     WHERE t.paid_by = ?
       AND stu.is_paid_by_user = 1
       AND stu.is_confirmed_by_receiver = 0`,
    [receiverId]
  );

  // Decrypt the amount before sending to frontend
  return rows.map(r => ({
    ...r,
    amount_owed: parseFloat(decrypt(r.amount_owed))
  }));
};

