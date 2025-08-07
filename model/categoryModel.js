const db = require("../config/db");

// ✅ Get all categories (for admin or global use)
const getAllCategories = async () => {
  const [rows] = await db.query("SELECT id, name FROM categories");
  return rows;
};

// ✅ Get or create a category (user-specific)
const getOrCreateCategory = async (user_id, category_name, client) => {
  if (!category_name || typeof category_name !== "string" || category_name.trim() === "") {
    throw new Error("Invalid category_name provided");
  }

  const normalizedName = category_name.trim().toLowerCase();

  // 🔍 1. Try to find existing category for this user
  const [existing] = await client.query(
    "SELECT id FROM categories WHERE user_id = ? AND LOWER(name) = ?",
    [user_id, normalizedName]
  );

  if (existing.length > 0) {
    return existing[0].id;
  }

  // 🆕 2. If not found, insert new category
  const [result] = await client.query(
    "INSERT INTO categories (user_id, name) VALUES (?, ?)",
    [user_id, normalizedName]
  );

  return result.insertId;
};

// ✅ Export functions
module.exports = {
  getAllCategories,
  getOrCreateCategory,
};
