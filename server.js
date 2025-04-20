const express = require('express');
const cors = require('cors');
const { scrapeMenu } = require('./scraper/menuScraper');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

let glasgowData = null;
let lothianData = null;

// Function to scrape and cache data
const refreshMenuData = async () => {
  console.log("Refreshing menu data...");
  try {
    glasgowData = await scrapeMenu('Glasgow', '03');
    lothianData = await scrapeMenu('Lothian', '02');
    console.log("Menu data refreshed successfully");
  } catch (err) {
    console.error("Error scraping menu:", err);
  }
};

// Initial scrape on server start
refreshMenuData();

// Refresh every 15 minutes
setInterval(refreshMenuData, 15 * 60 * 1000);

// Routes use cached data
app.get('/glasgow', (req, res) => {
  if (!glasgowData) return res.status(503).json({ error: 'Data not yet loaded' });
  res.json(glasgowData);
});

app.get('/lothian', (req, res) => {
  if (!lothianData) return res.status(503).json({ error: 'Data not yet loaded' });
  res.json(lothianData);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
