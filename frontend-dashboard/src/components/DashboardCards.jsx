import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { InstagramIcon, MountainIcon, FileTextIcon } from "lucide-react"

export function DashboardCards() {
  const [moviesCount, setMoviesCount] = useState(0)
  const [instagramUsersCount, setInstagramUsersCount] = useState(0)
  const [instagramPostsCount, setInstagramPostsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [moviesResponse, instagramUsersResponse, instagramPostsResponse] = await Promise.all([
          fetch("http://localhost:5050/api/movies?limit=1"),
          fetch("http://localhost:5050/api/instagram-users?limit=1"),
          fetch("http://localhost:5050/api/instagram-posts?limit=1"),
        ])

        const moviesData = await moviesResponse.json()
        const instagramUsersData = await instagramUsersResponse.json()
        const instagramPostsData = await instagramPostsResponse.json()

        setMoviesCount(moviesData.totalCount)
        setInstagramUsersCount(instagramUsersData.totalCount)
        setInstagramPostsCount(instagramPostsData.totalCount)

        setLoading(false)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <div>Loading dashboard data...</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Link to="/movies">
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movies Scraped</CardTitle>
            <MountainIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{moviesCount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </Link>

      <Link to="/instagram-users">
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instagram Users</CardTitle>
            <InstagramIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{instagramUsersCount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </Link>

      <Link to="/instagram-posts">
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instagram Posts</CardTitle>
            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{instagramPostsCount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}

