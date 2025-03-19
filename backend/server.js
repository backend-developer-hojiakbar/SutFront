const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());


// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api', authRoutes);

app.get('/', (req, res) => {
  res.send('Backend API is running');
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
