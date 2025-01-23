import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

// Mock data for movies with all specified columns
const mockMovies = Array(100)
  .fill()
  .map((_, index) => ({
    id: index + 1,
    tmdb_id: 533535 + index,
    imdb_id: `tt${6263850 + index}`,
    title: `Movie ${index + 1}`,
    original_title: `Original Movie ${index + 1}`,
    overview: `This is an overview for Movie ${index + 1}. It contains a brief description of the movie's plot.`,
    tagline: `Tagline for Movie ${index + 1}`,
    status: index % 2 === 0 ? "Released" : "Upcoming",
    homepage: `https://example.com/movie${index + 1}`,
    release_date: "2024-07-24",
    runtime_minutes: 120 + index,
    budget: 150000000 + index * 1000000,
    revenue: 300000000 + index * 2000000,
    popularity: 717.795 - index * 0.5,
    vote_average: 7.6 + (index % 10) * 0.1,
    vote_count: 6382 + index * 10,
    is_adult: index % 20 === 0,
    original_language: index % 3 === 0 ? "en" : index % 3 === 1 ? "es" : "fr",
    backdrop_path: `/placeholder.svg?height=300&width=500&text=Backdrop ${index + 1}`,
    poster_path: `/placeholder.svg?height=450&width=300&text=Poster ${index + 1}`,
    collection_id: index % 5 === 0 ? 1000 + Math.floor(index / 5) : null,
    origin_country: index % 4 === 0 ? "US" : index % 4 === 1 ? "UK" : index % 4 === 2 ? "CA" : "AU",
    wikidata_id: `Q${1000000 + index}`,
    facebook_id: `movie${index + 1}`,
    instagram_id: `movie${index + 1}`,
    twitter_id: `movie${index + 1}`,
  }))

export function MovieList() {
  const [currentPage, setCurrentPage] = useState(1)
  const [moviesPerPage, setMoviesPerPage] = useState(20)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredMovies, setFilteredMovies] = useState(mockMovies)
  const navigate = useNavigate()

  useEffect(() => {
    const filtered = mockMovies.filter(
      (movie) =>
        movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.tmdb_id.toString().includes(searchQuery) ||
        movie.imdb_id.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    setFilteredMovies(filtered)
    setCurrentPage(1)
  }, [searchQuery])

  const indexOfLastMovie = currentPage * moviesPerPage
  const indexOfFirstMovie = indexOfLastMovie - moviesPerPage
  const currentMovies = filteredMovies.slice(indexOfFirstMovie, indexOfLastMovie)

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  const handleRowClick = (movieId) => {
    navigate(`/movie/${movieId}`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">Movies</h2>
      <div className="mb-4 flex items-center">
        <Input
          type="text"
          placeholder="Search by title, TMDb ID, or IMDb ID"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm mr-2"
        />
        <Search className="text-gray-400" />
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">ID</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">TMDb ID</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">IMDb ID</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Title</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Original Title
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Overview</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tagline</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Homepage</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Release Date
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Runtime (min)
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Budget</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Revenue</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Popularity
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Vote Average
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Vote Count
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Adult</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Original Language
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Backdrop Path
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Poster Path
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Collection ID
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Origin Country
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Wikidata ID
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Facebook ID
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Instagram ID
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Twitter ID
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentMovies.map((movie) => (
                  <TableRow
                    key={movie.id}
                    onClick={() => handleRowClick(movie.id)}
                    className="cursor-pointer hover:bg-gray-100"
                  >
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{movie.id}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{movie.tmdb_id}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{movie.imdb_id}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{movie.title}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.original_title}
                    </TableCell>
                    <TableCell className="px-3 py-4 text-sm text-gray-500">{movie.overview}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{movie.tagline}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{movie.status}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.homepage}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.release_date}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.runtime_minutes}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      ${movie.budget.toLocaleString()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      ${movie.revenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.popularity.toFixed(3)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.vote_average.toFixed(1)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.vote_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.is_adult ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.original_language}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.backdrop_path}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.poster_path}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.collection_id || "N/A"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.origin_country}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.wikidata_id}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.facebook_id}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.instagram_id}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.twitter_id}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-between items-center">
        <Button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        <div>
          <select
            value={moviesPerPage}
            onChange={(e) => setMoviesPerPage(Number(e.target.value))}
            className="border rounded p-2"
          >
            <option value={20}>20 per page</option>
            <option value={40}>40 per page</option>
          </select>
        </div>
        <Button
          onClick={() => paginate(currentPage + 1)}
          disabled={indexOfLastMovie >= filteredMovies.length}
          variant="outline"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

