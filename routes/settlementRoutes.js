// routes/settlementRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controller/settlementController");
const { verifyToken } = require("../middleware/authmiddleware");

// Summary (net settlements per friend)
router.get("/summary", verifyToken, controller.getSummary);

// Breakup for a particular friend
router.get("/breakup/:friendId", verifyToken, controller.getBreakup);

// Payer marks a settlement row as paid (claim)
router.post("/settle", verifyToken, controller.settle);

// Payer cancels claim
router.post("/cancel", verifyToken, controller.cancel);

// Mark multiple settlements as claimed
router.post("/claim", verifyToken, controller.claimPayment);

// ✅ NEW: Get all settlements awaiting the current user's confirmation
router.get("/pending", verifyToken, controller.getPendingConfirmations);

// ✅ NEW: Receiver confirms a pending settlement (finalizes and updates balances)
router.post("/confirm", verifyToken, controller.confirmSettlement);

module.exports = router;
