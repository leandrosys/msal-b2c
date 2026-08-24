import { useAccount, useMsal } from "@azure/msal-react";

export default function UserProfile() {
  const { accounts } = useMsal();
  // useAccount devuelve el objeto AccountInfo para la cuenta activa.
  // Contiene los claims del id_token que se guardaron al hacer login.
  const account = useAccount(accounts[0] || {});

  if (!account) return null;

  const claims = account.idTokenClaims as Record<string, unknown> | undefined;

  const profileItems = [
    { label: "Nombre", value: account.name },
    { label: "Username (claim sub)", value: account.username },
    { label: "Home Account ID", value: account.homeAccountId },
    { label: "Tenant ID", value: account.tenantId },
    { label: "Entorno", value: account.environment },
    { label: "Local Account ID", value: account.localAccountId },
  ];

  return (
    <section className="card">
      <h2>Perfil de la cuenta activa</h2>
      <p className="subtitle">
        Datos del objeto <code>AccountInfo</code> guardado por MSAL al completar el login.
      </p>

      <div className="profile-grid">
        {profileItems.map(({ label, value }) => (
          <div key={label} className="profile-item">
            <span className="profile-label">{label}</span>
            <span className="profile-value">{String(value ?? "—")}</span>
          </div>
        ))}
      </div>

      {claims && (
        <>
          <h3 style={{ marginTop: "1.5rem" }}>Claims del ID Token</h3>
          <p className="subtitle">
            Claims estándar OIDC más los claims personalizados de la política B2C.
          </p>
          <table className="claims-table">
            <thead>
              <tr>
                <th>Claim</th>
                <th>Valor</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(claims).map(([key, value]) => (
                <tr key={key}>
                  <td>
                    <code>{key}</code>
                  </td>
                  <td className="claim-value">
                    {key === "iat" || key === "exp" || key === "nbf"
                      ? `${value} (${new Date(Number(value) * 1000).toLocaleString("es-CO")})`
                      : String(value)}
                  </td>
                  <td className="claim-desc">{CLAIM_DESCRIPTIONS[key] ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

const CLAIM_DESCRIPTIONS: Record<string, string> = {
  iss: "Issuer — quién emitió el token (B2C)",
  sub: "Subject — identificador único del usuario en este cliente",
  aud: "Audience — a quién va dirigido el token (client_id)",
  exp: "Expiration — timestamp de expiración",
  iat: "Issued At — timestamp de emisión",
  nbf: "Not Before — el token no es válido antes de esta fecha",
  name: "Nombre completo del usuario",
  nonce: "Valor aleatorio para prevenir ataques de replay",
  oid: "Object ID del usuario en Azure AD",
  tfp: "Trust Framework Policy — nombre de la política B2C usada",
  acr: "Authentication Context Reference (similar a tfp en políticas IEF)",
  ver: "Versión del token",
  email: "Correo electrónico del usuario",
  given_name: "Primer nombre",
  family_name: "Apellido",
  idp: "Identity Provider — proveedor de identidad federado (si aplica)",
  city: "Ciudad (claim personalizado B2C)",
  country: "País",
};
