const db = require("../config/db");
const {
  createTransaction,
  addSharedTransactionDetails,
  getTransactionsByUser,
} = require("../model/transactionModel");
const { getOrCreateCategory } = require("../model/categoryModel");
const { encrypt, decrypt } = require("../utils/crypto"); // 🔐 Import encryption functions

// ✅ Create a new transaction (with encryption and category creation)
exports.createTransaction = async (req, res) => {
  const userId = req.user.id;
  const {
    amount,
    type,
    category_name,
    transaction_date,
    description,
    is_shared,
    shared_with,
    shared_amount,
    is_settled,
    paid_by,
  } = req.body;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 🔹 Validate inputs early
    const amountValue = parseFloat(amount);
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Invalid or missing amount." });
    }
    if (!type) {
      await connection.rollback();
      return res.status(400).json({ error: "Transaction type is required." });
    }
    if (!transaction_date) {
      await connection.rollback();
      return res.status(400).json({ error: "Transaction date is required." });
    }

    const category_id = await getOrCreateCategory(userId, category_name, connection);
    const paidById = paid_by || userId;

    // 🔹 Parse and normalize shared_with
    let parsedSharedWith = [];
    if (Array.isArray(shared_with)) {
      parsedSharedWith = shared_with.map(id => String(id).trim()).filter(Boolean);
    } else if (typeof shared_with === "string") {
      parsedSharedWith = shared_with
        .split(",")
        .map(id => String(id).trim())
        .filter(Boolean);
    }

    // 🔹 Calculate the actual share for the payer
    let userShare = amountValue;
    if (is_shared && parsedSharedWith.length > 0 && typeof shared_amount === "number") {
      const totalSharedAmount = parsedSharedWith.length * shared_amount;
      if (totalSharedAmount > amountValue) {
        await connection.rollback();
        return res.status(400).json({
          error: "Total shared amount cannot exceed the total amount paid.",
        });
      }
      userShare = amountValue - totalSharedAmount;
    }

    // 🔹 Encrypt values for DB
    const encryptedDescription = encrypt(description || "");
    const encryptedUserShare = encrypt(userShare.toString());
    const encryptedFullAmount = encrypt(amountValue.toString());

    // 🔹 Store transaction with **user's share** as `amount`
    // (Optionally also store full amount in another column if schema supports it)
    const transaction = await createTransaction(
      {
        user_id: userId,
        amount: encryptedUserShare, // ✅ only your share goes here
        type,
        category_id,
        transaction_date,
        description: encryptedDescription,
        is_shared: !!is_shared,
        paid_by: paidById,
        total_amount_paid: encryptedFullAmount, // optional if schema supports
      },
      connection
    );

    // 🔹 Insert shared transaction details for each friend
    if (is_shared && parsedSharedWith.length > 0 && typeof shared_amount === "number") {
      for (const otherUserId of parsedSharedWith) {
        await addSharedTransactionDetails(
          {
            transaction_id: transaction.id,
            user_id: otherUserId,
            amount_owed: encrypt(shared_amount.toString()),
            is_settled: is_settled ?? false,
          },
          connection
        );
      }
    }

    // 🔹 Handle scholarships separately
    if (type === "scholarship") {
      await connection.query(
        `INSERT INTO scholarships (user_id, name, amount, received_on, note, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          description || "Scholarship",
          encryptedUserShare,
          transaction_date,
          description || "",
        ]
      );
    }

    // 🔹 Update balance (based on payer and their share)
    const [userRows] = await connection.query(
      `SELECT initial_balance FROM users WHERE id = ?`,
      [paidById]
    );
    if (userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "User not found for balance update" });
    }

    const currentEncryptedBalance = userRows[0].initial_balance;
    const currentBalance = parseFloat(decrypt(currentEncryptedBalance));
    if (isNaN(currentBalance)) {
      await connection.rollback();
      return res.status(500).json({ error: "Decrypted balance is invalid" });
    }

    let updatedBalance = currentBalance;
    if (type === "credit") {
      updatedBalance += userShare;
    } else if (type === "debit" || type === "shared") {
      updatedBalance -= userShare;
    } // "info" leaves balance unchanged

    await connection.query(
      `UPDATE users SET initial_balance = ? WHERE id = ?`,
      [encrypt(updatedBalance.toString()), paidById]
    );

    await connection.commit();
    return res.status(201).json({ message: "Transaction created successfully" });
  } catch (err) {
    await connection.rollback();
    console.error("❌ Transaction Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  } finally {
    connection.release();
  }
};



// ✅ Get transactions for a user (with decrypted fields)
exports.getTransactions = async (req, res) => {
  const userId = req.user.id;
  const { type, category } = req.query;

  try {
    const filters = {
      ...(type && { type }),
      ...(category && { category_id: category }),
    };

    const transactions = await getTransactionsByUser(userId, filters);

    // ✅ Decrypt fields before sending back to client
    const decryptedTransactions = transactions.map((tx) => ({
      ...tx,
      amount: tx.amount ? parseFloat(decrypt(tx.amount)) : 0,
      description: tx.description ? decrypt(tx.description) : "",
    }));

    res.json(decryptedTransactions);
  } catch (err) {
    console.error("❌ Fetch Transactions Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
