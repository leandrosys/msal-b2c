import { B2C_AUTHORITY, API_SCOPE } from "../auth/authConfig";

export default function MsalConfigViewer() {
  const configItems = [
    {
      label: "Client ID",
      value: "09479b5e-26c2-4d63-ac08-25210d5820f5",
      desc: "Identificador de tu aplicación registrada en Azure B2C",
    },
    {
      label: "Authority",
      value: B2C_AUTHORITY,
      desc: "URL del endpoint de autorización de la política B2C. Formato: https://{domain}/{tenantId}/{policy}",
    },
    {
      label: "Known Authorities",
      value: "afiliados-qa.proteccion.com",
      desc: "Dominio personalizado B2C. MSAL lo valida para prevenir ataques open-redirect.",
    },
    {
      label: "Redirect URI",
      value: "https://localhost:3000",
      desc: "URI registrada en B2C. MSAL verifica que coincida exactamente.",
    },
    {
      label: "Cache Location",
      value: "localStorage",
      desc: "Persiste tokens entre pestañas. Alternativa: sessionStorage (solo pestaña actual).",
    },
    {
      label: "API Scope",
      value: API_SCOPE,
      desc: "Scope del resource server. B2C lo incluye en el access_token.",
    },
    {
      label: "Scopes totales",
      value: `openid • profile • offline_access • ${API_SCOPE}`,
      desc: "openid/profile → id_token. offline_access → refresh_token. API scope → access_token.",
    },
  ];

  return (
    <section className="card">
      <h2>Configuración MSAL activa</h2>
      <p className="subtitle">
        Valores con los que fue inicializado <code>PublicClientApplication</code>.
      </p>
      <div className="config-list">
        {configItems.map(({ label, value, desc }) => (
          <div key={label} className="config-item">
            <div className="config-item-header">
              <span className="config-label">{label}</span>
            </div>
            <code className="config-value">{value}</code>
            <p className="config-desc">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
