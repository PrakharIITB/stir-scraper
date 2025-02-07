const db = require("../db/db");
const logger = require("../logs/logger");
const imageBaseUrl = "https://image.tmdb.org/t/p/original";
const { RMQ_Publish_Message } = require("../utilities/RMQ");

async function getTmdbData(movieTmdbID) {
  const url = `https://api.themoviedb.org/3/movie/${movieTmdbID}?api_key=${process.env.TMDB_API_KEY}`;
  try {
    let status = false;
    for (let i = 1; i <= 3; i++) {
      const response = await fetch(url);
      if (response.status === 429) {
        logger.error(
          "TMDB API rate limit exceeded, waiting 20 seconds before the next try."
        );
        await new Promise((resolve) => setTimeout(resolve, 20000));
        continue;
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.statusText}`);
      }
      else return response.json();
    }
    if (!status) {
      throw new Error("TMDB API rate limit exceeded, please try again later.");
    }
  } catch (error) {
    if(error.message === "TMDB API rate limit exceeded, please try again later."){
      throw error;
    }
    logger.error("Error fetching data from TMDB:", error);
  }
}

async function getImdbData(imdbId) {
  const url = `https://imdb236.p.rapidapi.com/imdb/${imdbId}`;
  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": process.env.IMDB_API_KEY,
      "x-rapidapi-host": "imdb236.p.rapidapi.com",
    },
  };

  try {
    let status = false;
    for (let i = 1; i <= 3; i++) {
      const response = await fetch(url, options);
      if (response.status === 429) {
        logger.error(
          "IMDB API rate limit exceeded, waiting 20 seconds before the next try."
        );
        await new Promise((resolve) => setTimeout(resolve, 20000));
        continue;
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.statusText}`);
      }
      else return response.json();
    }
    if (!status) {
      throw new Error("IMDB API rate limit exceeded, please try again later.");
    }
  } catch (error) {
    if(error.message === "IMDB API rate limit exceeded, please try again later."){
      throw error;
    }
    logger.error("Error fetching data from IMDB:", error);
  }
}

async function getExternalIds(tmdbId) {
  url = `https://api.themoviedb.org/3/movie/${tmdbId}/external_ids?api_key=${process.env.TMDB_API_KEY}`;
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .catch((error) => {
      logger.error("Error fetching data from TMDB:", error);
      // throw error;
    });
}

async function populateGenres(movieId, imdbData) {
  try {
    // Get genres from tmdbData
    const genres = imdbData.genres || []; // Ensure genres array exists
    for (const genre of genres) {
      // Insert genre into the genres table, ignoring duplicates
      const [genreId] = await db("genres")
        .insert({ name: genre })
        .onConflict("name") // PostgreSQL: Avoid inserting duplicates
        .ignore()
        .returning("id"); // Ensure the ID is returned

      // Insert the movie-genre relationship
      if (genreId)
        await db("movie_genres").insert({
          movie_id: movieId,
          genre_id: genreId.id,
        });
      else {
        const existingGenre = await db("genres")
          .select("id")
          .where({ name: genre })
          .first();

        if (existingGenre) {
          await db("movie_genres").insert({
            movie_id: movieId,
            genre_id: existingGenre.id,
          });
        }
      }
    }

    logger.info(`Genres populated for movie ID: ${movieId}`);
  } catch (error) {
    logger.error("Error populating genres:", error);
  }
}

async function populateSpokenLanguages(movieId, tmdbData) {
  try {
    const languages = tmdbData.spoken_languages || []; // Ensure languages array exists

    for (const language of languages) {
      // Insert language into the spoken_languages table
      const { iso_639_1, name, english_name } = language;
      await db("spoken_languages")
        .insert({ iso_639_1, name, english_name })
        .onConflict("iso_639_1")
        .ignore();

      // Insert the movie-language relationship
      await db("movie_spoken_languages").insert({
        movie_id: movieId,
        language_code: iso_639_1,
      });
    }

    logger.info(`Spoken languages populated for movie ID: ${movieId}`);
  } catch (error) {
    logger.error("Error populating spoken languages:", error);
  }
}

async function populateTmdbProductionCompanies(movieId, tmdbData) {
  try {
    const companies = tmdbData.production_companies || []; // Ensure companies array exists

    for (const company of companies) {
      // Insert company into the tmdb_production_companies table
      const { id, name, origin_country } = company;
      logo_path = imageBaseUrl + company.logo_path;
      const [companyId] = await db("tmdb_production_companies")
        .insert({ tmdb_id: id, name, logo_path, origin_country })
        .onConflict("tmdb_id")
        .ignore()
        .returning("id");

      // Insert the movie-company relationship
      if (companyId) {
        await db("movie_tmdb_production_companies").insert({
          movie_id: movieId,
          company_id: companyId.id,
        });
      } else {
        const existingCompany = await db("tmdb_production_companies")
          .select("id")
          .where({ tmdb_id: id })
          .first();

        if (existingCompany) {
          await db("movie_tmdb_production_companies").insert({
            movie_id: movieId,
            company_id: existingCompany.id,
          });
        }
      }
    }

    logger.info(`TMDb production companies populated for movie ID: ${movieId}`);
  } catch (error) {
    logger.error("Error populating TMDb production companies:", error);
  }
}

async function populateImdbProductionCompanies(movieId, imdbData) {
  try {
    const companies = imdbData.productionCompanies || []; // Ensure companies array exists

    for (const company of companies) {
      // Insert company into the imdb_production_companies table
      const { id, name } = company;
      const [companyId] = await db("imdb_production_companies")
        .insert({ imdb_id: id, name })
        .onConflict("imdb_id")
        .ignore()
        .returning("id");

      // Insert the movie-company relationship
      if (companyId)
        await db("movie_imdb_production_companies").insert({
          movie_id: movieId,
          company_id: companyId.id,
        });
      else {
        const existingCompany = await db("imdb_production_companies")
          .select("id")
          .where({ imdb_id: id })
          .first();

        if (existingCompany) {
          await db("movie_imdb_production_companies").insert({
            movie_id: movieId,
            company_id: existingCompany.id,
          });
        }
      }
    }

    logger.info(`IMDb production companies populated for movie ID: ${movieId}`);
  } catch (error) {
    logger.error("Error populating IMDb production companies:", error);
  }
}

async function populateCrew(movieId, imdbData) {
  try {
    const crewMembers = imdbData.cast || []; // Ensure crew array exists

    for (const member of crewMembers) {
      const { id, fullName, job } = member;
      const characters = member.characters.join(", ");

      // Insert crew member into the crew table
      var crewId;
      try {
        const [cid] = await db("crew")
          .insert({ imdb_id: id, full_name: fullName, job })
          .onConflict(["imdb_id", "job"])
          .ignore()
          .returning("id");
        crewId = cid;
      } catch (error) {
        logger.error("Error adding crew: ", error);
      }

      // Insert the movie-crew relationship
      if (crewId)
        await db("movie_crew").insert({
          movie_id: movieId,
          crew_id: crewId.id,
          character_name: characters,
        });
      else {
        const existingCrew = await db("crew")
          .select("id")
          .where({ imdb_id: id, job })
          .first();

        if (existingCrew) {
          await db("movie_crew").insert({
            movie_id: movieId,
            crew_id: existingCrew.id,
            character_name: characters,
          });
        }
      }
    }
    //directors
    const directors = imdbData.directors || [];
    for (const director of directors) {
      const { id, fullName } = director;
      var directorId;
      try {
        const [dId] = await db("crew")
          .insert({ imdb_id: id, full_name: fullName, job: "director" })
          .onConflict(["imdb_id", "job"])
          .ignore()
          .returning("id");
        directorId = dId;
      } catch (error) {
        logger.error("Error adding director: ", error);
      }

      // Insert the movie-crew relationship
      if (directorId)
        await db("movie_crew").insert({
          movie_id: movieId,
          crew_id: directorId.id,
        });
      else {
        const existingDirector = await db("crew")
          .select("id")
          .where({ imdb_id: id, job: "director" })
          .first();

        if (existingDirector) {
          await db("movie_crew").insert({
            movie_id: movieId,
            crew_id: existingDirector.id,
          });
        }
      }
    }

    //writers
    const writers = imdbData.writers || [];
    for (const writer of writers) {
      const { id, fullName } = writer;
      var writerId;
      try {
        const [wId] = await db("crew")
          .insert({ imdb_id: id, full_name: fullName, job: "writer" })
          .onConflict(["imdb_id", "job"])
          .ignore()
          .returning("id");
        writerId = wId;
      } catch (error) {
        logger.error("Error adding writer: ", error);
      }

      // Insert the movie-crew relationship
      if (writerId)
        await db("movie_crew").insert({
          movie_id: movieId,
          crew_id: writerId.id,
        });
      else {
        const existingWriter = await db("crew")
          .select("id")
          .where({ imdb_id: id, job: "writer" })
          .first();

        if (existingWriter) {
          await db("movie_crew").insert({
            movie_id: movieId,
            crew_id: existingWriter.id,
          });
        }
      }
    }

    logger.info(`Crew populated for movie ID: ${movieId}`);
  } catch (error) {
    logger.error("Error populating crew:", error);
  }
}

async function addMovie(movieTmdbId, movieImdbId) {
  try {
    // Fetching data asynchronously
    const [tmdbData, imdbData, externalIds] = await Promise.all([
      getTmdbData(movieTmdbId),
      getImdbData(movieImdbId),
      getExternalIds(movieTmdbId),
    ]);

    // Processing data
    const releaseDate = imdbData.releaseDate || tmdbData.release_date;
    const runtime = imdbData.runtimeMinutes || tmdbData.runtime;
    const budget =
      imdbData.budget && imdbData.budget !== 0
        ? imdbData.budget
        : tmdbData.budget && tmdbData.budget !== 0
        ? tmdbData.budget
        : null;

    // Creating movieData object
    const movieData = {
      tmdb_id: movieTmdbId,
      imdb_id: movieImdbId,
      imdb_title: imdbData.primaryTitle,
      tmdb_title: tmdbData.title,
      original_title: imdbData.originalTitle,
      imdb_overview: imdbData.description,
      tmdb_overview: tmdbData.overview,
      tagline: tmdbData.tagline,
      status: tmdbData.status,
      homepage: tmdbData.homepage,
      origin_release_date: releaseDate,
      runtime_minutes: runtime,
      budget: budget,
      revenue: tmdbData.revenue,
      popularity: tmdbData.popularity,
      tmdb_vote_average: tmdbData.vote_average,
      tmdb_vote_count: tmdbData.vote_count,
      imdb_vote_average: imdbData.averageRating,
      imdb_vote_count: imdbData.numVotes,
      is_adult: imdbData.isAdult,
      original_language: tmdbData.original_language,
      backdrop_path: imageBaseUrl + tmdbData.backdrop_path,
      poster_path: imageBaseUrl + tmdbData.poster_path,
      origin_country: tmdbData.origin_country?.join(", ") || null,
      interests: imdbData.interests?.join(", ") || null,
      wikidata_id: externalIds.wikidata_id,
      facebook_id: externalIds.facebook_id,
      instagram_id: externalIds.instagram_id,
      twitter_id: externalIds.twitter_id,
      collection_id: tmdbData.belongs_to_collection?.id || null,
      collection_name: tmdbData.belongs_to_collection?.name || null,
    };

    // Sanitizing the data
    const sanitizedMovieData = Object.fromEntries(
      Object.entries(movieData).filter(
        ([_, value]) => value !== undefined && value !== null
      )
    );

    // Inserting data into the database
    const [id] = await db("movies").insert(sanitizedMovieData).returning("id");
    await populateGenres(id.id, imdbData);
    await populateSpokenLanguages(id.id, tmdbData);
    await populateTmdbProductionCompanies(id.id, tmdbData);
    await populateImdbProductionCompanies(id.id, imdbData);
    await populateCrew(id.id, imdbData);

    logger.info(`Movie and related data saved successfully for ID: ${id.id}`);
    return;
  } catch (error) {
    logger.error("Error saving movie:", error);
    return { error: "An error occurred while saving the movie", status: 500 }; 
  }
}

async function addToScraperQueue(movieId, hashtag) {
  try {
    const [task] = await db("tasks")
      .insert({
        movie_id: movieId,
        query: hashtag,
        platform: "instagram",
        status: "pending",
      })
      .returning("id");

    await RMQ_Publish_Message("instagram_queue", task.id);
  } catch (error) {
    logger.error("Error adding task to scraper queue:", error);
  }
}

async function addMovieHashtag(tmdbId, imdbId, hashtag) {
  try {
    // Get the movie ID from the database using the TMDB ID
    const movie = await db("movies")
      .select("id")
      .where({ tmdb_id: tmdbId })
      .first();

    if (movie) {
      // Insert the movie ID, TMDB ID, IMDb ID, and hashtag into the movie_hashtag table
      const existingHashtags = await db("movie_hashtags")
        .select("hashtag")
        .where({ movie_id: movie.id });

      const existingHashtagList = existingHashtags.map((h) =>
        h.hashtag.toLowerCase()
      );

      if (!existingHashtagList.includes(hashtag.toLowerCase())) {
        await db("movie_hashtags").insert({
          movie_id: movie.id,
          hashtag: hashtag,
        });
        await addToScraperQueue(movie.id, hashtag);
      }

      logger.info(`Hashtag added successfully for movie ID: ${movie.id}`);
    } else {
      logger.warn(`Movie with IMDB ID: ${tmdbId} not found`);
    }
  } catch (error) {
    logger.error("Error adding hashtag:", error);
  }
}

module.exports = { addMovie, addMovieHashtag };
