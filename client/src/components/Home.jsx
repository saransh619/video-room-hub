import React from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Home.css";

const Home = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="home">
      {/* Header */}
      <header className="home-header">
        <h1>Welcome to Video Room Hub</h1>
        <p>Create and join rooms for seamless collaboration</p>
      </header>

      {/* Navigation Section */}
      <section className="home-navigation">
        {token ? (
          <>
            <p className="welcome-message">
              Hello, {user?.username || "User"}!
            </p>
            <div className="nav-buttons">
              <button
                onClick={() => navigate("/create-room")}
                className="nav-button"
              >
                Create Room
              </button>
              <button
                onClick={() => navigate("/join-room")}
                className="nav-button"
              >
                Join Room
              </button>
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
            </div>
          </>
        ) : (
          <div className="nav-links">
            <Link to="/login" className="nav-link">
              Login
            </Link>
            <Link to="/signup" className="nav-link">
              Sign Up
            </Link>
          </div>
        )}
      </section>

      {/* Main Content */}
      <section className="home-content">
        <h2>About Video Room Hub</h2>
        <p>
          Video Room Hub is a platform that allows you to create and join
          virtual rooms for collaboration, meetings, or events. Set the maximum
          number of users and price per user, and share the room link with your
          friends or colleagues.
        </p>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p>Video Room Hub v1.0 | Created by Saransh Pachhai</p>
      </footer>
    </div>
  );
};

export default Home;
