import { useState, useEffect } from "react";
import { B2C_AUTHORITY } from "../auth/authConfig";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseSearch(search: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(search));
}

const VULN_STATE = "code-intercept-demo-vulnerable";

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
// Página
// ─────────────────────────────────────────────────────────────────────────────

type ExchangeState = "idle" | "loading" | "success" | "error";

export default function CodeInterceptionPage() {
  const [interceptedCode, setInterceptedCode] = useState<string | null>(null);
  const [exchangeState, setExchangeState] = useState<ExchangeState>("idle");
  const [exchangeResult, setExchangeResult] = useState<Record<string, unknown>>({});

  const clientId = import.meta.env.VITE_B2C_CLIENT_ID as string;
  const redirectUri = import.meta.env.VITE_B2C_REDIRECT_URI as string;
  const tokenEndpoint = `${B2C_AUTHORITY}/oauth2/v2.0/token`;
  const baseUrl = `${B2C_AUTHORITY}/oauth2/v2.0/authorize`;

  useEffect(() => {
    const params = parseSearch(window.location.search);
    if (params["state"] === VULN_STATE && params["code"]) {
      setInterceptedCode(params["code"]);
      // Limpiar query string sin recargar la página
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Simula lo que haría un atacante: intentar canjear el código sin code_verifier
  const handleAttackerExchange = async () => {
    if (!interceptedCode) return;
    setExchangeState("loading");

    try {
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code: interceptedCode,
        client_id: clientId,
        redirect_uri: redirectUri,
        // ← SIN code_verifier: si B2C no exige PKCE, el atacante obtiene el token
      });

      const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      const data = await response.json();
      setExchangeResult(data);
      setExchangeState(response.ok ? "success" : "error");
    } catch (err) {
      setExchangeResult({ error: String(err) });
      setExchangeState("error");
    }
  };

  const vulnerableUrl =
    `${baseUrl}` +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=openid+profile` +
    `&response_mode=query` +
    `&state=${VULN_STATE}`;

  const vulnerableUrlLines: UrlLine[] = [
    { text: `${baseUrl}` },
    { text: `  ?client_id=${clientId}` },
    { text: `  &response_type=code              ← devuelve solo el código` },
    { text: `  &redirect_uri=${encodeURIComponent(redirectUri)}` },
    { text: `  &scope=openid+profile` },
    {
      text: `  &response_mode=query             ← el código queda en la URL (?code=...)`,
      highlight: "danger",
    },
    { text: `  &state=${VULN_STATE}` },
    {
      text: `  ← SIN code_challenge             ← el código puede canjearse sin code_verifier`,
      highlight: "absent",
    },
    { text: `  ← SIN code_challenge_method`, highlight: "absent" },
  ];

  const secureUrlLines: UrlLine[] = [
    { text: `${baseUrl}` },
    { text: `  ?client_id=${clientId}` },
    { text: `  &response_type=code` },
    { text: `  &redirect_uri=${encodeURIComponent(redirectUri)}` },
    { text: `  &scope=openid+profile+offline_access+...` },
    { text: `  &response_mode=fragment` },
    {
      text: `  &code_challenge=XoTsNvFMujkBHI…  ← SHA-256(code_verifier)`,
      highlight: "safe",
    },
    {
      text: `  &code_challenge_method=S256       ← sin code_verifier, el código es inútil`,
      highlight: "safe",
    },
    { text: `  &nonce=...` },
    { text: `  &state=...` },
  ];

  const attackRequestLines: UrlLine[] = [
    { text: `POST ${tokenEndpoint}` },
    { text: `Content-Type: application/x-www-form-urlencoded` },
    { text: `` },
    { text: `grant_type=authorization_code` },
    { text: `&code=${interceptedCode ?? "<código interceptado>"}` },
    { text: `&client_id=${clientId}` },
    { text: `&redirect_uri=${encodeURIComponent(redirectUri)}` },
    {
      text: `# ← SIN code_verifier → si B2C no exige PKCE, responde con tokens`,
      highlight: "absent",
    },
  ];

  const protectedRequestLines: UrlLine[] = [
    { text: `POST ${tokenEndpoint}` },
    { text: `Content-Type: application/x-www-form-urlencoded` },
    { text: `` },
    { text: `grant_type=authorization_code` },
    { text: `&code=${interceptedCode ?? "<código interceptado>"}` },
    { text: `&client_id=${clientId}` },
    { text: `&redirect_uri=${encodeURIComponent(redirectUri)}` },
    {
      text: `&code_verifier=???   ← el atacante NO tiene el valor original`,
      highlight: "absent",
    },
    { text: ``, },
    {
      text: `# B2C responde: invalid_grant — AADB2C90089`,
      highlight: "safe",
    },
  ];

  return (
    <div>
      {/* ── Banner ── */}
      <section className="card card-danger">
        <div className="danger-header">
          <span className="danger-badge">MODO VULNERABLE — SOLO DEMO EDUCATIVO</span>
          <h1 className="danger-title">
            Auth Code sin PKCE: interceptación del código de autorización
          </h1>
        </div>
        <p>
          El flujo <strong>Authorization Code sin PKCE</strong> devuelve un código temporal en
          la URL de redirección. Este código puede ser robado desde logs, cabeceras Referer o
          capturas de red. Sin PKCE, cualquier atacante que obtenga el código puede canjearlo
          directamente por tokens en el endpoint <code>/token</code>.
        </p>
        <p>
          <strong>PKCE</strong> vincula matemáticamente el código con el{" "}
          <code>code_verifier</code> generado en el mismo navegador que inició el flujo. El
          servidor almacena el <code>code_challenge = SHA-256(code_verifier)</code> y al momento
          del canje exige que el cliente demuestre que conoce el <code>code_verifier</code>
          original — algo que el atacante nunca tuvo.
        </p>
      </section>

      {/* ── Código interceptado ── */}
      {interceptedCode && (
        <section className="card card-danger">
          <h2 className="danger-title">Código capturado: el atacante ya tiene lo que necesita</h2>
          <p>
            B2C devolvió el authorization code en la query string de la URL. En un escenario
            real este código puede ser extraído de:
          </p>
          <ul className="vuln-list">
            <li>Logs del servidor web o proxy reverso que registran las URLs de entrada.</li>
            <li>
              Cabecera <strong>Referer</strong> si la página carga recursos externos después
              del redirect.
            </li>
            <li>Capturas de red en redes Wi-Fi sin TLS (aunque hoy es menos común).</li>
            <li>
              Historial del navegador, screenshots, o aplicaciones con acceso al clipboard.
            </li>
          </ul>

          <div className="token-url-box">
            <span className="token-url-label">Código interceptado:</span>
            <code className="token-url">
              <span className="token-highlight">code={interceptedCode.slice(0, 60)}…</span>
            </code>
          </div>

          {/* ── Simulación del canje sin code_verifier ── */}
          <div style={{ marginTop: "1.5rem" }}>
            <h3>Simulación: el atacante intenta canjear el código</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              La siguiente petición replica lo que un atacante ejecutaría. No incluye{" "}
              <code>code_verifier</code>. Si B2C no exige PKCE, devuelve tokens reales.
            </p>

            <div className="url-comparison">
              <div className="url-col">
                <div className="url-col-header danger">Atacante (sin code_verifier)</div>
                <FormattedUrl lines={attackRequestLines} />
              </div>
              <div className="url-col">
                <div className="url-col-header safe">Cliente legítimo (con PKCE)</div>
                <FormattedUrl lines={protectedRequestLines} />
              </div>
            </div>

            <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <button
                className="btn btn-lg"
                style={{ background: "#d83b01", color: "#fff" }}
                onClick={handleAttackerExchange}
                disabled={exchangeState === "loading"}
              >
                {exchangeState === "loading"
                  ? "Enviando petición…"
                  : "Ejecutar canje sin code_verifier"}
              </button>
              {exchangeState !== "idle" && (
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: exchangeState === "success" ? "#d83b01" : "var(--ms-green)",
                  }}
                >
                  {exchangeState === "success"
                    ? "B2C aceptó el canje sin PKCE — token obtenido"
                    : exchangeState === "error"
                    ? "B2C rechazó el canje — PKCE está siendo exigido"
                    : ""}
                </span>
              )}
            </div>

            {exchangeState !== "idle" && exchangeState !== "loading" && (
              <pre className="token-payload" style={{ marginTop: "0.75rem" }}>
                {JSON.stringify(exchangeResult, null, 2)}
              </pre>
            )}

            {exchangeState === "error" && (
              <div className="step-highlight" style={{ marginTop: "0.75rem" }}>
                B2C rechazó el canje porque el app registration exige PKCE para aplicaciones
                tipo SPA. Esto confirma que la protección está activa en este tenant — pero en
                tenants mal configurados o apps de tipo confidencial client, el canje sin
                code_verifier funcionaría.
              </div>
            )}

            {exchangeState === "success" && (
              <div
                className="step-highlight"
                style={{
                  marginTop: "0.75rem",
                  borderLeftColor: "var(--error)",
                  background: "#fde7e9",
                  color: "#6e1215",
                }}
              >
                El canje funcionó sin code_verifier. Esto confirma que el tenant o el app
                registration no está exigiendo PKCE. Cualquier atacante que obtenga el código
                obtiene tokens válidos. Activa la exigencia de PKCE en el app registration.
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Comparación de URLs ── */}
      <section className="card">
        <h2>Comparación: URL vulnerable vs. URL segura</h2>
        <div className="url-comparison">
          <div className="url-col">
            <div className="url-col-header danger">Auth Code sin PKCE (vulnerable)</div>
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
          <span className="legend-item absent">Parámetro ausente</span>
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
                <span className="step-title">Inicia sesión sin PKCE</span>
              </div>
              <p className="step-detail">
                La app redirige a B2C con <code>response_type=code</code> y sin{" "}
                <code>code_challenge</code>. El servidor B2C no tiene con qué validar
                al cliente futuro.
              </p>
            </div>
          </div>
          <div className="flow-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <div className="step-header">
                <span className="step-actor">B2C</span>
                <span className="step-title">Devuelve el código en la URL</span>
              </div>
              <p className="step-detail">
                Redirige a{" "}
                <code>
                  https://localhost:3000<strong>?code=ABC123…</strong>&state=…
                </code>
                . El código queda visible en la query string.
              </p>
            </div>
          </div>
          <div className="flow-step">
            <div
              className="step-number"
              style={{ background: "var(--error)" }}
            >
              3
            </div>
            <div className="step-content">
              <div className="step-header">
                <span
                  className="step-actor"
                  style={{ background: "#fde7e9", color: "var(--error)" }}
                >
                  Atacante
                </span>
                <span className="step-title">Extrae el código</span>
              </div>
              <p className="step-detail">
                Lo obtiene de logs del servidor, cabecera Referer o historial del
                navegador. El código aún es válido (dura segundos a minutos en B2C).
              </p>
            </div>
          </div>
          <div className="flow-step">
            <div
              className="step-number"
              style={{ background: "var(--error)" }}
            >
              4
            </div>
            <div className="step-content">
              <div className="step-header">
                <span
                  className="step-actor"
                  style={{ background: "#fde7e9", color: "var(--error)" }}
                >
                  Atacante
                </span>
                <span className="step-title">
                  Canjea el código directamente en <code>/token</code>
                </span>
              </div>
              <p className="step-detail">
                Envía <code>POST /token</code> con el código y el{" "}
                <code>client_id</code> público. Sin PKCE, B2C no puede verificar
                que quien canjea es el mismo cliente que inició el flujo.
              </p>
              <div
                className="step-highlight"
                style={{
                  borderLeftColor: "var(--error)",
                  background: "#fde7e9",
                  color: "#6e1215",
                }}
              >
                El atacante obtiene <code>access_token</code> e{" "}
                <code>id_token</code> válidos sin conocer las credenciales del
                usuario.
              </div>
            </div>
          </div>
          <div className="flow-step">
            <div
              className="step-number"
              style={{ background: "var(--ms-green)" }}
            >
              5
            </div>
            <div className="step-content">
              <div className="step-header">
                <span
                  className="step-actor"
                  style={{ background: "#dff6dd", color: "var(--ms-green)" }}
                >
                  PKCE evita esto
                </span>
                <span className="step-title">El code_verifier nunca salió del navegador</span>
              </div>
              <p className="step-detail">
                MSAL genera un <code>code_verifier</code> aleatorio (43-128 chars) en
                memoria, calcula <code>code_challenge = SHA-256(verifier)</code> y lo
                envía a B2C. Al canjear el código, B2C exige el <code>code_verifier</code>{" "}
                original y verifica que <code>SHA-256(verifier) === challenge</code>
                almacenado.
              </p>
              <div className="step-highlight">
                El atacante tiene el código pero no el <code>code_verifier</code>. B2C
                responde <code>invalid_grant</code>. El ataque falla completamente.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Botón de disparo ── */}
      {!interceptedCode && (
        <section className="card" style={{ textAlign: "center" }}>
          <h2>Ejecutar la demo</h2>
          <p style={{ color: "var(--text-muted)" }}>
            Al hacer clic, la app redirigirá a B2C con{" "}
            <code>response_type=code</code> y <strong>sin</strong>{" "}
            <code>code_challenge</code>. B2C devolverá el authorization code en la
            query string de la URL. Regresarás aquí con el código visible y podrás
            ejecutar el canje simulado.
          </p>
          <button
            className="btn btn-lg"
            style={{
              background: "#d83b01",
              color: "#fff",
              marginTop: "0.5rem",
            }}
            onClick={() => {
              window.location.href = vulnerableUrl;
            }}
          >
            Iniciar flujo vulnerable (Auth Code sin PKCE)
          </button>
        </section>
      )}
    </div>
  );
}
