import { useState } from "react";
import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
  useMsal,
} from "@azure/msal-react";
import { loginRequest, API_SCOPE_ACCOUNTS_READ } from "../auth/authConfig";
import PkceFlowDiagram from "../components/PkceFlowDiagram";
import MsalConfigViewer from "../components/MsalConfigViewer";
import UserProfile from "../components/UserProfile";
import TokenViewer from "../components/TokenViewer";

function LandingSection() {
  const { instance } = useMsal();
  const [includeAccountsRead, setIncludeAccountsRead] = useState(false);

  const buildRequest = () => ({
    ...loginRequest,
    scopes: includeAccountsRead
      ? [...loginRequest.scopes, API_SCOPE_ACCOUNTS_READ]
      : loginRequest.scopes,
  });

  return (
    <div>
      <section className="card hero-card">
        <div className="hero-content">
          <h1>Bienvenido a la demo de MSAL + Azure AD B2C</h1>
          <p>
            Esta SPA demuestra el flujo{" "}
            <strong>Authorization Code + PKCE</strong> usando la librería{" "}
            <code>@azure/msal-browser</code> contra el tenant B2C de{" "}
            <strong>afiliados-qa.proteccion.com</strong>.
          </p>
          <p>
            Inicia sesión para ver los tokens, claims y cómo funciona la
            renovación silenciosa.
          </p>

          <label className="scope-toggle">
            <input
              type="checkbox"
              checked={includeAccountsRead}
              onChange={(e) => setIncludeAccountsRead(e.target.checked)}
            />
            <span>Incluir scope <code>Accounts.Read</code></span>
          </label>
          {includeAccountsRead && (
            <p className="scope-toggle-detail">{API_SCOPE_ACCOUNTS_READ}</p>
          )}

          <div className="hero-buttons">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => instance.loginRedirect(buildRequest())}
            >
              Iniciar sesión (Redirect)
            </button>
            <button
              className="btn btn-outline btn-lg"
              onClick={() => instance.loginPopup(buildRequest())}
            >
              Iniciar sesión (Popup)
            </button>
          </div>
          <p className="hint">
            <strong>Redirect</strong>: abandona la página, autentica en B2C y
            regresa. <strong>Popup</strong>: abre una ventana emergente sin
            salir de la app. Ambos usan PKCE internamente.
          </p>
        </div>
      </section>

      <MsalConfigViewer />
      <PkceFlowDiagram />
    </div>
  );
}

function AuthenticatedDashboard() {
  return (
    <div>
      <section className="card hero-card success">
        <h1>Autenticación exitosa</h1>
        <p>
          El flujo Authorization Code + PKCE completó correctamente. A
          continuación puedes ver los datos de tu sesión y adquirir tokens.
        </p>
      </section>

      <UserProfile />
      <TokenViewer />
      <MsalConfigViewer />
      <PkceFlowDiagram />
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <UnauthenticatedTemplate>
        <LandingSection />
      </UnauthenticatedTemplate>

      <AuthenticatedTemplate>
        <AuthenticatedDashboard />
      </AuthenticatedTemplate>
    </>
  );
}
