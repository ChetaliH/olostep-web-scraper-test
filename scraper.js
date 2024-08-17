const axios = require('axios');
const cheerio = require('cheerio');
const readline = require('readline');
const { MongoClient } = require('mongodb');

// MongoDB connection URI
const uri = 'mongodb://localhost:27017';  // Default URI for local MongoDB
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// Create an interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask questions
const askQuestion = (question) => {
  return new Promise(resolve => rl.question(question, resolve));
};

// Function to store data in MongoDB
const storeDataInMongoDB = async (data) => {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const database = client.db('scraperDB'); // Database name
    const collection = database.collection('scrapedData'); // Collection name

    // Insert data
    const result = await collection.insertMany(data);
    console.log('Data inserted:', result.insertedIds);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
};

const scrapeData = async () => {
  try {
    // Get URL and selectors from the user
    const url = await askQuestion('Enter the URL to scrape: ');
    const selectors = await askQuestion('Enter CSS selectors (comma separated): ');

    // Close the readline interface
    rl.close();

    // Fetch the webpage
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Split the selectors and scrape data
    const selectorArray = selectors.split(',').map(selector => selector.trim());
    const scrapedData = [];

    selectorArray.forEach(selector => {
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

    console.log('Scraped data:', scrapedData);

    // Store data in MongoDB
    await storeDataInMongoDB(scrapedData);

  } catch (error) {
    console.error('Error:', error);
  }
};

// Start the scraping process
scrapeData();
