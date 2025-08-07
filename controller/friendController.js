const friendModel = require("../model/friendModel");

// POST /friends/request
const db = require("../config/db");

exports.sendRequest = async (req, res) => {
  const senderId = req.user.id;
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Receiver email is required" });
  }

  try {
    // 🔍 Find user by email
    const [users] = await db.query("SELECT id FROM users WHERE email = ?", [email]);

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const receiver_id = users[0].id;

    if (senderId === receiver_id) {
      return res.status(400).json({ error: "Cannot send request to yourself" });
    }

    const existing = await friendModel.checkExistingRequest(senderId, receiver_id);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Request already exists or accepted" });
    }

    await friendModel.sendFriendRequest(senderId, receiver_id);
    res.status(201).json({ message: "Friend request sent" });
  } catch (err) {
    console.error("Send request error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
    

// GET /friends/requests
exports.getRequests = async (req, res) => {
  const userId = req.user.id;

  try {
    const requests = await friendModel.getFriendRequestsForUser(userId);
    res.json(requests);
  } catch (err) {
    console.error("Get requests error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /friends/respond
exports.respond = async (req, res) => {
  const userId = req.user.id;
  const { request_id, action } = req.body;

  if (!["accept", "reject"].includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  try {
    await friendModel.respondToFriendRequest(request_id, userId, action);
    res.json({ message: `Friend request ${action}ed` });
  } catch (err) {
    console.error("Respond error:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET /friends
exports.getFriends = async (req, res) => {
  const userId = req.user.id;

  try {
    const friends = await friendModel.getFriendsOfUser(userId);
    res.json(friends);
  } catch (err) {
    console.error("Get friends error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE /friends/:friend_id
exports.remove = async (req, res) => {
  const userId = req.user.id;
  const { friend_id } = req.params;

  try {
    await friendModel.removeFriend(userId, friend_id);
    res.json({ message: "Friend removed" });
  } catch (err) {
    console.error("Remove friend error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
