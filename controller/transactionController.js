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

    if (
      is_shared &&
      Array.isArray(shared_with) &&
      shared_with.length > 0 &&
      typeof shared_amount === "number"
    ) {
      for (const user_id of shared_with) {
        await addSharedTransactionDetails({
          transaction_id: transaction.id,
          user_id,
          amount_owed: encrypt(shared_amount.toString()), // encrypting amount_owed
          is_settled: is_settled ?? false,
        });
      }
    }

    if (type === "scholarship") {
  const encryptedAmount = encrypt(amount.toString());

  await db.query(
    `INSERT INTO scholarships (user_id, name, amount, received_on, note, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [
      userId,
      description || "Scholarship", // scholarship name
      encryptedAmount,
      transaction_date,
      description || "", // note
    ]
  );
}



    // 🔢 Convert encrypted amount back to number
    // ✅ Ensure it's a number
    // ✅ Step 1: Parse and validate amount
    const amountValue = parseFloat(req.body.amount);
    // const paidById = parseInt(paid_by || userId, 10);

    if (isNaN(amountValue) || isNaN(paidById)) {
      throw new Error("Invalid amount or user ID");
    }

    // ✅ Step 2: Fetch and decrypt current balance
    const [userRows] = await connection.query(
      `SELECT initial_balance FROM users WHERE id = ?`,
      [paidById]
    );

    if (userRows.length === 0) {
      throw new Error("User not found for balance update");
    }

    const currentEncryptedBalance = userRows[0].initial_balance;
    const currentBalance = parseFloat(decrypt(currentEncryptedBalance));

    if (isNaN(currentBalance)) {
      throw new Error("Decrypted balance is invalid");
    }

    // ✅ Step 3: Update balance in Node.js
    let updatedBalance;

    if (type === "credit") {
      updatedBalance = currentBalance + amountValue;
    } else if (type === "debit" || type === "shared") {
      updatedBalance = currentBalance - amountValue;
    } else if (type === "info") {
      updatedBalance = currentBalance; // No change for info type
    } else {
      throw new Error("Unknown transaction type");
    }


    // ✅ Step 4: Encrypt new balance
    const encryptedUpdatedBalance = encrypt(updatedBalance.toString());

    // ✅ Step 5: Save it back to DB
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
