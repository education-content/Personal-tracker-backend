const express = require("express");
const router = express.Router();
const { getSharedExpenses } = require("../controller/sharedExpenseController");
const { verifyToken } = require("../middleware/authmiddleware");

// GET /shared-expenses
router.get("/", verifyToken, getSharedExpenses);

module.exports = router;
