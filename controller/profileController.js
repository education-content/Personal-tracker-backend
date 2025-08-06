const User = require("../model/userModel");

exports.getProfile = async (req, res) => {
  try {
    const user = await User.getUserById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json(user);
  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateProfile = async (req, res) => {
  const { name, mobile_no } = req.body;

  if (!name || !mobile_no) {
    return res.status(400).json({ message: "Name and mobile number required" });
  }

  try {
    await User.updateUserById(req.user.id, name, mobile_no);
    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};