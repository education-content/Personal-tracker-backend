require('dotenv').config(); // Load environment variables first
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require('./config/db');
const authRoutes = require("./routes/authRoutes");

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());


app.use("/auth", authRoutes);

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

