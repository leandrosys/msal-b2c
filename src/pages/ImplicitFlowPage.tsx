import { useState, useEffect } from "react";
import { B2C_AUTHORITY } from "../auth/authConfig";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseFragment(hash: string): Record<string, string> {
  return Object.fromEntries(
    hash
      .replace(/^#/, "")
      .split("&")
      .filter(Boolean)
      .map((pair) => {
        const [k, ...rest] = pair.split("=");
        return [k, decodeURIComponent(rest.join("="))];
      })
  );
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return {};
  }
}

// Identifica este flujo en el parámetro state para distinguirlo del PKCE normal
const VULN_STATE = "implicit-demo-vulnerable";
const VULN_NONCE = "implicit-demo-nonce-001";

// ─────────────────────────────────────────────────────────────────────────────
// Componente: URL formateada con líneas resaltadas
// ─────────────────────────────────────────────────────────────────────────────

interface UrlLine {
  text: string;
  highlight?: "danger" | "safe" | "absent";
}

function FormattedUrl({ lines }: { lines: UrlLine[] }) {
  return (
    <pre className="url-block">
      {lines.map((line, i) => (
        <span
          key={i}
          className={
            line.highlight === "danger"
              ? "url-line-danger"
              : line.highlight === "safe"
              ? "url-line-safe"
              : line.highlight === "absent"
              ? "url-line-absent"
              : undefined
          }
        >
          {line.text}
          {"\n"}
        </span>
      ))}
    </pre>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────

export default function ImplicitFlowPage() {
  const [fragmentData, setFragmentData] = useState<Record<string, string>>({});
  const [tokenPayload, setTokenPayload] = useState<Record<string, unknown>>({});
  const [showFullToken, setShowFullToken] = useState(false);

  const clientId = import.meta.env.VITE_B2C_CLIENT_ID as string;
  const redirectUri = import.meta.env.VITE_B2C_REDIRECT_URI as string;
  const baseUrl = `${B2C_AUTHORITY}/oauth2/v2.0/authorize`;

  // Al cargar, detectar si B2C ya devolvió el token en el hash de la URL
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const params = parseFragment(hash);
    if (params["state"] !== VULN_STATE) return;

    setFragmentData(params);
    if (params["id_token"]) {
      setTokenPayload(decodeJwtPayload(params["id_token"]));
    }
  }, []);

  const hasToken = Boolean(fragmentData["id_token"]);
  const hasError = Boolean(fragmentData["error"]);

  const vulnerableUrl =
    `${baseUrl}` +
    `?client_id=${clientId}` +
    `&response_type=id_token` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=openid+profile` +
    `&response_mode=fragment` +
    `&nonce=${VULN_NONCE}` +
    `&state=${VULN_STATE}`;

  const vulnerableUrlLines: UrlLine[] = [
    { text: `${baseUrl}` },
    { text: `  ?client_id=${clientId}` },
    {
      text: `  &response_type=id_token       ← el token se devuelve directamente`,
      highlight: "danger",
    },
    { text: `  &redirect_uri=${encodeURIComponent(redirectUri)}` },
    { text: `  &scope=openid+profile` },
    {
      text: `  &response_mode=fragment       ← el token va al hash (#) de la URL`,
      highlight: "danger",
    },
    { text: `  &nonce=${VULN_NONCE}` },
    { text: `  &state=${VULN_STATE}` },
    {
      text: `  ← SIN code_challenge          ← cualquiera puede usar la respuesta`,
      highlight: "absent",
    },
    {
      text: `  ← SIN code_challenge_method`,
      highlight: "absent",
    },
  ];

  const secureUrlLines: UrlLine[] = [
    { text: `${baseUrl}` },
    { text: `  ?client_id=${clientId}` },
    {
      text: `  &response_type=code           ← solo devuelve un código temporal`,
      highlight: "safe",
    },
    { text: `  &redirect_uri=${encodeURIComponent(redirectUri)}` },
    { text: `  &scope=openid+profile+offline_access+...` },
    { text: `  &response_mode=fragment` },
    {
      text: `  &code_challenge=XoTsNvFM...   ← SHA-256(code_verifier)`,
      highlight: "safe",
    },
    {
      text: `  &code_challenge_method=S256   ← sin code_verifier, el código es inútil`,
      highlight: "safe",
    },
    { text: `  &nonce=...` },
    { text: `  &state=...` },
  ];

  return (
    <div>
      {/* ── Banner de advertencia ── */}
      <section className="card card-danger">
        <div className="danger-header">
          <span className="danger-badge">MODO VULNERABLE — SOLO DEMO EDUCATIVO</span>
          <h1 className="danger-title">Flujo implícito: el token queda expuesto en la URL</h1>
        </div>
        <p>
          Esta página demuestra por qué el flujo implícito (<code>response_type=id_token</code>)
          fue deprecado por OAuth 2.0 Security BCP. Al autenticar con este flujo, Azure AD B2C
          devuelve el token directamente en el <strong>fragmento hash</strong> de la URL de
          redirección, exponiéndolo a múltiples vectores de ataque.
        </p>
        <p>
          El flujo <strong>Authorization Code + PKCE</strong> elimina este problema: B2C solo
          devuelve un código de un solo uso que sin el <code>code_verifier</code> original no
          sirve de nada.
        </p>
      </section>

      {/* ── Token detectado en la URL ── */}
      {hasToken && (
        <section className="card card-danger">
          <h2 className="danger-title">Vulnerabilidad activa: token visible en la URL</h2>
          <p>
            El <code>id_token</code> está <strong>ahora mismo en la barra de direcciones de tu
            navegador</strong>. Mira la URL. Esto significa:
          </p>
          <ul className="vuln-list">
            <li>Queda registrado en el <strong>historial del navegador</strong> del usuario.</li>
            <li>
              Si la página carga recursos externos (analytics, CDN, fonts), el token viaja en
              la cabecera <strong>Referer</strong> al servidor de terceros.
            </li>
            <li>Queda en los <strong>logs del servidor web</strong> si hay algún proxy o WAF.</li>
            <li>
              Cualquier script de terceros en la página (<code>{"<script>"}</code>) puede leer{" "}
              <code>window.location.hash</code> y extraer el token.
            </li>
          </ul>

          <div className="token-url-box">
            <span className="token-url-label">URL actual (el token está aquí):</span>
            <code className="token-url">
              {redirectUri}
              <span className="token-highlight">
                #id_token={fragmentData["id_token"]?.slice(0, 40)}…
              </span>
            </code>
          </div>

          <div style={{ marginTop: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <h3 style={{ margin: 0 }}>Payload del token (sin verificación de firma)</h3>
              <button
                className="btn-toggle"
                onClick={() => setShowFullToken((v) => !v)}
              >
                {showFullToken ? "Ocultar token" : "Ver token completo"}
              </button>
            </div>
            <pre className="token-payload">
              {JSON.stringify(tokenPayload, null, 2)}
            </pre>
            {showFullToken && (
              <pre className="token-raw">{fragmentData["id_token"]}</pre>
            )}
          </div>
        </section>
      )}

      {hasError && (
        <section className="card" style={{ borderTop: "4px solid var(--error)" }}>
          <h2>Error en el flujo implícito</h2>
          <p>
            B2C rechazó la solicitud. Si el app registration no tiene habilitado el flujo
            implícito (<strong>Implicit grant → ID tokens</strong>), este flujo no funcionará
            aunque sea vulnerable. Eso es un control positivo, pero el problema sigue siendo
            que cuando está habilitado, el token queda expuesto.
          </p>
          <pre className="token-payload">
            {JSON.stringify(fragmentData, null, 2)}
          </pre>
        </section>
      )}

      {/* ── Comparación de URLs ── */}
      <section className="card">
        <h2>Comparación: URL vulnerable vs. URL segura</h2>
        <div className="url-comparison">
          <div className="url-col">
            <div className="url-col-header danger">Implícito (vulnerable)</div>
            <FormattedUrl lines={vulnerableUrlLines} />
          </div>
          <div className="url-col">
            <div className="url-col-header safe">Auth Code + PKCE (seguro)</div>
            <FormattedUrl lines={secureUrlLines} />
          </div>
        </div>
        <div className="legend">
          <span className="legend-item danger">Parámetro problemático</span>
          <span className="legend-item safe">Protección PKCE</span>
          <span className="legend-item absent">Parámetro ausente (que debería estar)</span>
        </div>
      </section>

      {/* ── Escenario de ataque ── */}
      <section className="card">
        <h2>Escenario de ataque — paso a paso</h2>
        <div className="flow-steps">
          <div className="flow-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <div className="step-header">
                <span className="step-actor">Víctima</span>
                <span className="step-title">Inicia sesión con flujo implícito</span>
              </div>
              <p className="step-detail">
                La app redirige a B2C con <code>response_type=id_token</code>.
              </p>
            </div>
          </div>
          <div className="flow-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <div className="step-header">
                <span className="step-actor">B2C</span>
                <span className="step-title">Devuelve el token en la URL</span>
              </div>
              <p className="step-detail">
                Redirige a <code>https://localhost:3000<strong>#id_token=eyJ...</strong></code>. El
                token queda en la URL del navegador.
              </p>
            </div>
          </div>
          <div className="flow-step">
            <div className="step-number" style={{ background: "var(--error)" }}>3</div>
            <div className="step-content">
              <div className="step-header">
                <span className="step-actor" style={{ background: "#fde7e9", color: "var(--error)" }}>Atacante</span>
                <span className="step-title">Extrae el token desde cualquier vector</span>
              </div>
              <p className="step-detail">
                Historial del navegador · cabecera Referer · script de terceros ·
                screenshot · logs de proxy.
              </p>
              <div className="step-highlight" style={{ borderLeftColor: "var(--error)", background: "#fde7e9", color: "#6e1215" }}>
                El atacante usa el token directamente. No necesita credenciales, ni interactuar con B2C.
                El token es válido hasta su expiración (típicamente 1 hora).
              </div>
            </div>
          </div>
          <div className="flow-step">
            <div className="step-number" style={{ background: "var(--ms-green)" }}>4</div>
            <div className="step-content">
              <div className="step-header">
                <span className="step-actor" style={{ background: "#dff6dd", color: "var(--ms-green)" }}>PKCE evita esto</span>
                <span className="step-title">Con Auth Code + PKCE, el atacante solo obtiene un código</span>
              </div>
              <p className="step-detail">
                El código de autorización es de un solo uso y expira en segundos.{" "}
                Canjearlo requiere el <code>code_verifier</code> que <em>nunca salió del
                navegador de la víctima</em>.
              </p>
              <div className="step-highlight">
                Sin code_verifier → B2C rechaza el intercambio → el atacante no obtiene ningún token.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Botón de disparo ── */}
      {!hasToken && !hasError && (
        <section className="card" style={{ textAlign: "center" }}>
          <h2>Ejecutar la demo</h2>
          <p style={{ color: "var(--text-muted)" }}>
            Al hacer clic, la app redirigirá a B2C <strong>sin PKCE</strong> usando el flujo
            implícito. Si el flujo funciona, regresarás a esta página con el token visible en
            la barra de direcciones del navegador.
          </p>
          <button
            className="btn btn-lg"
            style={{ background: "#d83b01", color: "#fff", marginTop: "0.5rem" }}
            onClick={() => { window.location.href = vulnerableUrl; }}
          >
            Iniciar sesión vulnerable (implicit flow)
          </button>
          <p className="hint" style={{ marginTop: "0.75rem" }}>
            Requiere que el app registration tenga habilitado <em>Implicit grant → ID tokens</em>{" "}
            en el portal de Azure AD B2C.
          </p>
        </section>
      )}
    </div>
  );
}
