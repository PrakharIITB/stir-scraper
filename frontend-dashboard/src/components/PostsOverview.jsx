"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Table, TableBody, TableCell, TableRow } from "./ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

export function PostsOverview({ timeRange }) {
  const [postsData, setPostsData] = useState(null)

  useEffect(() => {
    const fetchPostsData = async () => {
      try {
        const response = await fetch(`http://localhost:5050/api/posts-overview?timeRange=${timeRange}`)
        const data = await response.json()
        setPostsData(data)
      } catch (error) {
        console.error("Error fetching posts overview data:", error)
      }
    }

    fetchPostsData()
  }, [timeRange])

  if (!postsData) {
    return <div>Loading posts overview...</div>
  }

  const platformData = Object.entries(postsData.platformBifurcation).map(([name, value]) => ({ name, value }))
  const hashtagData = Object.entries(postsData.instagramPostsWithHashtags).map(([name, value]) => ({ name, value }))

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Posts Overview</CardTitle>
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
                    <TableCell>Total Unique Posts</TableCell>
                    <TableCell className="text-right">{postsData.totalPosts}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Instagram Posts</TableCell>
                    <TableCell className="text-right">{postsData.instagramPosts}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Posts with Hashtags</TableCell>
                    <TableCell className="text-right">{postsData.postsWithHashtags}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Posts Linked to Movies</TableCell>
                    <TableCell className="text-right">{postsData.postsLinkedToMovies}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Platform Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Instagram Posts with Hashtags</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hashtagData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}

