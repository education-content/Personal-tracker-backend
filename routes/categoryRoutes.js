const express = require("express");
const router = express.Router();
const { getCategories } = require("../controller/categoryController");
const { verifyToken } = require("../middleware/authmiddleware"); // ✅ include middleware

// ✅ Apply verifyToken here
router.get("/", verifyToken, getCategories);

module.exports = router;
