import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { ChevronLeft, ChevronRight, Search, ArrowUpDown } from "lucide-react"

export function InstagramUserList() {
  const [users, setUsers] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [usersPerPage, setUsersPerPage] = useState(20)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("user_id")
  const [sortOrder, setSortOrder] = useState("ASC")
  const navigate = useNavigate()

  useEffect(() => {
    fetchUsers()
  }, [currentPage, usersPerPage, sortBy, sortOrder]) //This line was already correct

  const fetchUsers = async () => {
    try {
      const response = await fetch(
        `http://104.131.101.181:5000/api/instagram-users?page=${currentPage}&limit=${usersPerPage}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
      )
      const data = await response.json()
      setUsers(data.instagramUsers)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error("Error fetching Instagram users:", error)
    }
  }

  const handleSearch = async () => {
    // In a real application, you would send the search query to the backend
    // and update the users state with the results
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

  const handleRowClick = (userId) => {
    navigate(`/instagram-user/${userId}`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">Instagram Users</h2>
      <div className="mb-4 flex items-center">
        <Input
          type="text"
          placeholder="Search users"
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
                    <button onClick={() => handleSort("user_id")} className="flex items-center">
                      User ID <ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    <button onClick={() => handleSort("username")} className="flex items-center">
                      Username <ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    <button onClick={() => handleSort("followers_count")} className="flex items-center">
                      Followers <ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    <button onClick={() => handleSort("is_verified")} className="flex items-center">
                      Verified <ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.user_id}
                    onClick={() => handleRowClick(user.user_id)}
                    className="cursor-pointer hover:bg-gray-100"
                  >
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.user_id}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.username}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.followers_count}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.is_verified ? "Yes" : "No"}
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
            value={usersPerPage}
            onChange={(e) => setUsersPerPage(Number(e.target.value))}
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

