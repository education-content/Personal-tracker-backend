// const { use } = require("react");
const analyticsModel = require("../model/analyticsModel");

// 1. /analytics/cashflow
exports.getCashflow = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(userId);
    const data = await analyticsModel.fetchCashflow(userId);
    res.json(data);
  } catch (err) {
    console.error("Cashflow Error:", err);
    res.status(500).json({ error: "Failed to load cashflow data" });
  }
};

// 2. /analytics/category-trends
exports.getCategoryTrends = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await analyticsModel.fetchCategoryTrends(userId);
    res.json(data);
  } catch (err) {
    console.error("Category Trends Error:", err);
    res.status(500).json({ error: "Failed to load category trends" });
  }
};

// 3. /analytics/heatmap
exports.getHeatmap = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await analyticsModel.fetchHeatmap(userId);
    res.json(data);
  } catch (err) {
    console.error("Heatmap Error:", err);
    res.status(500).json({ error: "Failed to load heatmap data" });
  }
};

// 4. /analytics/shared-summary
exports.getSharedSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await analyticsModel.fetchSharedSummary(userId);
    res.json(data);
  } catch (err) {
    console.error("Shared Summary Error:", err);
    res.status(500).json({ error: "Failed to load shared summary" });
  }
};

// 5. /analytics/top-expenses
exports.getTopExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await analyticsModel.fetchTopExpenses(userId);
    res.json(data);
  } catch (err) {
    console.error("Top Expenses Error:", err);
    res.status(500).json({ error: "Failed to load top expenses" });
  }
};

// 6. /analytics/transactions (type breakdown)
exports.getTypeBreakdown = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await analyticsModel.fetchTypeBreakdown(userId);
    res.json(data);
  } catch (err) {
    console.error("Type Breakdown Error:", err);
    res.status(500).json({ error: "Failed to load transaction breakdown" });
  }
};
