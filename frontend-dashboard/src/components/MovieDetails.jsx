import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

// Mock function to get movie details
const getMovieDetails = (id) => ({
  id: id,
  tmdb_id: 533535,
  imdb_id: "tt6263850",
  title: "Deadpool & Wolverine",
  original_title: "Deadpool & Wolverine",
  overview: "After facing some professional setbacks, Deadpool decides he's ready to hang up his suit. Just as he's about to announce his retirement to the world, a group of mercenaries kidnaps him and transports him to a secret facility. There, he encounters an old foe and a new ally, and together they must fight to save not just themselves, but potentially the entire Marvel Cinematic Universe.",
  tagline: "Come together.",
  status: "Released",
  homepage: "https://www.marvel.com/movies/deadpool-wolverine",
  release_date: '2024-07-24',
  runtime_minutes: 128,
  budget: 200000000,
  revenue: 1338073645,
  popularity: 717.795,
  vote_average: 7.647,
  vote_count: 6382,
  is_adult: false,
  original_language: "en",
  backdrop_path: "/placeholder.svg?height=300&width=500&text=Backdrop",
  poster_path: "/placeholder.svg?height=450&width=300&text=Poster",
  collection_id: 448150,
  origin_country: "US",
  wikidata_id: "Q65921361",
  facebook_id: "DeadpoolMovie",
  instagram_id: "deadpoolmovie",
  twitter_id: "deadpoolmovie",
});

export function MovieDetails() {
  const { id } = useParams();
  const movie = getMovieDetails(id);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="overflow-hidden">
        <CardHeader className="relative">
          <img src={movie.backdrop_path || "/placeholder.svg"} alt={`${movie.title} backdrop`} className="w-full h-auto" />
          <img src={movie.poster_path || "/placeholder.svg"} alt={movie.title} className="absolute bottom-0 left-4 w-1/4 border-4 border-white shadow-lg" />
        </CardHeader>
        <CardContent className="p-6">
          <CardTitle className="text-3xl mb-2">{movie.title}</CardTitle>
          <p className="text-xl text-gray-600 mb-4">{movie.tagline}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">Overview</h3>
              <p>{movie.overview}</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Details</h3>
              <ul className="space-y-2">
                <li><strong>Release Date:</strong> {movie.release_date}</li>
                <li><strong>Runtime:</strong> {movie.runtime_minutes} minutes</li>
                <li><strong>Budget:</strong> ${movie.budget.toLocaleString()}</li>
                <li><strong>Revenue:</strong> ${movie.revenue.toLocaleString()}</li>
                <li><strong>Popularity:</strong> {movie.popularity.toFixed(3)}</li>
                <li><strong>Vote Average:</strong> {movie.vote_average.toFixed(1)} ({movie.vote_count} votes)</li>
                <li><strong>Original Language:</strong> {movie.original_language}</li>
                <li><strong>Status:</strong> {movie.status}</li>
              </ul>
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-2">External Links</h3>
            <div className="flex space-x-4">
              {movie.homepage && <a href={movie.homepage} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Official Website</a>}
              {movie.facebook_id && <a href={`https://www.facebook.com/${movie.facebook_id}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Facebook</a>}
              {movie.instagram_id && <a href={`https://www.instagram.com/${movie.instagram_id}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Instagram</a>}
              {movie.twitter_id && <a href={`https://www.twitter.com/${movie.twitter_id}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Twitter</a>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

