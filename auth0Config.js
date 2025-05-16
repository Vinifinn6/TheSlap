// Configuração do Auth0
const auth0Config = {
  domain: "seu-dominio.auth0.com",
  clientId: "seu-client-id-auth0",
  audience: "https://api.theslap.com", // API identifier (opcional)
  redirectUri: window.location.origin,
  scope: "openid profile email",
}
