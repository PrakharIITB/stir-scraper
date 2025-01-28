const fs = require('fs');
const csvParser = require('csv-parser');
const path = require('path');
const {addMovie, addMovieHashtag} = require('../utilities/add_movie');
const logger = require('../logs/logger');

// Mock function to save data to the database
async function saveToDatabase(imdbId, tmdbId) {
  try {
    logger.info(`Saving to DB: IMDB ID = ${imdbId}, TMDB ID = ${tmdbId}`);
    await addMovie(tmdbId, imdbId);
  } catch (error) {
    logger.error(`Error saving to DB: IMDB ID = ${imdbId}, Error: ${error.message}`);
  }
}

async function saveHashtag(imdbId, tmdbId, hashtag){
  try {
    logger.info(`Saving hashtag for: IMDB ID = ${imdbId}, TMDB ID = ${tmdbId}, hashtag = ${hashtag}`);
    await addMovieHashtag(tmdbId, imdbId, hashtag);
  } catch (error) {
    logger.error(`Error saving hashtag for: IMDB ID = ${imdbId}, Error: ${error.message}`);
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
        const hashtag = row['Query']

        // Only add valid rows to the list
        if (imdbId && tmdbId && imdbId.toLowerCase() !== 'null' && tmdbId.toLowerCase() !== 'null') {
          rows.push({ imdbId, tmdbId, hashtag });
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
  console.log(rows);
  
  // Step 2: Process rows sequentially
  for (const { imdbId, tmdbId, hashtag } of rows) {
    await saveHashtag(imdbId, tmdbId, hashtag); // Wait for each save to complete
  }

  logger.info('All rows processed and saved.');
}

// Replace 'yourfile.csv' with the path to your CSV file
const file = path.join(path.dirname(__filename), 'hashtags.csv');
processCsvFile(file).catch((error) => {
  logger.error(`Error processing CSV file: ${error.message}`);
});
