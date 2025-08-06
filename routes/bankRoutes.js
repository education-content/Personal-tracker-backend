const express = require("express");
const router = express.Router();
const {
  getBankDetails,
  saveBankDetails
} = require("../controller/bankController");
const { verifyToken } = require("../middleware/authMiddleware");

// GET bank details for the logged-in user
router.get("/", verifyToken, getBankDetails);    // ✅ /bank-details

// UPDATE bank details for the logged-in user
router.post("/", verifyToken, saveBankDetails);  // ✅ /bank-details

module.exports = router;
