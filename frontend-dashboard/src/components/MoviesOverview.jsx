"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export function MoviesOverview({ timeRange }) {
  const [moviesData, setMoviesData] = useState(null)

  useEffect(() => {
    const fetchMoviesData = async () => {
      try {
        const response = await fetch(`http://localhost:5050/api/movies-overview?timeRange=${timeRange}`)
        const data = await response.json()
        setMoviesData(data)
      } catch (error) {
        console.error("Error fetching movies overview data:", error)
      }
    }

    fetchMoviesData()
  }, [timeRange])

  if (!moviesData) {
    return <div>Loading movies overview...</div>
  }

  const chartData = Object.entries(moviesData.yearBifurcation)
    .map(([year, count]) => ({
      year,
      count,
    }))
    .sort((a, b) => a.year - b.year)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Movies Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>Total Movies</TableCell>
                    <TableCell className="text-right">{moviesData.totalMovies}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Movies with External Links</TableCell>
                    <TableCell className="text-right">{moviesData.moviesWithExternalLinks}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Movies with Hashtags</TableCell>
                    <TableCell className="text-right">{moviesData.moviesWithHashtags}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Movies Scraped on Social Media</TableCell>
                    <TableCell className="text-right">{moviesData.moviesScrapedOnSocialMedia}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Movies by Year</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Countries</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(moviesData.countryBifurcation).map(([country, count]) => (
                    <TableRow key={country}>
                      <TableCell>{country}</TableCell>
                      <TableCell className="text-right">{count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Languages</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Language</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(moviesData.languageBifurcation).map(([language, count]) => (
                    <TableRow key={language}>
                      <TableCell>{language}</TableCell>
                      <TableCell className="text-right">{count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}

