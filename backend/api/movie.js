const express = require("express");
const router = express.Router();
const db = require("../db/db");

router.get("/movies", async (req, res) => {
  const page = Number.parseInt(req.query.page) || 1
  const limit = Number.parseInt(req.query.limit) || 20
  const sortBy = req.query.sortBy || "id"
  const sortOrder = req.query.sortOrder || "asc"
  const search = req.query.search || ""
  const offset = (page - 1) * limit

  try {
    let query = db("movies")

    if (search) {
      query = query
        .where("tmdb_title", "ilike", `%${search}%`)
        .orWhere("imdb_title", "ilike", `%${search}%`)
        .orWhere("original_title", "ilike", `%${search}%`)
        .orWhereRaw('CAST("id" AS TEXT) ILIKE ?', [`%${search}%`])
        .limit(limit);
    }

    const totalCount = await query.clone().count("* as count").first()
    const movies = await query.select("*").orderBy(sortBy, sortOrder).limit(limit).offset(offset)

    res.json({
      movies,
      totalCount: Number.parseInt(totalCount.count),
      totalPages: Math.ceil(Number.parseInt(totalCount.count) / limit),
      currentPage: page,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "An error occurred while fetching movies" })
  }
});

router.get("/movies/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const movie = await db("movies").where({ id }).first();

    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    const genres = await db("movie_genres")
      .join("genres", "movie_genres.genre_id", "genres.id")
      .where("movie_genres.movie_id", id)
      .select("genres.name");

    const languages = await db("movie_spoken_languages")
      .join(
        "spoken_languages",
        "movie_spoken_languages.language_code",
        "spoken_languages.iso_639_1"
      )
      .where("movie_spoken_languages.movie_id", id)
      .select("spoken_languages.name", "spoken_languages.english_name");

    const companies = await db("movie_tmdb_production_companies")
      .join(
        "tmdb_production_companies",
        "movie_tmdb_production_companies.company_id",
        "tmdb_production_companies.id"
      )
      .where("movie_tmdb_production_companies.movie_id", id)
      .select("tmdb_production_companies.name");

    const crew = await db("movie_crew")
      .join("crew", "movie_crew.crew_id", "crew.id")
      .where("movie_crew.movie_id", id)
      .select("crew.full_name", "crew.job", "movie_crew.character_name");

    movie.genres = genres.map((g) => g.name);
    movie.spoken_languages = languages;
    movie.production_companies = companies.map((c) => c.name);
    movie.cast = crew.filter((c) => (c.job === "actor" || c.job === "actress"));
    movie.directors = crew
      .filter((c) => c.job === "director")
      .map((d) => d.full_name);
    movie.writers = crew
      .filter((c) => c.job === "writer")
      .map((w) => w.full_name);

    res.json(movie);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the movie" });
  }
});

module.exports = router;
