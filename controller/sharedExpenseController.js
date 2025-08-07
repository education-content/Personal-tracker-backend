
const sharedExpenseModel = require("../model/sharedExpensesModel");

exports.getSharedExpenses = async (req, res) => {
  const userId = req.user.id;
  console.log(userId)
  try {
    const data = await sharedExpenseModel.fetchSharedExpenses(userId);
    console.log(data);
    res.status(200).json(data);
  } catch (err) {
    console.error("Error in getSharedExpenses:", err);
    res.status(500).json({ message: "Failed to fetch shared expenses." });
  }
};
