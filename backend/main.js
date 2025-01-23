const path = require("path");
const db = require("./db/db");
const processCsvAndSaveMovies = require("./utilities/processCsvAndSaveMovie");
const addMovie = require("./utilities/add_movie");

// db.select('*').from('movies').limit(10)
//   .then(users => {
//     console.log("Data from user table:", users);
//   })
//   .catch(err => {
//     console.error("Error fetching data from user table:", err);
//   })
//   .finally(() => {
//     db.destroy(); // Close the database connection
//   });

// const csvFilePath = path.join(__dirname, 'movies.csv');
// processCsvAndSaveMovies(csvFilePath)
const imdbId = "tt8772262";
const tmdbId = "530385";
const file = path.join(path.dirname(__filename), 'static', 'movie_data.xlsx');  
processCsvAndSaveMovies(file)
// async function add(imdbId, tmdbId) {
//   try {
//     console.log(`Saving movie with IMDb ID: ${imdbId} and TMDb ID: ${tmdbId}`);
//     await addMovie(tmdbId, imdbId);
//   } catch (error) {
//     console.error(`Error saving movie with IMDb ID: ${imdbId}`, error);
//   }
// }

// add(imdbId, tmdbId);

