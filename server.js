const express = require('express');
const cors = require('cors');
const { scrapeMenu } = require('./scraper/menuScraper');

const app = express();
const PORT = 3001;

app.use(cors());

app.get('/glasgow', async (req, res) => {
  const data = await scrapeMenu('Glasgow', '03');
  res.json(data);
});

app.get('/lothian', async (req, res) => {
  const data = await scrapeMenu('Lothian', '02');
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
