import { useState } from "react";
import NavBar from "./components/NavBar";
import HomePage from "./pages/HomePage";
import ImplicitFlowPage from "./pages/ImplicitFlowPage";
import CodeInterceptionPage from "./pages/CodeInterceptionPage";

type Page = "home" | "implicit" | "code-interception";

function detectInitialPage(): Page {
  if (window.location.hash.includes("state=implicit-demo-vulnerable")) return "implicit";
  if (window.location.search.includes("state=code-intercept-demo-vulnerable")) return "code-interception";
  return "home";
}

export default function App() {
  const [page, setPage] = useState<Page>(detectInitialPage);

  return (
    <div className="app-wrapper">
      <NavBar activePage={page} onNavigate={setPage} />
      <main className="main-content">
        {page === "home" && <HomePage />}
        {page === "implicit" && <ImplicitFlowPage />}
        {page === "code-interception" && <CodeInterceptionPage />}
      </main>
    </div>
  );
}
