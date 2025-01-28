import React, { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { ChevronLeft, ChevronRight, Search, ArrowUpDown } from "lucide-react"
import { useNavigate } from "react-router-dom"

export function MovieList() {
  const [movies, setMovies] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [moviesPerPage, setMoviesPerPage] = useState(20)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("id")
  const [sortOrder, setSortOrder] = useState("asc")
  const navigate = useNavigate()

  useEffect(() => {
    fetchMovies()
  }, [searchQuery]) // Only searchQuery is needed here

  const fetchMovies = async () => {
    try {
      const response = await fetch(
        `http://104.131.101.181:5000/api/movies?page=${currentPage}&limit=${moviesPerPage}&sortBy=${sortBy}&sortOrder=${sortOrder}&search=${searchQuery}`,
      )
      const data = await response.json()
      setMovies(data.movies)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error("Error fetching movies:", error)
    }
  }

  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
  }

  const handleSort = (column) => {
    if (column === sortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
    setMovies((prevMovies) =>
      [...prevMovies].sort((a, b) => {
        if (a[column] < b[column]) return sortOrder === "asc" ? -1 : 1
        if (a[column] > b[column]) return sortOrder === "asc" ? 1 : -1
        return 0
      })
    )
  }

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  const renderPaginationButtons = () => {
    const buttons = []
    const maxButtons = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2))
    const endPage = Math.min(totalPages, startPage + maxButtons - 1)

    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <Button
          key={i}
          onClick={() => paginate(i)}
          variant={currentPage === i ? "default" : "outline"}
          className="mx-1"
        >
          {i}
        </Button>,
      )
    }

    return buttons
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">Movies</h2>
      <div className="mb-4 flex items-center">
        <Input
          type="text"
          placeholder="Search movies"
          value={searchQuery}
          onChange={handleSearch}
          className="max-w-sm mr-2"
        />
        <Button onClick={() => setSearchQuery("")}>
          Clear
        </Button>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(movies[0] || {}).map((key) => (
                    <TableHead key={key} className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      <button onClick={() => handleSort(key)} className="flex items-center">
                        {key.replace(/_/g, " ").toUpperCase()} <ArrowUpDown className="ml-2 h-4 w-4" />
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {movies.map((movie) => (
                  <TableRow key={movie.id} className="hover:bg-gray-100" onClick={() => navigate(`/movie/${movie.id}`)}>
                    {Object.entries(movie).map(([key, value]) => (
                      <TableCell key={key} className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {typeof value === "boolean" ? (value ? "Yes" : "No") : value}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-between items-center">
        <div className="flex items-center">
          <Button onClick={() => paginate(1)} disabled={currentPage === 1} variant="outline" className="mr-2">
            First
          </Button>
          <Button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
        </div>
        <div className="flex items-center">{renderPaginationButtons()}</div>
        <div className="flex items-center">
          <Button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            variant="outline"
            className="mr-2"
          >
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
          <Button onClick={() => paginate(totalPages)} disabled={currentPage === totalPages} variant="outline">
            Last
          </Button>
        </div>
      </div>
      <div className="mt-4 flex justify-between items-center">
        <div>
          <span className="mr-2">
            Page {currentPage} of {totalPages}
          </span>
          <select
            value={moviesPerPage}
            onChange={(e) => setMoviesPerPage(Number(e.target.value))}
            className="border rounded p-2"
          >
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
        <div className="flex items-center">
          <span className="mr-2">Go to page:</span>
          <Input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const page = Number.parseInt(e.target.value)
              if (page >= 1 && page <= totalPages) {
                paginate(page)
              }
            }}
            className="w-16 mr-2"
          />
          <Button onClick={() => paginate(Number.parseInt(currentPage))} variant="outline">
            Go
          </Button>
        </div>
      </div>
    </div>
  )
}

