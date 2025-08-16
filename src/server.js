const app = require('./app');
const connectDB = require('./config/db');
const http = require('http');
const PORT = process.env.PORT || 3000;

// Function to keep the server alive by pinging itself
const keepAlive = () => {
  if (process.env.RENDER) { 
    setInterval(() => {
      http.get(`http://${process.env.RENDER_INSTANCE_URL || `localhost:${PORT}`}`, (res) => {
        console.log(`Keep-alive ping sent, status code: ${res.statusCode}`);
      }).on('error', (err) => {
        console.error('Error sending keep-alive ping:', err.message);
      });
    }, 5 * 60 * 1000); // Ping every 5 minutes
  }
};

// Start server
const startServer = async () => {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    keepAlive(); // Start keep-alive after server starts
  });
  
  // Handle server errors
  server.on('error', (error) => {
    console.error('Server error:', error);
  });
};

startServer();