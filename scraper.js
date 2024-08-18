const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const { MongoClient } = require('mongodb');

const mongoURI = 'mongodb://localhost:27017';
const dbName = 'scraperDB';
const collectionName = 'scrapedData';

const app = express();
const port = 5500;

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve landing.html directly from the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// Render index.ejs when accessing /index
app.get('/index', (req, res) => {
  res.render('index');
});

// Route to handle form submission and scraping
app.post('/scrape', async (req, res) => {
  const url = req.body.url;
  const selectors = req.body.selectors.split(',').map(selector => selector.trim());

  try {
    // Launch Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Scrape data using the provided selectors, including image sources
    const scrapedData = await page.evaluate((selectors) => {
      const data = [];
      selectors.forEach(selector => {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          data.push({
            selector,
            data: elements.map(element => {
              if (element.tagName.toLowerCase() === 'img') {
                return element.src;
              } else {
                return element.textContent.trim();
              }
            })
          });
        }
      });
      return data;
    }, selectors);

    // Connect to MongoDB and insert the scraped data
    const client = new MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    await collection.insertMany(scrapedData);

    // Close the MongoDB connection
    await client.close();

    console.log('Scraped data saved to MongoDB');

    // Render the results
    res.render('results', { scrapedData });

  } catch (error) {
    res.status(500).send('Error occurred: ' + error.message);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
