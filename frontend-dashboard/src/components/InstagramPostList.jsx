import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Checkbox } from "./ui/checkbox"
import { ChevronLeft, ChevronRight, Search, ArrowUpDown, Download } from "lucide-react"
import { InstagramPostMedia } from "./InstagramPostMedia"

export function InstagramPostList() {
  const [posts, setPosts] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [postsPerPage, setPostsPerPage] = useState(20)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("post_id")
  const [sortOrder, setSortOrder] = useState("asc")
  const [columns, setColumns] = useState([])
  const [selectedColumns, setSelectedColumns] = useState([])

  useEffect(() => {
    fetchPosts()
  }, [currentPage, postsPerPage, sortBy, sortOrder, searchQuery])

  const fetchPosts = async () => {
    try {
      const response = await fetch(
        `http://104.131.101.181:5000/api/instagram-posts?page=${currentPage}&limit=${postsPerPage}&sortBy=${sortBy}&sortOrder=${sortOrder}&search=${searchQuery}`,
      )
      const data = await response.json()
      setPosts(data.instagramPosts)
      setTotalPages(data.totalPages)
      if (data.instagramPosts.length > 0 && columns.length === 0) {
        const postColumns = Object.keys(data.instagramPosts[0])
        setColumns(postColumns)
        setSelectedColumns(postColumns)
      }
    } catch (error) {
      console.error("Error fetching Instagram posts:", error)
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

  const handleColumnToggle = (column) => {
    setSelectedColumns((prev) => (prev.includes(column) ? prev.filter((col) => col !== column) : [...prev, column]))
  }

  const downloadCSV = () => {
    const headers = selectedColumns.join(",")
    const csv = [
      headers,
      ...posts.map((post) => selectedColumns.map((column) => JSON.stringify(post[column])).join(",")),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", "instagram_posts.csv")
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const renderCellContent = (post, column) => {
    const value = post[column]
    if (typeof value === "boolean") {
      return value ? "Yes" : "No"
    } else if (Array.isArray(value)) {
      if (column === "media") {
        return <InstagramPostMedia media={value} />
      } else if (column === "hashtags") {
        return value.join(", ")
      } else if (column === "mentions") {
        return value.map((m) => m.username).join(", ")
      }
    } else if (typeof value === "object" && value !== null) {
      return JSON.stringify(value)
    }
    return value
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">Instagram Posts</h2>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <Input
            type="text"
            placeholder="Search posts"
            value={searchQuery}
            onChange={handleSearch}
            className="max-w-sm mr-2"
          />
          <Button onClick={() => setSearchQuery("")}>
            <Search className="mr-2 h-4 w-4" /> Clear
          </Button>
        </div>
        <Button onClick={downloadCSV}>
          <Download className="mr-2 h-4 w-4" /> Download CSV
        </Button>
      </div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Select Columns:</h3>
        <div className="flex flex-wrap gap-2">
          {columns.map((column) => (
            <label key={column} className="flex items-center space-x-2">
              <Checkbox checked={selectedColumns.includes(column)} onCheckedChange={() => handleColumnToggle(column)} />
              <span>{column}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  {selectedColumns.map((column) => (
                    <TableHead key={column} className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      <button onClick={() => handleSort(column)} className="flex items-center">
                        {column.replace(/_/g, " ").toUpperCase()} <ArrowUpDown className="ml-2 h-4 w-4" />
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.post_id} className="hover:bg-gray-100">
                    {selectedColumns.map((column) => (
                      <TableCell key={column} className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {renderCellContent(post, column)}
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
            value={postsPerPage}
            onChange={(e) => setPostsPerPage(Number(e.target.value))}
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

