const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  createTransaction,
  getTransactions,
} = require("../controller/transactionController");

router.post("/", verifyToken, createTransaction);
router.get("/", verifyToken, getTransactions);

module.exports = router;
