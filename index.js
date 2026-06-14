const express = require('express');
const app = express();

const port = 3000;

// Middleware to parse JSON
app.use(express.json());

// Hello World API endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Hello World!',
    status: 'success',
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});