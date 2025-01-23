const fs = require('fs');
const csvParser = require('csv-parser');
const path = require('path');
const addMovie = require('./add_movie');
const logger = require('../logger');

// Mock function to save data to the database
async function saveToDatabase(imdbId, tmdbId) {
  try {
    logger.info(`Saving to DB: IMDB ID = ${imdbId}, TMDB ID = ${tmdbId}`);
    await addMovie(tmdbId, imdbId);
  } catch (error) {
    logger.error(`Error saving to DB: IMDB ID = ${imdbId}, Error: ${error.message}`);
  }
}

async function processCsvFile(filePath) {
  const rows = [];

  // Step 1: Read and store rows
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        const imdbId = row['IMDB ID'];
        const tmdbId = row['TMDB ID'];

        // Only add valid rows to the list
        if (imdbId && tmdbId && imdbId.toLowerCase() !== 'null' && tmdbId.toLowerCase() !== 'null') {
          rows.push({ imdbId, tmdbId });
        } else {
          logger.info(`Skipping row: IMDB ID = ${imdbId}, TMDB ID = ${tmdbId}`);
        }
      })
      .on('end', () => {
        logger.info('CSV file read completed.');
        resolve();
      })
      .on('error', (error) => {
        logger.error(`Error reading CSV file: ${error.message}`);
        reject(error);
      });
  });

  // Step 2: Process rows sequentially
  for (const { imdbId, tmdbId } of rows) {
    await saveToDatabase(imdbId, tmdbId); // Wait for each save to complete
  }

  logger.info('All rows processed and saved.');
}

// Replace 'yourfile.csv' with the path to your CSV file
const file = path.join(path.dirname(__filename), 'updated_movie_data.csv');
processCsvFile(file).catch((error) => {
  logger.error(`Error processing CSV file: ${error.message}`);
});
