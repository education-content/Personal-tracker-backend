const db = require("../config/db");
const { decrypt } = require("../utils/crypto"); // Import decrypt function

// ✅ Total received, spent, and balance
exports.getSummary = async (userId) => {
  // 🔓 Decrypt and sum 'credit' transactions
  const [creditRows] = await db.query(
    `SELECT amount FROM transactions WHERE user_id = ? AND type = 'credit'`,
    [userId]
  );

  const totalReceived = creditRows.reduce((sum, row) => {
    try {
      const decrypted = decrypt(row.amount);
      const val = parseFloat(decrypted);
      if (!isNaN(val)) return sum + val;
    } catch (err) {
      console.error("❌ Failed to decrypt credit amount:", row.amount);
    }
    return sum;
  }, 0);

  // 🔓 Decrypt and sum 'debit' + 'shared' transactions
  const [debitRows] = await db.query(
    `SELECT amount FROM transactions WHERE user_id = ? AND type IN ('debit', 'shared')`,
    [userId]
  );

  const totalSpent = debitRows.reduce((sum, row) => {
    try {
      const decrypted = decrypt(row.amount);
      const val = parseFloat(decrypted);
      if (!isNaN(val)) return sum + val;
    } catch (err) {
      console.error("❌ Failed to decrypt debit/shared amount:", row.amount);
    }
    return sum;
  }, 0);

  // ✅ Fetch & decrypt bank balance
  const [[bankData]] = await db.query(
    `SELECT initial_balance FROM users WHERE id = ?`,
    [userId]
  );

  let bankBalance = 0;
  try {
    bankBalance = bankData?.initial_balance
      ? parseFloat(decrypt(bankData.initial_balance))
      : 0;
  } catch (err) {
    console.error("❌ Error decrypting bank balance:", err);
  }

  // ✅ Debug log
  console.log({
    totalReceived,
    totalSpent,
    bankBalance,
    creditRowsLength: creditRows.length,
    debitRowsLength: debitRows.length,
  });

  return {
    totalReceived,
    totalSpent,
    totalBalance: bankBalance,
  };
};



// ✅ Monthly income/spending stats (compliant with ONLY_FULL_GROUP_BY)
exports.getMonthlyStats = async (userId) => {
  const [rows] = await db.query(
    `SELECT transaction_date, type, amount FROM transactions WHERE user_id = ?`,
    [userId]
  );

  const monthMap = {};

  for (const row of rows) {
    const month = new Date(row.transaction_date).toISOString().slice(0, 7); // 'YYYY-MM'
    if (!monthMap[month]) {
      monthMap[month] = { month, received: 0, spent: 0 };
    }

    let amount = 0;
    try {
      amount = parseFloat(decrypt(row.amount));
    } catch {}

    if (row.type === 'credit') {
      monthMap[month].received += isNaN(amount) ? 0 : amount;
    } else if (['debit', 'shared'].includes(row.type)) {
      monthMap[month].spent += isNaN(amount) ? 0 : amount;
    }
  }

  // Sort by month
  return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
};


// ✅ Expenses grouped by category (category name via JOIN)
exports.getCategoryStats = async (userId) => {
  const [rows] = await db.query(
    `
    SELECT c.name AS category, t.amount
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND t.type IN ('debit', 'shared')
    `,
    [userId]
  );

  const categoryMap = {};

  for (const row of rows) {
    const category = row.category;
    let amount = 0;
    try {
      amount = parseFloat(decrypt(row.amount));
    } catch {}

    if (!categoryMap[category]) {
      categoryMap[category] = 0;
    }

    categoryMap[category] += isNaN(amount) ? 0 : amount;
  }

  return Object.entries(categoryMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
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
