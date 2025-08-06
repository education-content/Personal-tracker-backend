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

exports.getUserById = async (id) => {
  const [rows] = await db.query("SELECT id, name, email, mobile_no FROM users WHERE id = ?", [id]);
  return rows[0];
};

exports.updateUserById = async (id, name, mobile_no) => {
  await db.query("UPDATE users SET name = ?, mobile_no = ? WHERE id = ?", [
    name,
    mobile_no,
    id,
  ]);
};
