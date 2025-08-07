const db = require("../config/db");

// ✅ Create a new transaction
const createTransaction = async (data, client = db) => {
  const {
    user_id,
    amount,
    type,
    category_id,
    transaction_date,
    description,
    is_shared,
    paid_by,
  } = data;

  const [result] = await client.query(
    `
    INSERT INTO transactions 
      (user_id, amount, type, category_id, transaction_date, description, is_shared, paid_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [user_id, amount, type, category_id, transaction_date, description, is_shared, paid_by]
  );

  const transactionId = result.insertId;
  console.log("✅ Created transaction with ID:", transactionId);

  return { id: transactionId };
};

// ✅ Add shared transaction user entry
const addSharedTransactionDetails = async (
  {
    transaction_id,
    user_id,
    amount_owed,
    is_settled = false,
  },
  connection
) => {
  if (!transaction_id || !user_id || amount_owed == null) {
    throw new Error("Missing required fields for shared transaction");
  }

  await connection.query(
    `
    INSERT INTO shared_transaction_users 
      (transaction_id, user_id, amount_owed, is_settled)
    VALUES (?, ?, ?, ?)
    `,
    [transaction_id, user_id, amount_owed, is_settled]
  );

  console.log("✅ Shared transaction detail added for user:", user_id);
};




// ✅ Get all transactions by user
const getTransactionsByUser = async (userId, filters = {}) => {
  const { type, category_id } = filters;

  let query = `
    SELECT 
      t.*, 
      c.name AS category_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ?
  `;

  const params = [userId];

  if (type) {
    query += " AND t.type = ?";
    params.push(type);
  }

  if (category_id) {
    query += " AND t.category_id = ?";
    params.push(category_id);
  }

  query += " ORDER BY t.transaction_date DESC";

  const [rows] = await db.query(query, params);
  return rows;
};

// ✅ Get single transaction by ID
const getTransactionById = async (transactionId) => {
  const [rows] = await db.query(
    `SELECT * FROM transactions WHERE id = ?`,
    [transactionId]
  );
  return rows[0];
};

// ✅ Get shared users for a transaction
const getSharedUsersByTransactionId = async (transactionId) => {
  const [rows] = await db.query(
    `
    SELECT s.*, u.name AS user_name
    FROM shared_transaction_users s
    JOIN users u ON s.user_id = u.id
    WHERE s.transaction_id = ?
    `,
    [transactionId]
  );
  return rows;
};

// ✅ Exports
module.exports = {
  createTransaction,
  addSharedTransactionDetails,
  getTransactionsByUser,
  getTransactionById,
  getSharedUsersByTransactionId,
};
