const db = require("../config/db");
const { encrypt, decrypt } = require("../utils/crypto");

exports.saveBankDetails = async (userId, { bank_name, upi_id, initial_balance }) => {
  const encryptedBank = encrypt(bank_name);
  const encryptedUpi = upi_id ? encrypt(upi_id) : null;

  await db.query(
    "UPDATE users SET bank_name = ?, upi_id = ?, initial_balance = ? WHERE id = ?",
    [encryptedBank, encryptedUpi, initial_balance, userId]
  );
};

exports.getBankDetails = async (userId) => {
  const [rows] = await db.query(
    "SELECT bank_name, upi_id, initial_balance FROM users WHERE id = ?",
    [userId]
  );

  if (!rows.length) return null;

  const row = rows[0];
  return {
    bank_name: row.bank_name ? decrypt(row.bank_name) : "",
    upi_id: row.upi_id ? decrypt(row.upi_id) : "",
    initial_balance: row.initial_balance || 0,
  };
};
