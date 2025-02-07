import React, { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

export function InstagramUserDetails() {
  const { id } = useParams()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`http://localhost:5050/api/instagram-users/${id}`)
        const data = await response.json()
        setUser(data)
      } catch (error) {
        console.error("Error fetching Instagram user details:", error)
      }
    }

    fetchUser()
  }, [id])

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>
            {user.name} (@{user.username})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Basic Information</h3>
              <p>
                <strong>User ID:</strong> {user.user_id}
              </p>
              <p>
                <strong>Instagram User ID:</strong> {user.insta_user_id}
              </p>
              <p>
                <strong>Private Account:</strong> {user.is_private ? "Yes" : "No"}
              </p>
              <p>
                <strong>Verified:</strong> {user.is_verified ? "Yes" : "No"}
              </p>
              <p>
                <strong>Biography:</strong> {user.biography}
              </p>
              <p>
                <strong>External URL:</strong>{" "}
                <a href={user.external_url} target="_blank" rel="noopener noreferrer">
                  {user.external_url}
                </a>
              </p>
              <p>
                <strong>Country:</strong> {user.country}
              </p>
              <p>
                <strong>Category:</strong> {user.category}
              </p>
              <p>
                <strong>AI Category:</strong> {user.ai_category}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Statistics</h3>
              <p>
                <strong>Followers:</strong> {user.followers_count.toLocaleString()}
              </p>
              <p>
                <strong>Following:</strong> {user.followings_count.toLocaleString()}
              </p>
              <p>
                <strong>Posts:</strong> {user.posts_count.toLocaleString()}
              </p>
              <p>
                <strong>Former Username Count:</strong> {user.former_username_count}
              </p>
              <p>
                <strong>Latest Reel:</strong> {new Date(user.latest_reel_media).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Business Information</h3>
            <p>
              <strong>Business Account:</strong> {user.is_business ? "Yes" : "No"}
            </p>
            {user.is_business && (
              <>
                <p>
                  <strong>Business Email:</strong> {user.business_email}
                </p>
                <p>
                  <strong>Business Phone:</strong> {user.business_countrycode} {user.business_number}
                </p>
              </>
            )}
            <p>
              <strong>Biography Email:</strong> {user.biography_email}
            </p>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Profile Picture</h3>
            <p>
              <strong>Anonymous Profile Picture:</strong> {user.has_anonymous_profile_picture ? "Yes" : "No"}
            </p>
            <img
              src={user.profile_photo_hd || "/placeholder.svg"}
              alt={`${user.username}'s profile`}
              className="mt-2 rounded-full w-32 h-32"
            />
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Dates</h3>
            <p>
              <strong>Date Joined:</strong> {new Date(user.date_joined).toLocaleDateString()}
            </p>
            <p>
              <strong>Date Verified:</strong>{" "}
              {user.date_verified ? new Date(user.date_verified).toLocaleDateString() : "N/A"}
            </p>
            <p>
              <strong>Last Update:</strong> {new Date(user.last_update).toLocaleString()}
            </p>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Additional Information</h3>
            <h4 className="text-md font-semibold mt-2">Emails</h4>
            <ul>
              {user.emails.map((email, index) => (
                <li key={index}>
                  {email.email} (Source: {email.source})
                </li>
              ))}
            </ul>
            <h4 className="text-md font-semibold mt-2">Links</h4>
            <ul>
              {user.links.map((link, index) => (
                <li key={index}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.url}
                  </a>
                  (Source: {link.source}, Platform: {link.platform})
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

