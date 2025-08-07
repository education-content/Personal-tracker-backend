const db = require("../config/db");

exports.sendFriendRequest = async (senderId, receiverId) => {
  return await db.query(
    `INSERT INTO friend_requests (sender_id, receiver_id) VALUES (?, ?)`,
    [senderId, receiverId]
  );
};

exports.getFriendRequestsForUser = async (userId) => {
  const [rows] = await db.query(
    `SELECT fr.*, u.name as sender_name 
     FROM friend_requests fr
     JOIN users u ON fr.sender_id = u.id
     WHERE fr.receiver_id = ? AND fr.status = 'pending'`,
    [userId]
  );
  return rows;
};

exports.checkExistingRequest = async (senderId, receiverId) => {
  const [rows] = await db.query(
    `SELECT * FROM friend_requests 
     WHERE (sender_id = ? AND receiver_id = ?) 
        OR (sender_id = ? AND receiver_id = ?)`,
    [senderId, receiverId, receiverId, senderId]
  );
  return rows;
};

exports.respondToFriendRequest = async (requestId, userId, action) => {
  const [rows] = await db.query(
    `SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ?`,
    [requestId, userId]
  );

  if (!rows.length) throw new Error("Request not found");

  // Map 'accept' -> 'accepted', 'reject' -> 'rejected'
  const statusMap = {
    accept: "accepted",
    reject: "rejected",
  };

  const status = statusMap[action];
  if (!status) throw new Error("Invalid action");

  return await db.query(
    `UPDATE friend_requests SET status = ? WHERE id = ?`,
    [status, requestId]
  );
};

exports.getFriendsOfUser = async (userId) => {
  const [rows] = await db.query(
    `SELECT u.id, u.name, u.email
     FROM users u
     WHERE u.id IN (
       SELECT CASE 
         WHEN sender_id = ? THEN receiver_id 
         ELSE sender_id 
       END
       FROM friend_requests 
       WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'
     )`,
    [userId, userId, userId]
  );
  return rows;
};

exports.removeFriend = async (userId, friendId) => {
  return await db.query(
    `DELETE FROM friend_requests 
     WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) 
     AND status = 'accepted'`,
    [userId, friendId, friendId, userId]
  );
};
