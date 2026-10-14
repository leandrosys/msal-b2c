# MSAL + Azure AD B2C — Demo educativa

SPA en React que explica cómo funciona la autenticación con **MSAL** (`@azure/msal-browser` v3 y `@azure/msal-react` v2) contra el tenant **Azure AD B2C de afiliados de Protección** (ambiente QA), usando el flujo **Authorization Code + PKCE**.

La demo usa **un registro de aplicación propio en B2C (`leandro-portal`)**, distinto al de la aplicación de Afiliados. Así se puede experimentar con la política custom, los scopes y los flujos sin tocar la configuración de la aplicación productiva. Se apoya en la misma infraestructura del tenant: el dominio personalizado y la política IEF.

Además del flujo seguro, el proyecto trae **ejemplos guiados de vulnerabilidades de OAuth 2.0**. En cada uno se reproduce el ataque contra el tenant real y se muestra cómo Authorization Code + PKCE lo mitiga.

> ⚠️ Las páginas marcadas como "MODO VULNERABLE" existen solo con fines educativos. No reutilices ese código en aplicaciones reales.

## Qué muestra la demo

### 1. Inicio — Authorization Code + PKCE con MSAL

Página principal (`src/pages/HomePage.tsx`):

- Login con `loginRedirect` y con `loginPopup`. Ambos usan PKCE internamente: MSAL genera el `code_verifier`, calcula `code_challenge = BASE64URL(SHA-256(code_verifier))` e intercambia el código por tokens.
- Opción para solicitar el scope adicional `Accounts.Read` y ver cómo cambia el consentimiento y el `access_token`.
- Perfil del usuario a partir de los claims del `id_token` (`UserProfile`).
- Adquisición de tokens con `acquireTokenSilent`, que pasa a `acquireTokenPopup` cuando ocurre un `InteractionRequiredAuthError` (`TokenViewer`).
- Visor de la configuración MSAL activa (`MsalConfigViewer`) y diagrama del flujo PKCE (`PkceFlowDiagram`).

### 2. Flujo implícito — token expuesto en la URL

Página `src/pages/ImplicitFlowPage.tsx`. Lanza una autenticación con `response_type=id_token` y `response_mode=fragment`. B2C devuelve el token directamente en el hash de la URL, y la página lo detecta y lo decodifica para mostrar lo fácil que resulta extraerlo (historial del navegador, cabecera Referer, scripts de terceros, logs de proxy, capturas de pantalla).

**Cómo lo resuelve PKCE:** B2C ya no devuelve un token, sino un código de un solo uso y de vida corta. Sin el `code_verifier`, que nunca sale del navegador, ese código no sirve para nada. Por esta razón el OAuth 2.0 Security BCP deprecó el flujo implícito.

### 3. Authorization Code sin PKCE — interceptación del código

Página `src/pages/CodeInterceptionPage.tsx`. Lanza `response_type=code` **sin** `code_challenge` y con `response_mode=query`. Luego simula a un atacante que intenta canjear el código en `/token` sin `code_verifier`.

Resultado esperado en este tenant: B2C rechaza la solicitud desde `/authorize` con el error **AADB2C99059**, porque tiene activo el requisito de PKCE para todos los clientes. La página explica por qué este control en el servidor es clave. En servidores OAuth sin ese requisito, el ataque funciona y el atacante obtiene tokens válidos sin conocer las credenciales.

**Lección:** defensa en profundidad. El cliente debe implementar PKCE (MSAL lo hace por defecto) y el servidor debe exigirlo.

## Stack

Vite 8, React 18, TypeScript 6 (con `verbatimModuleSyntax`), `@azure/msal-browser` 3 y `@azure/msal-react` 2, y Oxlint para el análisis estático.

## Estructura

```
src/
├── auth/authConfig.ts         # Configuración MSAL: authority, knownAuthorities, scopes, caché, logger
├── main.tsx                   # Inicializa PublicClientApplication y MsalProvider
├── App.tsx                    # Navegación entre páginas (detecta el retorno de cada demo por el state)
├── components/                # NavBar, TokenViewer, UserProfile, MsalConfigViewer, PkceFlowDiagram
└── pages/
    ├── HomePage.tsx           # Flujo seguro Auth Code + PKCE
    ├── ImplicitFlowPage.tsx   # Demo vulnerable: flujo implícito
    └── CodeInterceptionPage.tsx # Demo vulnerable: Auth Code sin PKCE
```

## Configuración de MSAL para B2C

Puntos relevantes de `src/auth/authConfig.ts`:

- **Authority con dominio personalizado:** `https://{dominio}/{tenant}.onmicrosoft.com/{politica}`.
- **`knownAuthorities`:** se debe declarar el dominio personalizado. Sin él, MSAL rechaza la authority de B2C.
- **Scopes:** `openid`, `profile`, `offline_access` (habilita el refresh token) y los scopes expuestos por la API de la aplicación demo (`Afiliados`, `user_impersonation` y, opcionalmente, `Accounts.Read`).
- **Caché en `sessionStorage`:** los tokens no persisten entre pestañas ni después de cerrar el navegador.
- **Logger:** nivel `Verbose` para ver cada paso del flujo en la consola. Los mensajes que contienen PII se descartan. En ambientes productivos se debe usar `Warning`.

## Puesta en marcha

### Requisitos previos

- Node.js 20 o superior.
- Acceso al registro de la aplicación demo en el tenant B2C de QA, con la plataforma **SPA** configurada y `https://localhost:3000` como Redirect URI.

### 1. Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores del registro de la aplicación:

```bash
cp .env.example .env.local
```

| Variable | Descripción |
|---|---|
| `VITE_B2C_CLIENT_ID` | Client ID del registro de la aplicación demo |
| `VITE_B2C_TENANT_DOMAIN` | Dominio personalizado del tenant B2C |
| `VITE_B2C_TENANT_ONMICROSOFT` | Nombre del tenant en formato `*.onmicrosoft.com` |
| `VITE_B2C_POLICY` | Política custom (IEF) o user flow |
| `VITE_B2C_REDIRECT_URI` | Redirect URI registrada como SPA |

`.env.local` está excluido por `.gitignore`. No subas identificadores reales del tenant al repositorio.

### 2. Certificado HTTPS local

B2C exige HTTPS en la Redirect URI, así que Vite levanta el servidor con un certificado autofirmado ubicado en `certificates/`. Esa carpeta tampoco se versiona. Para generarlo:

```bash
mkdir -p certificates
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout certificates/localhost.key -out certificates/localhost.crt \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost"
```

### 3. Ejecutar

```bash
npm install
npm run dev      # https://localhost:3000
```

Otros scripts disponibles: `npm run build`, `npm run preview` y `npm run lint`.

## Consideraciones de seguridad

- La demo se conecta al tenant de **QA**. Usa solo usuarios de prueba, nunca datos reales de afiliados.
- La decodificación de JWT en el navegador es solo para visualizarlos. No valida la firma y no debe usarse para tomar decisiones de autorización. La validación del token le corresponde a la API.
- El flujo implícito y Authorization Code sin PKCE deben estar deshabilitados en cualquier registro de aplicación productivo, y el tenant debe mantener PKCE como obligatorio.
- Mantén el certificado local y `.env.local` fuera del control de versiones.
