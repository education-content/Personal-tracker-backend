const express = require("express");
const router = express.Router();
const { getProfile, updateProfile } = require("../controller/profileController");
const {verifyToken} = require("../middleware/authMiddleware");

// profileRoutes.js
router.get("/", verifyToken, getProfile);      // ✅ /profile
router.put("/", verifyToken, updateProfile);   // ✅ /profile


module.exports = router;
