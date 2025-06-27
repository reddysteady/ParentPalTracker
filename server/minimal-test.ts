import express from "express";

const app = express();
const PORT = 5000;

app.get('/test', (req, res) => {
  res.json({ message: 'minimal test works' });
});

app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
});