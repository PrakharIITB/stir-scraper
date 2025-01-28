import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { ChevronLeft, ChevronRight, Search, ArrowUpDown } from "lucide-react"

export function MovieList() {
  const [movies, setMovies] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [moviesPerPage, setMoviesPerPage] = useState(20)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("id")
  const [sortOrder, setSortOrder] = useState("ASC")
  const navigate = useNavigate()

  useEffect(() => {
    fetchMovies()
  }, [currentPage, sortBy, sortOrder]) // Removed moviesPerPage dependency

  const fetchMovies = async () => {
    try {
      const response = await fetch(
        `http://104.131.101.181:5000/api/movies?page=${currentPage}&limit=${moviesPerPage}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
      )
      const data = await response.json()
      setMovies(data.movies)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error("Error fetching movies:", error)
    }
  }

  const handleSearch = async () => {
    // In a real application, you would send the search query to the backend
    // and update the movies state with the results
    console.log("Searching for:", searchQuery)
  }

  const handleSort = (column) => {
    if (column === sortBy) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC")
    } else {
      setSortBy(column)
      setSortOrder("ASC")
    }
  }

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
          placeholder="Search movies"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm mr-2"
        />
        <Button onClick={handleSearch}>
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    <button onClick={() => handleSort("id")} className="flex items-center">
                      ID <ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    <button onClick={() => handleSort("tmdb_title")} className="flex items-center">
                      Title <ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    <button onClick={() => handleSort("origin_release_date")} className="flex items-center">
                      Release Date <ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    <button onClick={() => handleSort("tmdb_vote_average")} className="flex items-center">
                      TMDb Rating <ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movies.map((movie) => (
                  <TableRow
                    key={movie.id}
                    onClick={() => handleRowClick(movie.id)}
                    className="cursor-pointer hover:bg-gray-100"
                  >
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{movie.id}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.tmdb_title}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.origin_release_date}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {movie.tmdb_vote_average}
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
        <Button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} variant="outline">
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

