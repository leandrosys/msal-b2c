export default function PkceFlowDiagram() {
  const steps = [
    {
      num: 1,
      actor: "SPA → B2C",
      title: "Authorization Request",
      detail:
        "MSAL genera un code_verifier aleatorio de 64 bytes y calcula " +
        "code_challenge = BASE64URL(SHA-256(code_verifier)). Luego redirige al " +
        "endpoint /authorize de B2C enviando client_id, redirect_uri, scopes, " +
        "response_type=code, code_challenge y code_challenge_method=S256.",
      highlight: "El code_verifier NUNCA sale del navegador en este paso.",
    },
    {
      num: 2,
      actor: "B2C → Usuario",
      title: "Autenticación del usuario",
      detail:
        "B2C muestra la pantalla de login definida en la política b2c_1a_signin. " +
        "El usuario ingresa sus credenciales. B2C valida y genera un " +
        "authorization_code de vida corta (≈10 min).",
      highlight: null,
    },
    {
      num: 3,
      actor: "B2C → SPA",
      title: "Redirect con Authorization Code",
      detail:
        "B2C redirige a https://localhost:3000 con el parámetro code=... " +
        "en la URL. MSAL intercepta esta URL en handleRedirectPromise() " +
        "antes de que la app termine de renderizar.",
      highlight: null,
    },
    {
      num: 4,
      actor: "SPA → B2C",
      title: "Token Request (intercambio)",
      detail:
        "MSAL hace un POST al endpoint /token enviando el authorization_code " +
        "más el code_verifier original. B2C verifica que " +
        "SHA-256(code_verifier) == code_challenge guardado en el paso 1. " +
        "Si coincide, emite los tokens.",
      highlight: "PKCE previene ataques de intercepción del código.",
    },
    {
      num: 5,
      actor: "B2C → SPA",
      title: "Tokens emitidos",
      detail:
        "B2C devuelve: access_token (JWT para llamar la API), " +
        "id_token (JWT con claims del usuario) y refresh_token " +
        "(opaco, válido por más tiempo). MSAL los guarda en caché (localStorage).",
      highlight: null,
    },
    {
      num: 6,
      actor: "SPA",
      title: "Renovación silenciosa",
      detail:
        "Cuando el access_token expira, acquireTokenSilent() usa el " +
        "refresh_token para obtener un nuevo par sin interacción del usuario. " +
        "Si el refresh_token también expiró, MSAL lanza InteractionRequiredAuthError " +
        "y la app debe iniciar un flujo interactivo de nuevo.",
      highlight: null,
    },
  ];

  return (
    <section className="card">
      <h2>Flujo Authorization Code + PKCE</h2>
      <p className="subtitle">
        PKCE (Proof Key for Code Exchange — RFC 7636) extiende el flujo
        Authorization Code para que sea seguro en clientes públicos sin client_secret.
      </p>

      <div className="flow-steps">
        {steps.map((step) => (
          <div key={step.num} className="flow-step">
            <div className="step-number">{step.num}</div>
            <div className="step-content">
              <div className="step-header">
                <span className="step-actor">{step.actor}</span>
                <span className="step-title">{step.title}</span>
              </div>
              <p className="step-detail">{step.detail}</p>
              {step.highlight && (
                <div className="step-highlight">
                  <span>⚡ {step.highlight}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
