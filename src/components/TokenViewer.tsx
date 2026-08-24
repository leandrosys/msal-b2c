import { useState } from "react";
import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import type { AuthenticationResult } from "@azure/msal-browser";
import { tokenRequest, loginRequest } from "../auth/authConfig";

// Decodifica un JWT sin verificar la firma (solo para visualización en dev).
// NUNCA usar este resultado para tomar decisiones de seguridad en producción.
function decodeJwt(token: string): { header: object; payload: object } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const decode = (str: string) =>
      JSON.parse(atob(str.replace(/-/g, "+").replace(/_/g, "/")));
    return { header: decode(parts[0]), payload: decode(parts[1]) };
  } catch {
    return null;
  }
}

function JsonBlock({ data }: { data: object }) {
  return (
    <pre className="json-block">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function TokenSection({
  label,
  token,
}: {
  label: string;
  token: string | undefined;
}) {
  const [showRaw, setShowRaw] = useState(false);
  if (!token) return null;
  const decoded = decodeJwt(token);

  return (
    <div className="token-section">
      <div className="token-section-header">
        <h4>{label}</h4>
        <button
          className="btn-toggle"
          onClick={() => setShowRaw((v) => !v)}
        >
          {showRaw ? "Ver claims" : "Ver raw JWT"}
        </button>
      </div>

      {showRaw ? (
        <pre className="json-block raw">{token}</pre>
      ) : decoded ? (
        <>
          <p className="section-label">Header</p>
          <JsonBlock data={decoded.header} />
          <p className="section-label">Payload (claims)</p>
          <JsonBlock data={decoded.payload} />
        </>
      ) : (
        <p className="error-text">No se pudo decodificar el token.</p>
      )}
    </div>
  );
}

export default function TokenViewer() {
  const { instance, accounts } = useMsal();
  const [result, setResult] = useState<AuthenticationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acquireToken = async () => {
    setLoading(true);
    setError(null);
    try {
      // acquireTokenSilent busca primero en el caché de MSAL.
      // Si el access_token está vigente lo devuelve sin hacer ninguna llamada de red.
      // Si expiró pero hay refresh_token válido, hace el intercambio silenciosamente.
      const response = await instance.acquireTokenSilent({
        ...tokenRequest,
        account: accounts[0],
      });
      setResult(response);
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        // InteractionRequiredAuthError significa que la renovación silenciosa
        // falló: el refresh_token venció o fue revocado. Debemos volver a
        // autenticar al usuario de forma interactiva.
        try {
          const response = await instance.acquireTokenPopup({
            ...loginRequest,
            account: accounts[0],
          });
          setResult(response);
        } catch (popupErr) {
          setError(`Error en acquireTokenPopup: ${String(popupErr)}`);
        }
      } else {
        setError(`Error en acquireTokenSilent: ${String(err)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card">
      <h2>Adquisición de tokens</h2>
      <p className="subtitle">
        Demuestra <code>acquireTokenSilent</code> con fallback a{" "}
        <code>acquireTokenPopup</code> cuando el refresh token expiró.
      </p>

      <button
        className="btn btn-primary"
        onClick={acquireToken}
        disabled={loading}
      >
        {loading ? "Adquiriendo token…" : "Adquirir Access Token"}
      </button>

      {error && <p className="error-text" style={{ marginTop: "1rem" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: "1.5rem" }}>
          <div className="token-meta">
            <div className="meta-item">
              <span className="meta-label">Expira</span>
              <span className="meta-value">
                {new Date(result.expiresOn!).toLocaleString("es-CO")}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Scopes</span>
              <span className="meta-value">{result.scopes.join(", ")}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Desde caché</span>
              <span className="meta-value">
                {result.fromCache ? "Sí ✓" : "No (red)"}
              </span>
            </div>
          </div>

          <TokenSection label="Access Token" token={result.accessToken} />
          <TokenSection label="ID Token" token={result.idToken} />
        </div>
      )}
    </section>
  );
}
