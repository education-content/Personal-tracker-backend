const db = require("../config/db");

exports.findUserByEmail = async (email) => {
  const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0];
};

exports.createUser = async (name, email, hashedPassword, mobile_no) => {
  await db.query(
    "INSERT INTO users (name, email, password, mobile_no) VALUES (?, ?, ?, ?)",
    [name, email, hashedPassword, mobile_no]
  );
};
