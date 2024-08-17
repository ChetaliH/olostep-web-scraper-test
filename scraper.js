const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const port = 5500;

// MongoDB URI and Database
const mongoURI = 'mongodb://localhost:27017'; // Change this if using MongoDB Atlas
const dbName = 'scraperDB'; // Name of your database

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// MongoDB client setup
const client = new MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    return client.db(dbName);
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
  }
}

// Route to render the form
app.get('/', (req, res) => {
  res.render('index');
});

// Route to handle form submission and scraping
app.post('/scrape', async (req, res) => {
  const url = req.body.url;
  const selectors = req.body.selectors.split(',').map(selector => selector.trim());
  
  try {
    // Fetch the webpage
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Scrape data
    const scrapedData = [];
    selectors.forEach(selector => {
      const data = [];
      $(selector).each((i, element) => {
        data.push($(element).text().trim());
      });
      if (data.length > 0) {
        scrapedData.push({
          selector,
          data
        });
      }
    });

    // Store data in MongoDB
    const db = await connectToDatabase();
    const collection = db.collection('scrapedData');
    await collection.insertOne({ url, selectors, scrapedData });

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
