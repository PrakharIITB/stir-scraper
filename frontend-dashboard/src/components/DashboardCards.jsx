"use client"

import { useState } from "react"
import { MoviesOverview } from "./MoviesOverview"
import { InfluencersOverview } from "./InfluencersOverview"
import { PostsOverview } from "./PostsOverview"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

export function DashboardCards() {
  const [timeRange, setTimeRange] = useState("total")

  const handleTimeRangeChange = (value) => {
    setTimeRange(value)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Dashboard Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select onValueChange={handleTimeRangeChange} defaultValue={timeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Total</SelectItem>
                <SelectItem value="lastDay">Last Day</SelectItem>
                <SelectItem value="lastWeek">Last Week</SelectItem>
                <SelectItem value="last30Days">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-6">
            <MoviesOverview timeRange={timeRange} />
            <InfluencersOverview timeRange={timeRange} />
            <PostsOverview timeRange={timeRange} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

