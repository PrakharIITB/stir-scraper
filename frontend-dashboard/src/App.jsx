import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardCards } from "./components/DashboardCards";
import { MovieDetails } from "./components/MovieDetails"
import { InstagramUserDetails } from "./components/InstagramUserDetails"
import { MovieList } from "./components/MovieList";
import { InstagramUserList } from "./components/InstagramUserList";
import { InstagramPostList } from "./components/InstagramPostList"

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <DashboardHeader />
        <main className="flex-1 p-6 bg-gray-100">
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <h1 className="text-3xl font-bold mb-6">Social Media Scraping Dashboard</h1>
                  <DashboardCards />
                </>
              }
            />
            <Route path="/movies" element={<MovieList />} />
            <Route path="/instagram-users" element={<InstagramUserList />} />
            <Route path="/instagram-user/:id" element={<InstagramUserDetails />} />
            <Route path="/instagram-posts" element={<InstagramPostList />} />
            <Route path="/movie/:id" element={<MovieDetails />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;