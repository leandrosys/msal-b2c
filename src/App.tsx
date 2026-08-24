import { useState } from "react";
import NavBar from "./components/NavBar";
import HomePage from "./pages/HomePage";
import ImplicitFlowPage from "./pages/ImplicitFlowPage";

type Page = "home" | "vulnerable";

function detectInitialPage(): Page {
  // Si B2C redirigió de vuelta con el state del flujo implícito, abrir esa página
  return window.location.hash.includes("state=implicit-demo-vulnerable")
    ? "vulnerable"
    : "home";
}

export default function App() {
  const [page, setPage] = useState<Page>(detectInitialPage);

  return (
    <div className="app-wrapper">
      <NavBar activePage={page} onNavigate={setPage} />
      <main className="main-content">
        {page === "home" ? <HomePage /> : <ImplicitFlowPage />}
      </main>
    </div>
  );
}
