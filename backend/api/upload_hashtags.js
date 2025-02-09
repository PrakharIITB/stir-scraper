const express = require("express");
const router = express.Router();
const db = require("../db/db")
const { addMovie, addMovieHashtag } = require("../utilities/add_movie");

router.post("/upload-hashtags", async (req, res) => {
    try {
        const file = req.files.file;
        const csv = file.data.toString("utf-8");
        const lines = csv.split("\n").map((line) => line.trim()).filter(Boolean);
        const headers = lines.shift().split(",");

        for (const line of lines) {
            const [movieName, movieTmdbId, movieImdbId, hashtagsStr] = line.split(",");
            const hashtags = hashtagsStr.split(" ").map((hashtag) => hashtag.toLowerCase().trim()).filter(Boolean);
            const movie = await db("movies").where({ imdb_id: movieImdbId }).first();
            if (!movie) {
               const res =  await addMovie(movieTmdbId, movieImdbId);
               if(res.status === 500) {
                   console.log("Error adding movie with imdb_id: ", movieImdbId);
                   continue;
               }
            } 
            for(const hashtag of hashtags) {
                await addMovieHashtag(movieTmdbId, movieImdbId, hashtag);
            }
        }
    
        res.status(200).json({ hashtags, message: "File processed successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while processing the file" });
    }
})

module.exports = router