import React from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { InstagramIcon, TwitterIcon, YoutubeIcon, MountainIcon, TrendingUpIcon } from "lucide-react"

// Mock data (replace with actual data from your backend)
const data = {
  moviesScraped: 150,
  instagramUsers: 1400,
  influencers: {
    instagram: 500,
    twitter: 300,
    youtube: 200,
    tiktok: 400,
  },
  posts: {
    instagram: 10000,
    twitter: 5000,
    youtube: 2000,
    tiktok: 8000,
  },
}

export function DashboardCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Link to="/movies">
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movies Scraped</CardTitle>
            <MountainIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.moviesScraped}</div>
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
            <div className="text-2xl font-bold">{data.instagramUsers}</div>
            <p className="text-xs text-muted-foreground">Total Users</p>
            <div className="text-2xl font-bold mt-2">{data.influencers.instagram}</div>
            <p className="text-xs text-muted-foreground">Influencers</p>
            <div className="text-2xl font-bold mt-2">{data.posts.instagram}</div>
            <p className="text-xs text-muted-foreground">Posts</p>
          </CardContent>
        </Card>
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Twitter</CardTitle>
          <TwitterIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.influencers.twitter}</div>
          <p className="text-xs text-muted-foreground">Influencers</p>
          <div className="text-2xl font-bold mt-2">{data.posts.twitter}</div>
          <p className="text-xs text-muted-foreground">Posts</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">YouTube</CardTitle>
          <YoutubeIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.influencers.youtube}</div>
          <p className="text-xs text-muted-foreground">Influencers</p>
          <div className="text-2xl font-bold mt-2">{data.posts.youtube}</div>
          <p className="text-xs text-muted-foreground">Posts</p>
        </CardContent>
      </Card>
    </div>
  )
}

