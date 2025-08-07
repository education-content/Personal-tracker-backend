const express = require("express");
const router = express.Router();
const dashboardController = require("../controller/dashboardController");
const { verifyToken } = require("../middleware/authmiddleware"); // ✅ fix here

router.get("/summary", verifyToken, dashboardController.getSummary);
router.get("/stats/monthly", verifyToken, dashboardController.getMonthlyStats);
router.get("/stats/categories", verifyToken, dashboardController.getCategoryStats);
router.get("/stats/scholarships", verifyToken, dashboardController.getScholarshipStats);

module.exports = router;
