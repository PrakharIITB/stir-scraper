import React, { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

export function MovieDetails() {
  const { id } = useParams()
  const [movie, setMovie] = useState(null)

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const response = await fetch(`http://104.131.101.181:5000/api/movies/${id}`)
        const data = await response.json()
        setMovie(data)
      } catch (error) {
        console.error("Error fetching movie details:", error)
      }
    }

    fetchMovie()
  }, [id])

  if (!movie) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{movie.tmdb_title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Basic Information</h3>
              <p>
                <strong>Original Title:</strong> {movie.original_title}
              </p>
              <p>
                <strong>TMDb ID:</strong> {movie.tmdb_id}
              </p>
              <p>
                <strong>IMDb ID:</strong> {movie.imdb_id}
              </p>
              <p>
                <strong>Release Date:</strong> {movie.origin_release_date}
              </p>
              <p>
                <strong>Status:</strong> {movie.status}
              </p>
              <p>
                <strong>Runtime:</strong> {movie.runtime_minutes} minutes
              </p>
              <p>
                <strong>Adult:</strong> {movie.is_adult ? "Yes" : "No"}
              </p>
              <p>
                <strong>Original Language:</strong> {movie.original_language}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Financial Information</h3>
              <p>
                <strong>Budget:</strong> ${movie.budget?.toLocaleString()}
              </p>
              <p>
                <strong>Revenue:</strong> ${movie.revenue?.toLocaleString()}
              </p>
              <p>
                <strong>Popularity:</strong> {movie.popularity}
              </p>
              <p>
                <strong>TMDb Vote Average:</strong> {movie.tmdb_vote_average}
              </p>
              <p>
                <strong>TMDb Vote Count:</strong> {movie.tmdb_vote_count?.toLocaleString()}
              </p>
              <p>
                <strong>IMDb Vote Average:</strong> {movie.imdb_vote_average}
              </p>
              <p>
                <strong>IMDb Vote Count:</strong> {movie.imdb_vote_count?.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Overview</h3>
            <p>{movie.tmdb_overview}</p>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Tagline</h3>
            <p>{movie.tagline}</p>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Genres</h3>
            <p>{movie.genres.join(", ")}</p>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Spoken Languages</h3>
            <ul>
              {movie.spoken_languages.map((language, index) => (
                <li key={index}>
                  {language.english_name} ({language.name})
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Production Companies</h3>
            <p>{movie.production_companies.join(", ")}</p>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Cast</h3>
            <ul>
              {movie.cast.map((actor, index) => (
                <li key={index}>
                  {actor.full_name} as {actor.character_name}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Directors</h3>
            <p>{movie.directors.join(", ")}</p>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Writers</h3>
            <p>{movie.writers.join(", ")}</p>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Links</h3>
            <p>
              <strong>Homepage:</strong>{" "}
              <a href={movie.homepage} target="_blank" rel="noopener noreferrer">
                {movie.homepage}
              </a>
            </p>
            <p>
              <strong>Facebook:</strong> {movie.facebook_id}
            </p>
            <p>
              <strong>Instagram:</strong> {movie.instagram_id}
            </p>
            <p>
              <strong>Twitter:</strong> {movie.twitter_id}
            </p>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Other Information</h3>
            <p>
              <strong>Collection ID:</strong> {movie.collection_id || "N/A"}
            </p>
            <p>
              <strong>Collection Name:</strong> {movie.collection_name || "N/A"}
            </p>
            <p>
              <strong>Origin Country:</strong> {movie.origin_country}
            </p>
            <p>
              <strong>Wikidata ID:</strong> {movie.wikidata_id}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

