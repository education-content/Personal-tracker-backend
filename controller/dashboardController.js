const Dashboard = require("../model/dashboardModel");

exports.getSummary = async (req, res) => {
  try {
    const data = await Dashboard.getSummary(req.user.id);
    res.json(data);
  } catch (err) {
    console.error("Error in getSummary:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getMonthlyStats = async (req, res) => {
  try {
    const data = await Dashboard.getMonthlyStats(req.user.id);
    res.json(data);
  } catch (err) {
    console.error("Error in getMonthlyStats:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getCategoryStats = async (req, res) => {
  try {
    const data = await Dashboard.getCategoryStats(req.user.id);
    res.json(data);
  } catch (err) {
    console.error("Error in getCategoryStats:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getScholarshipStats = async (req, res) => {
  try {
    const data = await Dashboard.getScholarshipStats(req.user.id);
    res.json(data);
  } catch (err) {
    console.error("Error in getScholarshipStats:", err);
    res.status(500).json({ message: "Server error" });
  }
};
