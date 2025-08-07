const db = require("../config/db");
const { decrypt } = require("../utils/crypto");

// 1. CASHFLOW
exports.fetchCashflow = async (userId) => {
  const [rows] = await db.query(`
    SELECT 
      DATE_FORMAT(transaction_date, '%Y-%m') AS month,
      type,
      amount
    FROM transactions
    WHERE user_id = ?
  `, [userId]);

  const monthly = {};

  rows.forEach(({ month, type, amount }) => {
    const amt = parseFloat(decrypt(amount));
    if (!monthly[month]) {
      monthly[month] = { month, income: 0, expenses: 0 };
    }
    if (type === "credit") {
      monthly[month].income += amt;
    } else if (type === "debit") {
      monthly[month].expenses += amt;
    }
  });

  return Object.values(monthly);
};

// 2. CATEGORY TRENDS
exports.fetchCategoryTrends = async (userId) => {
  const [rows] = await db.query(`
    SELECT 
      c.name AS category_name,
      DATE_FORMAT(t.transaction_date, '%Y-%m') AS month,
      t.amount
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ?
  `, [userId]);

  const result = {};

  rows.forEach(({ category_name, month, amount }) => {
    const amt = parseFloat(decrypt(amount));
    const key = `${category_name}-${month}`;
    if (!result[key]) {
      result[key] = { category_name, month, total: 0 };
    }
    result[key].total += amt;
  });

  return Object.values(result);
};

// 3. HEATMAP
exports.fetchHeatmap = async (userId) => {
  const [rows] = await db.query(`
    SELECT 
      DATE(transaction_date) AS date,
      COUNT(*) AS count
    FROM transactions
    WHERE user_id = ?
    GROUP BY DATE(transaction_date)
  `, [userId]);

  return rows;
};

// 4. SHARED SUMMARY
exports.fetchSharedSummary = async (userId) => {
  const [rows] = await db.query(`
    SELECT amount_owed, is_settled
    FROM shared_transaction_users
    WHERE user_id = ?
  `, [userId]);

  let total_shared = 0;
  let total_settled = 0;

  rows.forEach(({ amount_owed, is_settled }) => {
    const amt = parseFloat(decrypt(amount_owed));
    total_shared += amt;
    if (is_settled) total_settled += amt;
  });

  return {
    total_shared,
    total_settled,
    pending: total_shared - total_settled,
  };
};

// 5. TOP EXPENSES (debit)
exports.fetchTopExpenses = async (userId) => {
  const [rows] = await db.query(`
  SELECT 
    t.amount,
    t.transaction_date,
    c.name AS category_name
  FROM transactions t
  JOIN categories c ON t.category_id = c.id
  WHERE t.user_id = ? AND t.type = 'debit'
  ORDER BY t.transaction_date DESC
  LIMIT 100
`, [userId]);


  return rows
    .map((tx) => ({
      ...tx,
      amount: parseFloat(decrypt(tx.amount)),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5); // Top 5
};

// 6. TYPE BREAKDOWN
exports.fetchTypeBreakdown = async (userId) => {
  const [rows] = await db.query(`
    SELECT 
      t.id,
      t.transaction_date AS date,
      t.type,
      c.name AS category,
      t.amount
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ?
    ORDER BY t.transaction_date DESC
  `, [userId]);

  let credit = 0;
  let debit = 0;

  // Decrypt amounts and compute totals
  const transactions = rows.map(({ id, date, type, category, amount }) => {
    const decryptedAmount = parseFloat(decrypt(amount));

    if (type === "credit") credit += decryptedAmount;
    else if (type === "debit") debit += decryptedAmount;

    return {
      id,
      date,
      type,
      category,
      amount: decryptedAmount,
    };
  });

  return {
    credit,
    debit,
    transactions,
  };
};

