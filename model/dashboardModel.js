const db = require("../config/db");

// ✅ Total received, spent, and balance
exports.getSummary = async (userId) => {
  const [[received]] = await db.query(
    `SELECT IFNULL(SUM(amount), 0) AS totalReceived
     FROM transactions
     WHERE user_id = ? AND type = 'income'`,
    [userId]
  );

  const [[spent]] = await db.query(
    `SELECT IFNULL(SUM(amount), 0) AS totalSpent
     FROM transactions
     WHERE user_id = ? AND type = 'expense'`,
    [userId]
  );

  const totalReceived = received.totalReceived;
  const totalSpent = spent.totalSpent;

  return {
    totalReceived,
    totalSpent,
    totalBalance: totalReceived - totalSpent,
  };
};

// ✅ Monthly income/spending stats (compliant with ONLY_FULL_GROUP_BY)
exports.getMonthlyStats = async (userId) => {
  const [rows] = await db.query(
    `
    SELECT 
      DATE_FORMAT(transaction_date, '%Y-%m') AS month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS received,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS spent
    FROM transactions
    WHERE user_id = ?
    GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
    ORDER BY DATE_FORMAT(transaction_date, '%Y-%m')
    `,
    [userId]
  );

  return rows;
};

// ✅ Expenses grouped by category (category name via JOIN)
exports.getCategoryStats = async (userId) => {
  const [rows] = await db.query(
    `
    SELECT c.name AS category, SUM(t.amount) AS amount
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND t.type = 'expense'
    GROUP BY c.name
    ORDER BY amount DESC
    `,
    [userId]
  );

  return rows;
};

// ✅ Scholarships grouped by name (directly from scholarships table)
exports.getScholarshipStats = async (userId) => {
  const [rows] = await db.query(
    `
    SELECT name, SUM(amount) AS value
    FROM scholarships
    WHERE user_id = ?
    GROUP BY name
    ORDER BY value DESC
    `,
    [userId]
  );

  return rows;
};
