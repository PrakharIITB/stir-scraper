import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { InstagramIcon, MountainIcon } from "lucide-react"

export function DashboardCards() {
  const [moviesCount, setMoviesCount] = useState(0)
  const [instagramUsersCount, setInstagramUsersCount] = useState(0)
  const [instagramInfluencersCount, setInstagramInfluencersCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [moviesResponse, instagramUsersResponse] = await Promise.all([
          fetch("http://104.131.101.181:5000/api/movies?limit=1"),
          fetch("http://104.131.101.181:5000/api/instagram-users?limit=1"),
        ])

        const moviesData = await moviesResponse.json()
        const instagramUsersData = await instagramUsersResponse.json()

        setMoviesCount(moviesData.totalCount)
        setInstagramUsersCount(instagramUsersData.totalCount)
        console.log(instagramUsersData);
        
        // Assuming influencers have more than 10,000 followers
        const influencersCount = instagramUsersData.instagramUsers.filter((user) => user.followers_count > 10000).length
        setInstagramInfluencersCount(influencersCount)

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
            <p className="text-xs text-muted-foreground">Total Users</p>
            {/* <div className="text-2xl font-bold mt-2">{instagramInfluencersCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Influencers (10k followers)</p> */}
          </CardContent>
        </Card>
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Data Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This dashboard provides an overview of our scraped data, including movies and Instagram users. Click on each
            card to view more detailed information.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

