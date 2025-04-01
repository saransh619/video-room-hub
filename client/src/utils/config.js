// const isLocalhost = window.location.hostname === "localhost";
// const BASE_URL =
//   import.meta.env.VITE_API_BASE_URL ||
//   (isLocalhost
//     ? "http://localhost:5000"
//     : `http://${window.location.hostname}:5000`);

// export default BASE_URL;

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!BASE_URL) {
  console.error("VITE_API_BASE_URL is not defined in .env file");
  throw new Error("VITE_API_BASE_URL is required");
}

export default BASE_URL;
