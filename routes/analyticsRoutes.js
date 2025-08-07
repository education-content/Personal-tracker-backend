const express = require("express");
const router = express.Router();
const {
  getCashflow,
  getCategoryTrends,
  getHeatmap,
  getSharedSummary,
  getTopExpenses,
  getTypeBreakdown,
} = require("../controller/analyticsController");
const { verifyToken } = require("../middleware/authmiddleware");

// GET cashflow breakdown
router.get("/cashflow", verifyToken, getCashflow); // ✅ /analytics/cashflow

// GET category trends
router.get("/category-trends", verifyToken, getCategoryTrends); // ✅ /analytics/category-trends

// GET heatmap data
router.get("/heatmap", verifyToken, getHeatmap); // ✅ /analytics/heatmap

// GET shared expenses summary
router.get("/shared-summary", verifyToken, getSharedSummary); // ✅ /analytics/shared-summary

// GET top expenses
router.get("/top-expenses", verifyToken, getTopExpenses); // ✅ /analytics/top-expenses

// GET transactions by type
router.get("/transactions", verifyToken, getTypeBreakdown); // ✅ /analytics/transactions

module.exports = router;
