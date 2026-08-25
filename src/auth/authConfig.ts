import { LogLevel, BrowserCacheLocation } from "@azure/msal-browser";
import type {
  Configuration,
  RedirectRequest,
  SilentRequest,
  PopupRequest,
} from "@azure/msal-browser";

// ─────────────────────────────────────────────────────────────────────────────
// Datos del tenant Azure AD B2C — leídos desde .env.local (ver .env.example)
// ─────────────────────────────────────────────────────────────────────────────
const CLIENT_ID = import.meta.env.VITE_B2C_CLIENT_ID as string;
const TENANT_DOMAIN = import.meta.env.VITE_B2C_TENANT_DOMAIN as string;
const TENANT_ONMICROSOFT = import.meta.env.VITE_B2C_TENANT_ONMICROSOFT as string;
const POLICY = import.meta.env.VITE_B2C_POLICY as string;
const REDIRECT_URI = import.meta.env.VITE_B2C_REDIRECT_URI as string;

// Formato con dominio personalizado: https://{custom-domain}/{tenant.onmicrosoft.com}/{policy}
export const B2C_AUTHORITY = `https://${TENANT_DOMAIN}/${TENANT_ONMICROSOFT}/${POLICY}`;

// Scopes definidos en el registro de aplicación de B2C
export const API_SCOPE = `https://${TENANT_DOMAIN}/leandro-portal/Afiliados`;
export const API_SCOPE_IMPERSONATION = `https://${TENANT_DOMAIN}/leandro-portal/user_impersonation`;
export const API_SCOPE_ACCOUNTS_READ = `https://${TENANT_DOMAIN}/leandro-portal/Accounts.Read`;

// ─────────────────────────────────────────────────────────────────────────────
// Configuración principal de MSAL
// ─────────────────────────────────────────────────────────────────────────────
export const msalConfig: Configuration = {
  auth: {
    clientId: CLIENT_ID,
    authority: B2C_AUTHORITY,
    // knownAuthorities lista los hosts de autoridades B2C válidas.
    // Es obligatorio cuando se usa un dominio personalizado o una política IEF.
    knownAuthorities: [TENANT_DOMAIN],
    redirectUri: REDIRECT_URI,
    postLogoutRedirectUri: REDIRECT_URI,
    // navigateToLoginRequestUrl: true restaura la URL original después del redirect
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.SessionStorage,
    // storeAuthStateInCookie = true es necesario en IE11 / Edge Legacy para
    // evitar el bloqueo de cookies de terceros que rompe el flujo redirect.
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      // VERBOSE expone cada paso del flujo PKCE en la consola del navegador.
      // Cambia a LogLevel.Warning en producción.
      logLevel: LogLevel.Verbose,
      loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
        // Nunca loguear información PII
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error("[MSAL]", message);
            break;
          case LogLevel.Warning:
            console.warn("[MSAL]", message);
            break;
          case LogLevel.Info:
            console.info("[MSAL]", message);
            break;
          case LogLevel.Verbose:
            console.debug("[MSAL]", message);
            break;
        }
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Petición de login / token interactivo
// ─────────────────────────────────────────────────────────────────────────────

// Scopes solicitados durante el login inicial.
// openid   → identity token (id_token)
// profile  → claims básicos: name, email, sub
// offline_access → habilita el refresh_token para renovación silenciosa
// API_SCOPE → access_token para la API protegida
export const loginRequest: RedirectRequest & PopupRequest = {
  scopes: ["openid", "profile", "offline_access", API_SCOPE, API_SCOPE_IMPERSONATION],
};

// Petición de adquisición silenciosa de token (sin interacción del usuario).
// Se usa después del login cuando el access_token expira.
export const tokenRequest: SilentRequest = {
  scopes: [API_SCOPE, API_SCOPE_IMPERSONATION, "offline_access"],
  // forceRefresh: false → MSAL devuelve el token cacheado si aún es válido.
  // MSAL aplica un skew de 5 min antes de la expiración para renovar proactivamente.
  forceRefresh: false,
};
