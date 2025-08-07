const express = require("express");
const router = express.Router();
const {
  fetchPendingSettlements,
  settleTransaction,
  fetchSettlementHistory,
} = require("../controller/settlementController");

const {verifyToken} = require("../middleware/authmiddleware"); // Assuming JWT auth

router.use(verifyToken);

router.get("/pending", fetchPendingSettlements);
router.post("/settle", settleTransaction);
router.get("/history", fetchSettlementHistory);

module.exports = router;
