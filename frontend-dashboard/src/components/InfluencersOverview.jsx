"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

export function InfluencersOverview({ timeRange }) {
  const [influencersData, setInfluencersData] = useState(null)

  useEffect(() => {
    const fetchInfluencersData = async () => {
      try {
        const response = await fetch(`http://localhost:5050/api/influencers-overview?timeRange=${timeRange}`)
        const data = await response.json()
        setInfluencersData(data)
      } catch (error) {
        console.error("Error fetching influencers overview data:", error)
      }
    }

    fetchInfluencersData()
  }, [timeRange])

  if (!influencersData) {
    return <div>Loading influencers overview...</div>
  }

  const platformData = Object.entries(influencersData.platformBifurcation).map(([name, value]) => ({ name, value }))
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Influencers Overview</CardTitle>
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
                    <TableCell>Total Unique Influencers</TableCell>
                    <TableCell className="text-right">{influencersData.totalInfluencers}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Influencers with Emails</TableCell>
                    <TableCell className="text-right">{influencersData.influencersWithEmails}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>AI Categorized Normal Influencers</TableCell>
                    <TableCell className="text-right">{influencersData.normalInfluencers}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Influencers with Complete Post Scraping</TableCell>
                    <TableCell className="text-right">{influencersData.influencersWithCompleteScraping}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {/* <Card>
            <CardHeader>
              <CardTitle>Platform Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card> */}
        
        <Card>
          <CardHeader>
            <CardTitle>Followers Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Follower Range</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(influencersData.followersBifurcation).map(([range, count]) => (
                  <TableRow key={range}>
                    <TableCell>{range}</TableCell>
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

