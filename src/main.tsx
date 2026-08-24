import React from "react";
import ReactDOM from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import type { EventMessage, AuthenticationResult } from "@azure/msal-browser";
import { msalConfig } from "./auth/authConfig";
import App from "./App";
import "./index.css";

// ─────────────────────────────────────────────────────────────────────────────
// Instancia principal de MSAL
// PublicClientApplication es el cliente PKCE para aplicaciones que NO pueden
// guardar un secreto (SPAs, apps móviles). Contrasta con ConfidentialClientApplication
// que se usa en backends donde el client_secret está protegido.
// ─────────────────────────────────────────────────────────────────────────────
const msalInstance = new PublicClientApplication(msalConfig);

// initialize() es asíncrono en MSAL Browser v3. Debe completarse ANTES de
// renderizar la app para que handleRedirectPromise() procese el código de
// autorización que viene en la URL después del redirect de B2C.
msalInstance.initialize().then(() => {
  // Si ya hay cuentas en caché (sesión previa), establecemos la cuenta activa.
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }

  // Escuchamos LOGIN_SUCCESS para establecer la cuenta activa inmediatamente
  // después de un login exitoso (tanto redirect como popup).
  msalInstance.addEventCallback((event: EventMessage) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload !== null) {
      const result = event.payload as AuthenticationResult;
      msalInstance.setActiveAccount(result.account);
    }
  });

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      {/* MsalProvider inyecta la instancia MSAL vía Context.
          Todos los hooks (useMsal, useIsAuthenticated, useAccount) y los
          componentes template dependen de este provider. */}
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>
  );
});
