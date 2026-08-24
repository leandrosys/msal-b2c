import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "../auth/authConfig";

export default function NavBar() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const handleLoginRedirect = () => {
    // loginRedirect inicia el flujo Authorization Code + PKCE:
    // 1. MSAL genera code_verifier (aleatorio, 43-128 chars)
    // 2. Calcula code_challenge = BASE64URL(SHA-256(code_verifier))
    // 3. Redirige al endpoint /authorize de B2C con code_challenge
    // 4. B2C autentica al usuario y redirige con el código de autorización
    // 5. MSAL intercambia código + code_verifier por tokens
    instance.loginRedirect(loginRequest).catch(console.error);
  };

  const handleLoginPopup = () => {
    // loginPopup abre una ventana emergente. Mismo flujo PKCE pero sin
    // abandonar la página principal. Útil para no perder el estado de la app.
    instance.loginPopup(loginRequest).catch(console.error);
  };

  const handleLogout = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: "https://localhost:3000",
    });
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z" fill="#0078d4" />
          <path d="M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z" fill="white" />
        </svg>
        <span>MSAL B2C — Demo Auth</span>
      </div>

      <div className="navbar-actions">
        {isAuthenticated ? (
          <>
            <span className="user-badge">
              <span className="status-dot active" />
              {accounts[0]?.username || accounts[0]?.name || "Usuario autenticado"}
            </span>
            <button className="btn btn-outline" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-outline" onClick={handleLoginPopup}>
              Login (Popup)
            </button>
            <button className="btn btn-primary" onClick={handleLoginRedirect}>
              Login (Redirect)
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
