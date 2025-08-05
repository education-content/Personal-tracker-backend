const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../model/userModel");

// Make sure you have this environment variable set
const JWT_SECRET = process.env.JWT_SECRET || "your_default_secret"; // fallback for dev

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { name, email, password, mobile_no } = req.body;

  try {
    const existingUser = await User.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("✅ Storing hashed password:", hashedPassword);


    await User.createUser(name, email, hashedPassword, mobile_no);

    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    const user = await User.findUserByEmail(email);

    if (!user) {
      console.log("❌ User not found for email:", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("✅ User found:", user);

    const hashedPassword =
      typeof user.password === "string"
        ? user.password
        : user.password.toString();

    const isMatch = await bcrypt.compare(password, hashedPassword);
    // console.log("💾 Retrieved hash from DB:", hashedPassword);
    // console.log("🔍 Comparing with input password:", password);


    // console.log("🔐 Password match:", isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile_no: user.mobile_no,
      },
    });
  } catch (err) {
    console.error("💥 Login Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

