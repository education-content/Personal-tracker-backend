require('dotenv').config(); // Load environment variables first
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require('./config/db');
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const profileRoutes = require("./routes/profileRoutes");
const bankRoutes = require("./routes/bankRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const friendRoutes = require("./routes/friendRoute");
const analyticsRoutes = require("./routes/analyticsRoutes")
const sharedExpenseRoutes = require("./routes/sharedExpenseRoutes");
const settlementRoutes = require("./routes/settlementRoutes");


const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());


app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/profile", profileRoutes);
app.use("/bank-details", bankRoutes);
app.use("/categories", categoryRoutes);
app.use("/transactions", transactionRoutes);
app.use("/friends", friendRoutes);
app.use("/analytics",analyticsRoutes);
app.use("/shared-expenses", sharedExpenseRoutes);
app.use("/settlements", settlementRoutes);

const PORT = 5001;


db.getConnection()
  .then(conn => {
    console.log('✅ Connected to TiDB database successfully!');
    conn.release(); // Release the connection back to the pool

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to connect to TiDB database:', err.message);
    process.exit(1); // Exit if connection fails
  });

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

