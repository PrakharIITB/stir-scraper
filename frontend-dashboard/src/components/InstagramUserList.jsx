import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

// Mock data for Instagram users
const mockInstagramUsers = Array(100)
  .fill()
  .map((_, index) => ({
    insta_user_id: `user${index + 1}`,
    username: `user${index + 1}`,
    is_private: index % 2 === 0,
    is_verified: index % 5 === 0,
    name: `User ${index + 1}`,
    biography: `This is the biography for User ${index + 1}. It contains a brief description about the user.`,
    profile_photo_hd: `/placeholder.svg?height=150&width=150&text=User ${index + 1}`,
    external_url: `https://example.com/user${index + 1}`,
    followers_count: 1000 + index * 100,
    followings_count: 500 + index * 50,
    posts_count: 100 + index * 10,
    is_business: index % 3 === 0,
    business_email: index % 3 === 0 ? `business${index + 1}@example.com` : null,
    biography_email: `user${index + 1}@example.com`,
    business_countrycode: index % 3 === 0 ? "+1" : null,
    business_number: index % 3 === 0 ? `555-0${index + 100}` : null,
    country: ["USA", "UK", "Canada", "Australia"][index % 4],
    category: ["Influencer", "Artist", "Entrepreneur", "Athlete"][index % 4],
    ai_category: ["Tech", "Fashion", "Sports", "Lifestyle"][index % 4],
    has_anonymous_profile_picture: index % 10 === 0,
    date_joined: new Date(2020, 0, 1 + index).toISOString(),
    date_verified: index % 5 === 0 ? new Date(2021, 0, 1 + index).toISOString() : null,
    former_username_count: index % 3,
    latest_reel_media: Date.now() - index * 86400000,
    last_update: new Date().toISOString(),
  }))

export function InstagramUserList() {
  const [currentPage, setCurrentPage] = useState(1)
  const [usersPerPage, setUsersPerPage] = useState(20)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredUsers, setFilteredUsers] = useState(mockInstagramUsers)
  const navigate = useNavigate()

  useEffect(() => {
    const filtered = mockInstagramUsers.filter(
      (user) =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.insta_user_id.includes(searchQuery),
    )
    setFilteredUsers(filtered)
    setCurrentPage(1)
  }, [searchQuery])

  const indexOfLastUser = currentPage * usersPerPage
  const indexOfFirstUser = indexOfLastUser - usersPerPage
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser)

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  const handleRowClick = (userId) => {
    // navigate(`/instagram-user/${userId}`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">Instagram Users</h2>
      <div className="mb-4 flex items-center">
        <Input
          type="text"
          placeholder="Search by username, name, or ID"
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
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">User ID</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Username</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Name</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Private</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Verified</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Biography</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    External URL
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Followers</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Following</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Posts</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Business</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Business Email
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Biography Email
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Business Phone
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Country</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Category</TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    AI Category
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Anonymous Picture
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Date Joined
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Date Verified
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Former Usernames
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Latest Reel
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Last Update
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentUsers.map((user) => (
                  <TableRow
                    key={user.insta_user_id}
                    onClick={() => handleRowClick(user.insta_user_id)}
                    className="cursor-pointer hover:bg-gray-100"
                  >
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.insta_user_id}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.username}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.name}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.is_private ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.is_verified ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className="px-3 py-4 text-sm text-gray-500">{user.biography}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.external_url}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.followers_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.followings_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.posts_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.is_business ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.business_email || "N/A"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.biography_email}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.business_countrycode && user.business_number
                        ? `${user.business_countrycode} ${user.business_number}`
                        : "N/A"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.country}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.category}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.ai_category}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.has_anonymous_profile_picture ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(user.date_joined).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.date_verified ? new Date(user.date_verified).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.former_username_count}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(user.latest_reel_media).toLocaleString()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(user.last_update).toLocaleString()}
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
        <Button
          onClick={() => paginate(currentPage + 1)}
          disabled={indexOfLastUser >= filteredUsers.length}
          variant="outline"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

