const express = require("express");
const router = express.Router();
const friendController = require("../controller/friendController");
const {verifyToken} = require("../middleware/authmiddleware"); // ⛔ Make sure user is authenticated

router.use(verifyToken); // protect all friend routes

router.post("/request", friendController.sendRequest);
router.get("/requests", friendController.getRequests);
router.post("/respond", friendController.respond);
router.get("/", friendController.getFriends);
router.delete("/:friend_id", friendController.remove);

module.exports = router;
