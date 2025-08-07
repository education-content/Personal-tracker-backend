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

    if (!amount || isNaN(parseFloat(amount))) {
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

    const encryptedDescription = encrypt(description || "");
    const encryptedAmount = encrypt(amount.toString());

    const transaction = await createTransaction(
      {
        user_id: userId,
        amount: encryptedAmount,
        type,
        category_id,
        transaction_date,
        description: encryptedDescription,
        is_shared: !!is_shared,
        paid_by: paidById,
      },
      connection
    );

    // 🔄 Normalize shared_with into array
    let parsedSharedWith = [];

    if (Array.isArray(shared_with)) {
      parsedSharedWith = shared_with;
    } else if (typeof shared_with === "string") {
      parsedSharedWith = shared_with.includes(",")
        ? shared_with.split(",").map((id) => id.trim())
        : [shared_with];
    }

    console.log({
      is_shared,
      shared_with,
      parsedSharedWith,
      shared_amount,
      shared_with_is_array: Array.isArray(shared_with),
      parsedSharedWith_length: parsedSharedWith.length,
      shared_amount_type: typeof shared_amount,
    });

    if (
      is_shared &&
      parsedSharedWith.length > 0 &&
      typeof shared_amount === "number"
    ) {
      const totalSharedAmount = parsedSharedWith.length * shared_amount;
      const totalPaid = parseFloat(amount);

      if (totalSharedAmount > totalPaid) {
        await connection.rollback();
        return res.status(400).json({
          error: "Total shared amount cannot exceed the total amount paid.",
        });
      }

      console.log("✅ Inside Shared");
      for (const user_id of parsedSharedWith) {
        await addSharedTransactionDetails(
          {
            transaction_id: transaction.id,
            user_id,
            amount_owed: encrypt(shared_amount.toString()),
            is_settled: is_settled ?? false,
          },
          connection
        );
      }
    }

    if (type === "scholarship") {
      await connection.query(
        `INSERT INTO scholarships (user_id, name, amount, received_on, note, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          description || "Scholarship",
          encryptedAmount,
          transaction_date,
          description || "",
        ]
      );
    }

    // ✅ Balance update
    const amountValue = parseFloat(amount);

    if (isNaN(amountValue) || isNaN(paidById)) {
      await connection.rollback();
      return res.status(400).json({ error: "Invalid amount or user ID" });
    }

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

    let updatedBalance;

    if (type === "credit") {
      updatedBalance = currentBalance + amountValue;
    } else if (type === "debit" || type === "shared") {
      updatedBalance = currentBalance - amountValue;
    } else if (type === "info") {
      updatedBalance = currentBalance;
    } else {
      await connection.rollback();
      return res.status(400).json({ error: "Unknown transaction type" });
    }

    const encryptedUpdatedBalance = encrypt(updatedBalance.toString());

    await connection.query(
      `UPDATE users SET initial_balance = ? WHERE id = ?`,
      [encryptedUpdatedBalance, paidById]
    );

    await connection.commit();
    res.status(201).json({ message: "Transaction created successfully" });
  } catch (err) {
    await connection.rollback();
    console.error("❌ Transaction Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
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
