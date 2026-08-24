import NavBar from "./components/NavBar";
import HomePage from "./pages/HomePage";

export default function App() {
  return (
    <div className="app-wrapper">
      <NavBar />
      <main className="main-content">
        <HomePage />
      </main>
    </div>
  );
}
