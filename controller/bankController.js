const bankModel = require("../model/bankModel");
const { encrypt, decrypt } = require("../utils/crypto");

exports.saveBankDetails = async (req, res) => {
  const { bank_name, upi_id, initial_balance } = req.body;
  const userId = req.user.id;

  // Validate balance
  if (initial_balance === undefined || isNaN(initial_balance)) {
    return res.status(400).json({ error: "Initial balance must be a valid number." });
  }

  try {
    // Encrypt balance
    const encryptedBalance = encrypt(String(initial_balance));

    await bankModel.saveBankDetails(userId, {
      bank_name,
      upi_id,
      initial_balance: encryptedBalance,
    });

    res.json({ message: "✅ Bank details updated successfully." });
  } catch (err) {
    console.error("❌ Bank save error:", err);
    res.status(500).json({ error: "Server error while saving bank details." });
  }
};

exports.getBankDetails = async (req, res) => {
  const userId = req.user.id;

  try {
    const data = await bankModel.getBankDetails(userId);
    if (!data) return res.status(404).json({ error: "Bank details not found." });

    let decryptedBalance = null;

    try {
      decryptedBalance = data.initial_balance ? decrypt(data.initial_balance) : null;
    } catch (decryptionError) {
      console.warn("⚠️ Balance decryption failed. Possibly stored as plain text or corrupted.");
      decryptedBalance = data.initial_balance; // Fallback to raw
    }

    res.json({
      bank_name: data.bank_name,
      upi_id: data.upi_id,
      balance: decryptedBalance,
    });
  } catch (err) {
    console.error("❌ Bank fetch error:", err);
    res.status(500).json({ error: "Server error while fetching bank details." });
  }
};
