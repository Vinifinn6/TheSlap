// Configuração do Auth0
const auth0Config = {
  domain: "vinifinn6.us.auth0.com",
  clientId: "OuKs70nxKcQCb43urRJ8LbiHpOcnm0Ui",
  audience: "https://api.theslap.com", // API identifier (opcional)
  redirectUri: window.location.origin,
  scope: "openid profile email",
}
