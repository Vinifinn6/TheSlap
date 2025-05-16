// Variáveis globais
let currentUser = null
let currentConversation = null
let unreadNotifications = 0
let unreadMessages = 0
let auth0Client = null

const funFacts = [
  "Na língua portuguesa, a palavra 'pé' também significa 'macacos sangrentos'.",
  "O ator que interpretou Rex em Victorious também dublou muitos personagens em Bob Esponja.",
  "Hollywood Arts é baseada em uma escola real de artes performáticas em Los Angeles.",
  "A média de um estudante da Hollywood Arts precisa ser pelo menos 95% para se manter na escola.",
  "Sikowitz bebe leite de coco porque acredita que lhe dá visões.",
]

// Configuração do Imgur
const IMGUR_CLIENT_ID = "sua_client_id_do_imgur" // Substitua pela sua Client ID do Imgur

// Configuração do Auth0
const auth0Config = {
  domain: "seu_dominio_auth0", // Substitua pelo seu domínio Auth0
  clientId: "seu_client_id_auth0", // Substitua pelo seu Client ID Auth0
  redirectUri: window.location.origin,
  audience: "sua_api_audience", // Substitua pela sua API Audience
  scope: "openid profile email",
}

// Configuração do CockroachDB
const dbConfig = {
  apiUrl: "sua_url_da_api", // Substitua pela sua URL da API
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Inicializar Auth0
    await initAuth0()

    // Configurar eventos
    setupEventListeners()

    // Mostrar um fato divertido aleatório
    showRandomFunFact()
  } catch (error) {
    console.error("Erro na inicialização:", error)
    showAlert("Erro ao inicializar a aplicação. Por favor, tente novamente mais tarde.", "error")
  }
})

// Função para inicializar o Auth0
async function initAuth0() {
  try {
    // Verificar se o Auth0 está disponível
    if (typeof createAuth0Client !== "function") {
      console.error("Auth0 não está disponível. Verifique se o script do Auth0 foi carregado corretamente.")
      showAlert("Erro ao inicializar autenticação. Por favor, recarregue a página.", "error")
      return
    }

    auth0Client = await createAuth0Client({
      domain: auth0Config.domain,
      clientId: auth0Config.clientId,
      authorizationParams: {
        redirect_uri: auth0Config.redirectUri,
        audience: auth0Config.audience,
        scope: auth0Config.scope,
      },
    })

    // Verificar se o usuário foi redirecionado após login
    if (location.search.includes("code=") && location.search.includes("state=")) {
      await auth0Client.handleRedirectCallback()
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    // Verificar se o usuário já está autenticado
    const isAuthenticated = await auth0Client.isAuthenticated()

    if (isAuthenticated) {
      currentUser = await auth0Client.getUser()
      await loadUserProfile()
      updateNotificationBadge()
      updateMessagesBadge()
      showHome()
    } else {
      showLogin()
    }
  } catch (error) {
    console.error("Erro ao inicializar Auth0:", error)
    showAlert("Erro ao inicializar autenticação. Por favor, tente novamente mais tarde.", "error")
    showLogin() // Mostrar tela de login mesmo em caso de erro
  }
}

// Configurar ouvintes de eventos
function setupEventListeners() {
  // Ouvinte para o seletor de humor personalizado
  document.getElementById("post-mood").addEventListener("change", function () {
    if (this.value === "custom") {
      document.getElementById("custom-mood-container").classList.remove("hidden")
    } else {
      document.getElementById("custom-mood-container").classList.add("hidden")
    }
  })

  // Ouvinte para o botão de busca
  document.getElementById("search-button").addEventListener("click", () => {
    const query = document.getElementById("search-input").value.trim()
    if (query) {
      performSearch(query)
    }
  })

  // Ouvinte para a tecla Enter no campo de busca
  document.getElementById("search-input").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      const query = this.value.trim()
      if (query) {
        performSearch(query)
      }
    }
  })

  // Ouvinte para o contador de imagens no post
  document.getElementById("post-images-container").addEventListener("change", updateImageCounter)

  // Ouvinte para adicionar mais imagens
  document.getElementById("add-more-images").addEventListener("click", addImageInput)

  // Inicializar o primeiro input de imagem
  const firstImageInput = document.getElementById("post-image-1")
  if (firstImageInput) {
    firstImageInput.addEventListener("change", (event) => {
      previewImage(event, "preview-1")
    })
  }

  // Adicionar event listeners para os botões de login e registro
  document.querySelectorAll(".auth-button").forEach((button) => {
    button.addEventListener("click", function () {
      if (this.textContent.trim() === "Entrar") {
        login()
      } else if (this.textContent.trim() === "Registrar") {
        register()
      }
    })
  })

  // Adicionar event listeners para os links de login e registro
  document.querySelectorAll(".form-footer a").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()
      if (this.textContent.trim() === "Entre") {
        showLogin()
      } else if (this.textContent.trim() === "Registre-se") {
        showRegister()
      }
    })
  })
}

// Função para fazer upload de imagem para o Imgur
async function uploadToImgur(file) {
  try {
    const formData = new FormData()
    formData.append("image", file)

    const response = await fetch("https://api.imgur.com/3/image", {
      method: "POST",
      headers: {
        Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
      },
      body: formData,
    })

    const data = await response.json()

    if (data.success) {
      return data.data.link
    } else {
      throw new Error(data.data.error || "Erro ao fazer upload para o Imgur")
    }
  } catch (error) {
    console.error("Erro no upload para o Imgur:", error)
    throw error
  }
}

// Função para adicionar mais um campo de imagem (limitado a 2)
function addImageInput() {
  const container = document.getElementById("post-images-container")
  const inputs = container.querySelectorAll(".post-image-input")

  if (inputs.length < 2) {
    const newInput = document.createElement("div")
    newInput.className = "post-image-input"
    newInput.innerHTML = `
      <label for="post-image-${inputs.length + 1}" class="file-upload-icon">
        <i class="fas fa-image"></i>
        <span>Imagem ${inputs.length + 1}</span>
        <input type="file" id="post-image-${inputs.length + 1}" accept="image/*" class="hidden post-image-file">
      </label>
      <div class="image-preview" id="preview-${inputs.length + 1}"></div>
    `

    container.appendChild(newInput)

    // Adicionar evento para pré-visualização
    const fileInput = newInput.querySelector(`#post-image-${inputs.length + 1}`)
    fileInput.addEventListener("change", (event) => {
      previewImage(event, `preview-${inputs.length + 1}`)
    })

    // Atualizar contador e botão
    updateImageCounter()
  }
}

// Função para atualizar o contador de imagens e o botão de adicionar mais
function updateImageCounter() {
  const container = document.getElementById("post-images-container")
  const inputs = container.querySelectorAll(".post-image-input")
  const addButton = document.getElementById("add-more-images")

  // Atualizar texto do contador
  document.getElementById("image-counter").textContent = `${inputs.length}/2 imagens`

  // Desabilitar botão se já tiver 2 imagens
  if (inputs.length >= 2) {
    addButton.disabled = true
    addButton.classList.add("disabled")
  } else {
    addButton.disabled = false
    addButton.classList.remove("disabled")
  }
}

// Função para pré-visualizar imagem
function previewImage(event, previewId) {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const previewElement = document.getElementById(previewId)
      previewElement.innerHTML = `<img src="${e.target.result}" alt="Preview" class="image-preview-thumbnail">`
    }
    reader.readAsDataURL(file)
  }
}

// Funções de navegação
function showHome() {
  hideAllSections()
  if (currentUser) {
    document.getElementById("content-area").classList.remove("hidden")
    loadFeed()
    loadFriends()
    loadHotPages()
  } else {
    showLogin()
  }
}

function showLogin() {
  hideAllSections()
  document.getElementById("login-form").classList.remove("hidden")
  document.getElementById("auth-buttons").classList.remove("hidden")
}

function showRegister() {
  hideAllSections()
  document.getElementById("register-form").classList.remove("hidden")
  document.getElementById("auth-buttons").classList.remove("hidden")
}

function showProfileSetup() {
  hideAllSections()
  document.getElementById("profile-setup").classList.remove("hidden")
  document.getElementById("auth-buttons").classList.add("hidden")
}

function showProfiles() {
  if (!currentUser) return showLogin()

  hideAllSections()
  document.getElementById("profiles-area").classList.remove("hidden")
  loadAllProfiles()
}

function showSearch() {
  if (!currentUser) return showLogin()

  hideAllSections()
  document.getElementById("search-area").classList.remove("hidden")
  document.getElementById("search-input").focus()
}

function showNotifications() {
  if (!currentUser) return showLogin()

  hideAllSections()
  document.getElementById("notifications-area").classList.remove("hidden")
  loadNotifications()

  // Marcar notificações como lidas
  markNotificationsAsRead()
}

function showMessages() {
  if (!currentUser) return showLogin()

  hideAllSections()
  document.getElementById("messages-area").classList.remove("hidden")
  loadConversations()

  // Resetar contador de mensagens não lidas
  unreadMessages = 0
  updateMessagesBadge()
}

function showUserProfile(userId) {
  if (!currentUser) return showLogin()

  hideAllSections()
  document.getElementById("user-profile-area").classList.remove("hidden")
  loadUserProfileData(userId)
}

function showProfileEdit() {
  // Mostrar modal de edição de perfil
  showModal("Editar Perfil", createProfileEditForm())
}

function showAllFriends() {
  // Mostrar modal com todos os amigos
  showModal("Meus Amigos", createAllFriendsView())
}

function hideAllSections() {
  const sections = [
    "login-form",
    "register-form",
    "profile-setup",
    "content-area",
    "notifications-area",
    "messages-area",
    "user-profile-area",
    "search-area",
    "profiles-area",
  ]

  sections.forEach((section) => {
    document.getElementById(section).classList.add("hidden")
  })
}

// Funções de autenticação com Auth0
async function login() {
  try {
    await auth0Client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: window.location.origin,
      },
    })
  } catch (error) {
    console.error("Erro ao fazer login:", error)
    showAlert("Erro ao fazer login: " + error.message, "error")
  }
}

async function register() {
  try {
    await auth0Client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: window.location.origin,
        screen_hint: "signup",
      },
    })
  } catch (error) {
    console.error("Erro ao registrar:", error)
    showAlert("Erro ao registrar: " + error.message, "error")
  }
}

async function logout() {
  try {
    await auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    })
    currentUser = null
    showAlert("Logout realizado com sucesso!", "success")
    showLogin()
  } catch (error) {
    console.error("Erro ao fazer logout:", error)
    showAlert("Erro ao fazer logout: " + error.message, "error")
  }
}

// Funções de API para CockroachDB
async function apiRequest(endpoint, method = "GET", data = null) {
  const url = `${dbConfig.apiUrl}/${endpoint}`

  try {
    let token = ""

    // Tentar obter o token apenas se o usuário estiver autenticado
    if (auth0Client) {
      try {
        token = await auth0Client.getTokenSilently()
      } catch (tokenError) {
        console.warn("Não foi possível obter o token:", tokenError)
        // Continuar sem token se não for possível obtê-lo
      }
    }

    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    }

    // Adicionar token de autorização se disponível
    if (token) {
      options.headers.Authorization = `Bearer ${token}`
    }

    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(url, options)

    // Tratar erros HTTP
    if (!response.ok) {
      let errorMessage = `Erro na API: ${response.status} ${response.statusText}`

      try {
        const errorData = await response.json()
        if (errorData && errorData.error) {
          errorMessage = errorData.error
        }
      } catch (e) {
        // Ignorar erro ao tentar ler o corpo da resposta
      }

      throw new Error(errorMessage)
    }

    return await response.json()
  } catch (error) {
    console.error(`Erro na requisição para ${url}:`, error)
    throw error
  }
}

// Funções de perfil
async function loadUserProfile() {
  try {
    // Verificar se o usuário já existe no banco de dados
    const userId = currentUser.sub
    let userData

    try {
      userData = await apiRequest(`users/${userId}`)
    } catch (error) {
      // Se o usuário não existir, criar um novo perfil
      if (error.message.includes("404")) {
        userData = {
          id: userId,
          username: currentUser.nickname || currentUser.name || currentUser.email.split("@")[0],
          email: currentUser.email,
          avatar: currentUser.picture || "https://i.imgur.com/oPj4A8u.jpg",
          bio: "",
          school: "Hollywood Arts",
          friends: [],
        }

        await apiRequest("users", "POST", userData)
      } else {
        throw error
      }
    }

    // Atualizar informações do usuário na interface
    document.getElementById("user-name").textContent = userData.username
    document.getElementById("user-avatar").src = userData.avatar
    document.getElementById("user-bio").textContent = userData.bio || "Sem biografia"

    // Esconder botões de autenticação
    document.getElementById("auth-buttons").classList.add("hidden")

    return userData
  } catch (error) {
    console.error("Erro ao carregar perfil:", error)
    showAlert("Erro ao carregar perfil: " + error.message, "error")
    logout()
    throw error
  }
}

// Função para pré-visualizar a imagem de perfil
function previewProfileImage(event) {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      document.getElementById("profile-preview").src = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

// Função para fazer upload da imagem de perfil
async function uploadProfileImage() {
  const fileInput = document.getElementById("profile-image")
  const file = fileInput.files[0]
  const bio = document.getElementById("profile-bio").value
  const school = document.getElementById("profile-school").value

  try {
    let imageUrl = "https://i.imgur.com/oPj4A8u.jpg" // Avatar padrão do Imgur

    // Fazer upload da imagem para o Imgur, se houver
    if (file) {
      showAlert("Fazendo upload da imagem...", "info")
      imageUrl = await uploadToImgur(file)
    }

    // Atualizar o perfil do usuário
    const userId = currentUser.sub
    await apiRequest(`users/${userId}`, "PUT", {
      avatar: imageUrl,
      bio: bio,
      school: school,
    })

    showAlert("Perfil atualizado com sucesso!", "success")
    await loadUserProfile()
    showHome()
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error)
    showAlert("Erro ao atualizar perfil: " + error.message, "error")
  }
}

// Função para carregar dados de um perfil específico
async function loadUserProfileData(userId) {
  try {
    const userData = await apiRequest(`users/${userId}`)

    // Atualizar informações do perfil na interface
    document.getElementById("profile-user-name").textContent = userData.username
    document.getElementById("profile-user-name").dataset.userId = userId
    document.getElementById("profile-user-avatar").src = userData.avatar
    document.getElementById("profile-user-bio").textContent = userData.bio || "Sem biografia"
    document.getElementById("profile-posts-title").textContent = userData.username.toUpperCase()

    // Verificar se é amigo
    const currentUserData = await apiRequest(`users/${currentUser.sub}`)
    const isFriend = currentUserData.friends && currentUserData.friends.includes(userId)
    const isCurrentUser = userId === currentUser.sub

    // Mostrar/esconder botões de amizade
    document.getElementById("add-friend-button").classList.toggle("hidden", isFriend || isCurrentUser)
    document.getElementById("remove-friend-button").classList.toggle("hidden", !isFriend || isCurrentUser)

    // Carregar posts do usuário
    loadUserPosts(userId)
  } catch (error) {
    console.error("Erro ao carregar perfil:", error)
    showAlert("Erro ao carregar perfil: " + error.message, "error")
    showHome()
  }
}

// Funções de posts
async function createPost() {
  const content = document.getElementById("post-content").value
  if (!content.trim()) {
    showAlert("Por favor, escreva algo para publicar", "error")
    return
  }

  const imageInputs = document.querySelectorAll(".post-image-file")
  const moodSelect = document.getElementById("post-mood")
  let mood = ""

  // Verificar se é um humor personalizado
  if (moodSelect.value === "custom") {
    const customText = document.getElementById("custom-mood-text").value
    const customEmoji = document.getElementById("custom-mood-emoji").value

    if (!customText || !customEmoji) {
      showAlert("Por favor, preencha o texto e emoji do seu humor personalizado", "error")
      return
    }

    mood = `${customText} ${customEmoji}`
  } else {
    // Usar o humor pré-definido
    const selectedOption = moodSelect.options[moodSelect.selectedIndex]
    mood = selectedOption.text
  }

  try {
    const imageUrls = []

    // Fazer upload das imagens para o Imgur
    for (const input of imageInputs) {
      if (input.files && input.files[0]) {
        showAlert(`Fazendo upload da imagem ${imageUrls.length + 1}...`, "info")
        const imageUrl = await uploadToImgur(input.files[0])
        imageUrls.push(imageUrl)
      }
    }

    // Obter informações do usuário
    const userData = await loadUserProfile()

    // Criar o post
    const postData = {
      content: content,
      imageUrls: imageUrls,
      userId: currentUser.sub,
      username: userData.username,
      userAvatar: userData.avatar,
      mood: mood,
    }

    await apiRequest("posts", "POST", postData)

    // Limpar o formulário
    document.getElementById("post-content").value = ""
    document.getElementById("post-images-container").innerHTML = `
      <div class="post-image-input">
        <label for="post-image-1" class="file-upload-icon">
          <i class="fas fa-image"></i>
          <span>Imagem 1</span>
          <input type="file" id="post-image-1" accept="image/*" class="hidden post-image-file">
        </label>
        <div class="image-preview" id="preview-1"></div>
      </div>
    `
    document.getElementById("post-image-1").addEventListener("change", (event) => {
      previewImage(event, "preview-1")
    })
    updateImageCounter()

    document.getElementById("post-mood").value = "pumped"
    document.getElementById("custom-mood-container").classList.add("hidden")
    document.getElementById("custom-mood-text").value = ""
    document.getElementById("custom-mood-emoji").value = ""

    showAlert("Post publicado com sucesso!", "success")

    // Notificar amigos
    notifyFriendsAboutNewPost(userData.username)

    // Recarregar o feed
    loadFeed()
  } catch (error) {
    console.error("Erro ao criar post:", error)
    showAlert("Erro ao criar post: " + error.message, "error")
  }
}

// Função para carregar o feed de posts
async function loadFeed() {
  const feedElement = document.getElementById("feed")
  const latestPostElement = document.getElementById("latest-post")

  feedElement.innerHTML = '<div class="loading">Carregando posts...</div>'
  latestPostElement.innerHTML = ""

  try {
    // Obter dados do usuário atual
    const userData = await loadUserProfile()
    const friends = userData.friends || []

    // Incluir o próprio usuário na lista
    const userIds = [currentUser.sub, ...friends]

    // Consultar posts dos amigos e do próprio usuário
    const posts = await apiRequest(`posts?userIds=${userIds.join(",")}`)

    feedElement.innerHTML = ""
    let isFirst = true

    if (posts.length === 0) {
      feedElement.innerHTML =
        '<div class="empty-state">Nenhum post encontrado. Adicione amigos ou crie seu primeiro post!</div>'
      latestPostElement.innerHTML = '<div class="empty-state">Nenhuma atualização recente</div>'
      return
    }

    // Ordenar posts por data (mais recentes primeiro)
    posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    posts.forEach((post) => {
      const postElement = createPostElement(post)

      if (isFirst) {
        latestPostElement.appendChild(postElement.cloneNode(true))
        isFirst = false
      }

      feedElement.appendChild(postElement)
    })
  } catch (error) {
    console.error("Erro ao carregar feed:", error)
    feedElement.innerHTML = '<div class="error-state">Erro ao carregar posts. Tente novamente mais tarde.</div>'
  }
}

// Função para carregar posts de um usuário específico
async function loadUserPosts(userId) {
  const postsElement = document.getElementById("profile-posts")
  postsElement.innerHTML = '<div class="loading">Carregando posts...</div>'

  try {
    const posts = await apiRequest(`posts?userId=${userId}`)

    postsElement.innerHTML = ""

    if (posts.length === 0) {
      postsElement.innerHTML = '<div class="empty-state">Este usuário ainda não publicou nada.</div>'
      return
    }

    // Ordenar posts por data (mais recentes primeiro)
    posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    posts.forEach((post) => {
      const postElement = createPostElement(post)
      postsElement.appendChild(postElement)
    })
  } catch (error) {
    console.error("Erro ao carregar posts do usuário:", error)
    postsElement.innerHTML = '<div class="error-state">Erro ao carregar posts. Tente novamente mais tarde.</div>'
  }
}

// Função para criar elemento de post
function createPostElement(post) {
  const postElement = document.createElement("div")
  postElement.className = "post-item"
  postElement.dataset.postId = post.id

  const postDate = new Date(post.created_at)
  const formattedDate = postDate.toLocaleDateString() + " " + postDate.toLocaleTimeString()

  // Criar HTML para as imagens
  let imagesHTML = ""
  if (post.image_urls && post.image_urls.length > 0) {
    imagesHTML = '<div class="post-images">'
    post.image_urls.forEach((url) => {
      imagesHTML += `<img src="${url}" alt="Imagem do post" class="post-image">`
    })
    imagesHTML += "</div>"
  }

  postElement.innerHTML = `
    <div class="post-header">
      <img src="${post.user_avatar || "https://i.imgur.com/oPj4A8u.jpg"}" alt="Avatar" class="post-avatar" onclick="showUserProfile('${post.user_id}')">
      <div>
        <div class="post-user" onclick="showUserProfile('${post.user_id}')">${post.username || "Usuário"}</div>
        <div class="post-mood">Humor: ${post.mood || "Desconhecido"}</div>
      </div>
    </div>
    <div class="post-content">
      <p>${post.content}</p>
      ${imagesHTML}
    </div>
    <div class="post-footer">
      <div class="post-time">${formattedDate}</div>
      <div class="post-actions">
        <span class="post-action" onclick="likePost('${post.id}')">
          <i class="fas fa-heart"></i> ${post.likes || 0}
        </span>
        <span class="post-action" onclick="showComments('${post.id}')">
          <i class="fas fa-comment"></i> ${post.comments ? post.comments.length : 0}
        </span>
      </div>
    </div>
  `

  return postElement
}

// Função para curtir um post
async function likePost(postId) {
  try {
    // Obter o post atual
    const post = await apiRequest(`posts/${postId}`)

    // Incrementar o número de curtidas
    await apiRequest(`posts/${postId}/like`, "POST")

    // Enviar notificação ao autor do post
    if (post.user_id !== currentUser.sub) {
      const userData = await loadUserProfile()
      createNotification(post.user_id, "like", {
        postId: postId,
        username: userData.username,
      })
    }

    showAlert("Post curtido!", "success")

    // Recarregar o feed para mostrar a atualização
    loadFeed()
  } catch (error) {
    console.error("Erro ao curtir post:", error)
    showAlert("Erro ao curtir post: " + error.message, "error")
  }
}

// Função para mostrar comentários de um post
async function showComments(postId) {
  try {
    // Buscar o post e seus comentários
    const post = await apiRequest(`posts/${postId}`)
    const comments = post.comments || []

    // Criar conteúdo do modal
    const modalContent = document.createElement("div")
    modalContent.className = "comments-container"

    // Adicionar lista de comentários
    const commentsList = document.createElement("div")
    commentsList.className = "comments-list"

    if (comments.length === 0) {
      commentsList.innerHTML = '<div class="empty-state">Nenhum comentário ainda. Seja o primeiro a comentar!</div>'
    } else {
      comments.forEach((comment) => {
        const commentElement = document.createElement("div")
        commentElement.className = "comment-item"
        commentElement.innerHTML = `
          <div class="comment-header">
            <img src="${comment.userAvatar || "https://i.imgur.com/oPj4A8u.jpg"}" alt="Avatar" class="comment-avatar">
            <div class="comment-user">${comment.username}</div>
          </div>
          <div class="comment-content">${comment.content}</div>
          <div class="comment-time">${new Date(comment.timestamp).toLocaleString()}</div>
        `
        commentsList.appendChild(commentElement)
      })
    }

    // Adicionar formulário de comentário
    const commentForm = document.createElement("div")
    commentForm.className = "comment-form"
    commentForm.innerHTML = `
      <textarea id="comment-input" placeholder="Escreva um comentário..."></textarea>
      <button id="submit-comment" class="primary-button">Comentar</button>
    `

    modalContent.appendChild(commentsList)
    modalContent.appendChild(commentForm)

    // Mostrar modal
    showModal("Comentários", modalContent)

    // Adicionar evento ao botão de comentar
    document.getElementById("submit-comment").addEventListener("click", () => {
      addComment(postId)
    })
  } catch (error) {
    console.error("Erro ao carregar comentários:", error)
    showAlert("Erro ao carregar comentários: " + error.message, "error")
  }
}

// Função para adicionar um comentário
async function addComment(postId) {
  const commentInput = document.getElementById("comment-input")
  const content = commentInput.value.trim()

  if (!content) {
    showAlert("Por favor, escreva um comentário", "error")
    return
  }

  try {
    // Obter informações do usuário
    const userData = await loadUserProfile()

    // Adicionar novo comentário
    const newComment = {
      userId: currentUser.sub,
      username: userData.username,
      userAvatar: userData.avatar,
      content: content,
      timestamp: new Date().toISOString(),
    }

    await apiRequest(`posts/${postId}/comments`, "POST", newComment)

    // Obter o post para enviar notificação
    const post = await apiRequest(`posts/${postId}`)

    // Enviar notificação ao autor do post
    if (post.user_id !== currentUser.sub) {
      createNotification(post.user_id, "comment", {
        postId: postId,
        username: userData.username,
      })
    }

    showAlert("Comentário adicionado!", "success")
    closeModal()

    // Recarregar comentários
    showComments(postId)
  } catch (error) {
    console.error("Erro ao adicionar comentário:", error)
    showAlert("Erro ao adicionar comentário: " + error.message, "error")
  }
}

// Funções de amizade
async function loadFriends() {
  const friendsListElement = document.getElementById("friends-list")
  if (!friendsListElement) {
    console.error("Elemento friends-list não encontrado")
    return
  }

  friendsListElement.innerHTML = '<div class="loading">Carregando amigos...</div>'

  try {
    // Obter lista de amigos do usuário
    const userData = await loadUserProfile()
    const friends = userData.friends || []

    if (friends.length === 0) {
      friendsListElement.innerHTML =
        '<div class="empty-state">Você ainda não tem amigos. Explore perfis para encontrar amigos!</div>'
      return
    }

    // Limitar a 6 amigos para exibição
    const displayFriends = friends.slice(0, 6)
    friendsListElement.innerHTML = ""

    // Buscar informações de cada amigo
    for (const friendId of displayFriends) {
      try {
        const friendData = await apiRequest(`users/${friendId}`)

        const friendElement = document.createElement("div")
        friendElement.className = "friend-item"
        friendElement.innerHTML = `
          <img src="${friendData.avatar || "https://i.imgur.com/oPj4A8u.jpg"}" alt="${friendData.username}" class="friend-avatar">
          <div class="friend-name">${friendData.username}</div>
        `

        // Adicionar evento de clique para ver o perfil do amigo
        friendElement.addEventListener("click", () => {
          showUserProfile(friendId)
        })

        friendsListElement.appendChild(friendElement)
      } catch (error) {
        console.error(`Erro ao carregar amigo ${friendId}:`, error)
      }
    }
  } catch (error) {
    console.error("Erro ao carregar amigos:", error)
    friendsListElement.innerHTML = '<div class="error-state">Erro ao carregar amigos. Tente novamente mais tarde.</div>'
  }
}

// Função para adicionar um amigo
async function addFriend() {
  const profileId = document.getElementById("profile-user-name").dataset.userId

  if (!profileId) {
    showAlert("Perfil não encontrado", "error")
    return
  }

  try {
    // Adicionar à lista de amigos
    await apiRequest(`users/${currentUser.sub}/friends`, "POST", { friendId: profileId })

    // Obter informações do usuário atual para notificação
    const userData = await loadUserProfile()

    // Enviar notificação
    createNotification(profileId, "friend", {
      username: userData.username,
    })

    showAlert("Amigo adicionado com sucesso!", "success")

    // Atualizar a interface
    document.getElementById("add-friend-button").classList.add("hidden")
    document.getElementById("remove-friend-button").classList.remove("hidden")

    // Recarregar amigos
    loadFriends()
  } catch (error) {
    console.error("Erro ao adicionar amigo:", error)
    showAlert("Erro ao adicionar amigo: " + error.message, "error")
  }
}

// Função para remover um amigo
async function removeFriend() {
  const profileId = document.getElementById("profile-user-name").dataset.userId

  if (!profileId) {
    showAlert("Perfil não encontrado", "error")
    return
  }

  try {
    await apiRequest(`users/${currentUser.sub}/friends/${profileId}`, "DELETE")

    showAlert("Amigo removido com sucesso!", "success")

    // Atualizar a interface
    document.getElementById("add-friend-button").classList.remove("hidden")
    document.getElementById("remove-friend-button").classList.add("hidden")

    // Recarregar amigos
    loadFriends()
  } catch (error) {
    console.error("Erro ao remover amigo:", error)
    showAlert("Erro ao remover amigo: " + error.message, "error")
  }
}

// Função para carregar perfis populares
async function loadHotPages() {
  const hotPagesElement = document.getElementById("hot-pages")
  hotPagesElement.innerHTML = '<div class="loading">Carregando perfis populares...</div>'

  try {
    // Buscar usuários com mais amigos
    const users = await apiRequest("users/popular")

    if (users.length === 0) {
      hotPagesElement.innerHTML = '<div class="empty-state">Nenhum perfil popular encontrado.</div>'
      return
    }

    hotPagesElement.innerHTML = ""

    users.forEach((userData) => {
      // Não mostrar o usuário atual na lista de populares
      if (userData.id === currentUser.sub) return

      const profileElement = document.createElement("div")
      profileElement.className = "hot-page-item"
      profileElement.innerHTML = `
        <img src="${userData.avatar || "https://i.imgur.com/oPj4A8u.jpg"}" alt="${userData.username}" class="hot-page-avatar">
        <div class="hot-page-name">${userData.username}</div>
      `

      // Adicionar evento de clique para ver o perfil
      profileElement.addEventListener("click", () => {
        showUserProfile(userData.id)
      })

      hotPagesElement.appendChild(profileElement)
    })
  } catch (error) {
    console.error("Erro ao carregar perfis populares:", error)
    hotPagesElement.innerHTML =
      '<div class="error-state">Erro ao carregar perfis populares. Tente novamente mais tarde.</div>'
  }
}

// Função para carregar todos os perfis
async function loadAllProfiles() {
  const profilesElement = document.getElementById("all-profiles")
  profilesElement.innerHTML = '<div class="loading">Carregando perfis...</div>'

  try {
    const users = await apiRequest("users")

    if (users.length === 0) {
      profilesElement.innerHTML = '<div class="empty-state">Nenhum perfil encontrado.</div>'
      return
    }

    profilesElement.innerHTML = ""

    users.forEach((userData) => {
      // Não mostrar o usuário atual na lista
      if (userData.id === currentUser.sub) return

      const profileElement = document.createElement("div")
      profileElement.className = "profile-item"
      profileElement.innerHTML = `
        <img src="${userData.avatar || "https://i.imgur.com/oPj4A8u.jpg"}" alt="${userData.username}" class="profile-item-avatar">
        <div class="profile-item-info">
          <div class="profile-item-name">${userData.username}</div>
          <div class="profile-item-bio">${userData.bio || "Sem biografia"}</div>
          <button class="secondary-button">Ver Perfil</button>
        </div>
      `

      // Adicionar evento de clique para ver o perfil
      profileElement.querySelector("button").addEventListener("click", () => {
        showUserProfile(userData.id)
      })

      profilesElement.appendChild(profileElement)
    })
  } catch (error) {
    console.error("Erro ao carregar perfis:", error)
    profilesElement.innerHTML = '<div class="error-state">Erro ao carregar perfis. Tente novamente mais tarde.</div>'
  }
}

// Funções de notificação
async function createNotification(userId, type, data) {
  try {
    // Criar notificação no banco de dados
    await apiRequest("notifications", "POST", {
      userId: userId,
      type: type,
      data: data,
      read: false,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Erro ao criar notificação:", error)
  }
}

// Função para notificar amigos sobre novo post
async function notifyFriendsAboutNewPost(username) {
  try {
    // Obter lista de amigos do usuário
    const userData = await loadUserProfile()
    const friends = userData.friends || []

    // Enviar notificação para cada amigo
    for (const friendId of friends) {
      createNotification(friendId, "post", {
        username: username,
      })
    }
  } catch (error) {
    console.error("Erro ao notificar amigos:", error)
  }
}

// Função para carregar notificações
async function loadNotifications() {
  const notificationsElement = document.getElementById("notifications-list")
  notificationsElement.innerHTML = '<div class="loading">Carregando notificações...</div>'

  try {
    const notifications = await apiRequest(`notifications?userId=${currentUser.sub}`)

    notificationsElement.innerHTML = ""

    if (notifications.length === 0) {
      notificationsElement.innerHTML = '<div class="empty-state">Nenhuma notificação encontrada.</div>'
      return
    }

    // Ordenar notificações por data (mais recentes primeiro)
    notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    notifications.forEach((notification) => {
      const notificationElement = createNotificationElement(notification)
      notificationsElement.appendChild(notificationElement)
    })
  } catch (error) {
    console.error("Erro ao carregar notificações:", error)
    notificationsElement.innerHTML =
      '<div class="error-state">Erro ao carregar notificações. Tente novamente mais tarde.</div>'
  }
}

// Função para criar elemento de notificação
function createNotificationElement(notification) {
  const notificationElement = document.createElement("div")
  notificationElement.className = "notification-item"
  if (!notification.read) {
    notificationElement.classList.add("unread")
  }

  const notificationDate = new Date(notification.created_at)
  const formattedDate = notificationDate.toLocaleDateString() + " " + notificationDate.toLocaleTimeString()

  // Garantir que data seja um objeto
  const data = typeof notification.data === "string" ? JSON.parse(notification.data) : notification.data

  let notificationText = ""
  let actionButton = ""

  switch (notification.type) {
    case "like":
      notificationText = `${data.username} curtiu seu post.`
      actionButton = `<button class="text-button" onclick="showPost('${data.postId}')">Ver Post</button>`
      break
    case "comment":
      notificationText = `${data.username} comentou em seu post.`
      actionButton = `<button class="text-button" onclick="showPost('${data.postId}')">Ver Post</button>`
      break
    case "friend":
      notificationText = `${data.username} adicionou você como amigo.`
      actionButton = `<button class="text-button" onclick="showUserProfileByUsername('${data.username}')">Ver Perfil</button>`
      break
    case "post":
      notificationText = `${data.username} fez uma nova publicação.`
      actionButton = `<button class="text-button" onclick="showUserProfileByUsername('${data.username}')">Ver Perfil</button>`
      break
    case "message":
      notificationText = `${data.username} enviou uma mensagem para você.`
      actionButton = `<button class="text-button" onclick="showConversation('${data.conversationId}')">Ver Mensagem</button>`
      break
    default:
      notificationText = "Nova notificação."
  }

  notificationElement.innerHTML = `
    <div class="notification-content">
      <div class="notification-text">${notificationText}</div>
      <div class="notification-time">${formattedDate}</div>
    </div>
    <div class="notification-actions">
      ${actionButton}
    </div>
  `

  return notificationElement
}

// Função para marcar notificações como lidas
async function markNotificationsAsRead() {
  try {
    await apiRequest(`notifications/markAsRead?userId=${currentUser.sub}`, "PUT")

    // Atualizar contador de notificações
    unreadNotifications = 0
    updateNotificationBadge()
  } catch (error) {
    console.error("Erro ao marcar notificações como lidas:", error)
  }
}

// Função para atualizar o contador de notificações
async function updateNotificationBadge() {
  try {
    // Contar notificações não lidas
    const unreadCount = await apiRequest(`notifications/unread?userId=${currentUser.sub}`)
    unreadNotifications = unreadCount.count

    // Atualizar badge
    const badge = document.getElementById("notifications-badge")
    badge.textContent = unreadNotifications
    badge.style.display = unreadNotifications > 0 ? "inline" : "none"
  } catch (error) {
    console.error("Erro ao contar notificações:", error)
  }
}

// Funções de mensagem
async function loadConversations() {
  const conversationsElement = document.getElementById("conversations-list")
  conversationsElement.innerHTML = '<div class="loading">Carregando conversas...</div>'

  try {
    const conversations = await apiRequest(`conversations?userId=${currentUser.sub}`)

    conversationsElement.innerHTML = ""

    if (conversations.length === 0) {
      conversationsElement.innerHTML =
        '<div class="empty-state">Nenhuma conversa encontrada. Inicie uma conversa com um amigo!</div>'
      return
    }

    // Ordenar conversas por data da última mensagem (mais recentes primeiro)
    conversations.sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time))

    for (const conversation of conversations) {
      // Encontrar o outro participante
      const otherUserId = conversation.participants.find((id) => id !== currentUser.sub)

      // Buscar informações do outro usuário
      try {
        const userData = await apiRequest(`users/${otherUserId}`)

        const conversationElement = document.createElement("div")
        conversationElement.className = "conversation-item"
        conversationElement.dataset.conversationId = conversation.id
        conversationElement.dataset.userId = otherUserId

        conversationElement.innerHTML = `
          <img src="${userData.avatar || "https://i.imgur.com/oPj4A8u.jpg"}" alt="${userData.username}" class="conversation-avatar">
          <div class="conversation-info">
            <div class="conversation-name">${userData.username}</div>
            <div class="conversation-preview">${conversation.last_message || "Iniciar conversa"}</div>
          </div>
        `

        // Adicionar evento de clique para abrir a conversa
        conversationElement.addEventListener("click", () => {
          openConversation(conversation.id, otherUserId, userData.username, userData.avatar)
        })

        conversationsElement.appendChild(conversationElement)
      } catch (error) {
        console.error(`Erro ao carregar usuário ${otherUserId}:`, error)
      }
    }
  } catch (error) {
    console.error("Erro ao carregar conversas:", error)
    conversationsElement.innerHTML =
      '<div class="error-state">Erro ao carregar conversas. Tente novamente mais tarde.</div>'
  }
}

// Função para iniciar uma conversa
async function startConversation() {
  const profileId = document.getElementById("profile-user-name").dataset.userId

  if (!profileId) {
    showAlert("Perfil não encontrado", "error")
    return
  }

  try {
    // Verificar se já existe uma conversa
    const conversations = await apiRequest(`conversations?userId=${currentUser.sub}`)
    let existingConversation = null

    for (const conversation of conversations) {
      if (conversation.participants.includes(profileId)) {
        existingConversation = conversation.id
        break
      }
    }

    if (existingConversation) {
      // Abrir conversa existente
      showMessages()
      setTimeout(() => {
        const conversationElement = document.querySelector(`[data-conversation-id="${existingConversation}"]`)
        if (conversationElement) {
          conversationElement.click()
        }
      }, 500)
    } else {
      // Criar nova conversa
      const newConversation = await apiRequest("conversations", "POST", {
        participants: [currentUser.sub, profileId],
        lastMessage: "",
        lastMessageTime: new Date().toISOString(),
      })

      showMessages()

      // Buscar informações do outro usuário
      const userData = await apiRequest(`users/${profileId}`)

      setTimeout(() => {
        openConversation(newConversation.id, profileId, userData.username, userData.avatar)
      }, 500)
    }
  } catch (error) {
    console.error("Erro ao iniciar conversa:", error)
    showAlert("Erro ao iniciar conversa: " + error.message, "error")
  }
}

// Função para abrir uma conversa
function openConversation(conversationId, userId, username, avatar) {
  currentConversation = conversationId

  // Atualizar cabeçalho da conversa
  const messagesHeader = document.getElementById("messages-header")
  messagesHeader.innerHTML = `
    <div class="conversation-header">
      <img src="${avatar || "https://i.imgur.com/oPj4A8u.jpg"}" alt="${username}" class="conversation-avatar">
      <h3>${username}</h3>
    </div>
  `

  // Mostrar formulário de mensagem
  document.getElementById("message-form").classList.remove("hidden")

  // Destacar conversa selecionada
  const conversationItems = document.querySelectorAll(".conversation-item")
  conversationItems.forEach((item) => {
    item.classList.remove("active")
  })

  const selectedConversation = document.querySelector(`[data-conversation-id="${conversationId}"]`)
  if (selectedConversation) {
    selectedConversation.classList.add("active")
  }

  // Carregar mensagens
  loadMessages(conversationId)
}

// Função para carregar mensagens
async function loadMessages(conversationId) {
  const messagesElement = document.getElementById("messages-list")
  messagesElement.innerHTML = '<div class="loading">Carregando mensagens...</div>'

  try {
    const messages = await apiRequest(`conversations/${conversationId}/messages`)

    messagesElement.innerHTML = ""

    if (messages.length === 0) {
      messagesElement.innerHTML = '<div class="empty-state">Nenhuma mensagem ainda. Comece a conversa!</div>'
      return
    }

    // Ordenar mensagens por data (mais antigas primeiro)
    messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    messages.forEach((message) => {
      const messageElement = document.createElement("div")
      messageElement.className = "message-item"

      // Verificar se a mensagem é do usuário atual
      if (message.sender_id === currentUser.sub) {
        messageElement.classList.add("message-sent")
      } else {
        messageElement.classList.add("message-received")
      }

      const messageDate = new Date(message.created_at)
      const formattedTime = messageDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

      messageElement.innerHTML = `
        <div class="message-text">${message.content}</div>
        <div class="message-time">${formattedTime}</div>
      `

      messagesElement.appendChild(messageElement)
    })

    // Rolar para a última mensagem
    messagesElement.scrollTop = messagesElement.scrollHeight

    // Marcar mensagens como lidas
    await apiRequest(`conversations/${conversationId}/messages/markAsRead`, "PUT", {
      userId: currentUser.sub,
    })

    // Atualizar contador de mensagens
    updateMessagesBadge()
  } catch (error) {
    console.error("Erro ao carregar mensagens:", error)
    messagesElement.innerHTML = '<div class="error-state">Erro ao carregar mensagens. Tente novamente mais tarde.</div>'
  }
}

// Função para enviar mensagem
async function sendMessage() {
  if (!currentConversation) {
    showAlert("Nenhuma conversa selecionada", "error")
    return
  }

  const messageInput = document.getElementById("message-input")
  const content = messageInput.value.trim()

  if (!content) {
    showAlert("Por favor, escreva uma mensagem", "error")
    return
  }

  try {
    // Adicionar mensagem à conversa
    const newMessage = {
      senderId: currentUser.sub,
      content: content,
      timestamp: new Date().toISOString(),
    }

    await apiRequest(`conversations/${currentConversation}/messages`, "POST", newMessage)

    // Atualizar última mensagem na conversa
    await apiRequest(`conversations/${currentConversation}`, "PUT", {
      lastMessage: content,
      lastMessageTime: new Date().toISOString(),
    })

    // Limpar campo de mensagem
    messageInput.value = ""

    // Obter a conversa para enviar notificação
    const conversation = await apiRequest(`conversations/${currentConversation}`)
    const recipientId = conversation.participants.find((id) => id !== currentUser.sub)

    // Obter informações do usuário
    const userData = await loadUserProfile()

    // Enviar notificação ao destinatário
    createNotification(recipientId, "message", {
      username: userData.username,
      conversationId: currentConversation,
    })

    // Recarregar mensagens
    loadMessages(currentConversation)
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error)
    showAlert("Erro ao enviar mensagem: " + error.message, "error")
  }
}

// Função para atualizar o contador de mensagens
async function updateMessagesBadge() {
  try {
    // Contar mensagens não lidas
    const unreadCount = await apiRequest(`conversations/unread?userId=${currentUser.sub}`)
    unreadMessages = unreadCount.count

    // Atualizar badge
    const badge = document.getElementById("messages-badge")
    badge.textContent = unreadMessages
    badge.style.display = unreadMessages > 0 ? "inline" : "none"
  } catch (error) {
    console.error("Erro ao contar mensagens:", error)
  }
}

// Função para realizar busca
async function performSearch(query) {
  const resultsElement = document.getElementById("search-results")
  resultsElement.innerHTML = '<div class="loading">Buscando...</div>'

  try {
    // Buscar usuários
    const users = await apiRequest(`users/search?query=${encodeURIComponent(query)}`)

    resultsElement.innerHTML = ""

    if (users.length === 0) {
      resultsElement.innerHTML = '<div class="empty-state">Nenhum resultado encontrado para "' + query + '".</div>'
      return
    }

    users.forEach((userData) => {
      const resultElement = document.createElement("div")
      resultElement.className = "search-result-item"
      resultElement.innerHTML = `
        <img src="${userData.avatar || "https://i.imgur.com/oPj4A8u.jpg"}" alt="${userData.username}" class="search-result-image">
        <div class="search-result-info">
          <div class="search-result-title">${userData.username}</div>
          <div class="search-result-description">${userData.bio || "Sem biografia"}</div>
          <button class="secondary-button">Ver Perfil</button>
        </div>
      `

      // Adicionar evento de clique para ver o perfil
      resultElement.querySelector("button").addEventListener("click", () => {
        showUserProfile(userData.id)
      })

      resultsElement.appendChild(resultElement)
    })
  } catch (error) {
    console.error("Erro ao realizar busca:", error)
    resultsElement.innerHTML = '<div class="error-state">Erro ao realizar busca. Tente novamente mais tarde.</div>'
  }
}

// Função para mostrar um fato divertido aleatório
function showRandomFunFact() {
  const funFactElement = document.getElementById("fun-fact")
  const randomIndex = Math.floor(Math.random() * funFacts.length)
  funFactElement.textContent = funFacts[randomIndex]
}

// Funções de modal
function showModal(title, content) {
  document.getElementById("modal-title").textContent = title

  const modalContent = document.getElementById("modal-content")
  modalContent.innerHTML = ""

  if (typeof content === "string") {
    modalContent.innerHTML = content
  } else {
    modalContent.appendChild(content)
  }

  document.getElementById("modal-overlay").classList.remove("hidden")
}

function closeModal() {
  document.getElementById("modal-overlay").classList.add("hidden")
}

// Função para criar formulário de edição de perfil
function createProfileEditForm() {
  const formElement = document.createElement("div")
  formElement.className = "profile-edit-form"
  formElement.innerHTML = '<div class="loading">Carregando dados do perfil...</div>'

  // Buscar dados atuais do usuário
  apiRequest(`users/${currentUser.sub}`)
    .then((userData) => {
      formElement.innerHTML = `
        <div class="avatar-upload">
          <img id="edit-profile-preview" src="${userData.avatar}" alt="Avatar Preview" class="avatar-preview">
          <label for="edit-profile-image" class="file-upload-label">Escolher Foto</label>
          <input type="file" id="edit-profile-image" accept="image/*" class="hidden">
        </div>
        <div class="form-group">
          <label for="edit-profile-bio">Sobre Você</label>
          <textarea id="edit-profile-bio">${userData.bio || ""}</textarea>
        </div>
        <div class="form-group">
          <label for="edit-profile-school">Escola</label>
          <input type="text" id="edit-profile-school" value="${userData.school || ""}">
        </div>
        <button id="save-profile-button" class="primary-button">Salvar Alterações</button>
      `

      // Adicionar evento para pré-visualizar imagem
      formElement.querySelector("#edit-profile-image").addEventListener("change", (event) => {
        const file = event.target.files[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (e) => {
            document.getElementById("edit-profile-preview").src = e.target.result
          }
          reader.readAsDataURL(file)
        }
      })

      // Adicionar evento para salvar alterações
      formElement.querySelector("#save-profile-button").addEventListener("click", updateProfile)
    })
    .catch((error) => {
      console.error("Erro ao carregar dados do perfil:", error)
      formElement.innerHTML =
        '<div class="error-state">Erro ao carregar dados do perfil. Tente novamente mais tarde.</div>'
    })

  return formElement
}

// Função para atualizar perfil
async function updateProfile() {
  const fileInput = document.getElementById("edit-profile-image")
  const file = fileInput.files[0]
  const bio = document.getElementById("edit-profile-bio").value
  const school = document.getElementById("edit-profile-school").value

  try {
    const updateData = {
      bio: bio,
      school: school,
    }

    // Fazer upload da imagem para o Imgur, se houver
    if (file) {
      showAlert("Fazendo upload da imagem...", "info")
      const imageUrl = await uploadToImgur(file)
      updateData.avatar = imageUrl
    }

    // Atualizar o perfil do usuário
    await apiRequest(`users/${currentUser.sub}`, "PUT", updateData)

    showAlert("Perfil atualizado com sucesso!", "success")
    closeModal()
    await loadUserProfile()
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error)
    showAlert("Erro ao atualizar perfil: " + error.message, "error")
  }
}

// Função para criar visualização de todos os amigos
function createAllFriendsView() {
  const viewElement = document.createElement("div")
  viewElement.className = "all-friends-view"
  viewElement.innerHTML = '<div class="loading">Carregando amigos...</div>'

  // Buscar lista de amigos do usuário
  apiRequest(`users/${currentUser.sub}`)
    .then(async (userData) => {
      const friends = userData.friends || []

      if (friends.length === 0) {
        viewElement.innerHTML =
          '<div class="empty-state">Você ainda não tem amigos. Explore perfis para encontrar amigos!</div>'
        return
      }

      // Criar grid de amigos
      const friendsGrid = document.createElement("div")
      friendsGrid.className = "friends-grid-full"

      // Buscar informações de cada amigo
      for (const friendId of friends) {
        try {
          const friendData = await apiRequest(`users/${friendId}`)

          const friendElement = document.createElement("div")
          friendElement.className = "friend-item-full"
          friendElement.innerHTML = `
            <img src="${friendData.avatar || "https://i.imgur.com/oPj4A8u.jpg"}" alt="${friendData.username}" class="friend-avatar-full">
            <div class="friend-info">
              <div class="friend-name-full">${friendData.username}</div>
              <div class="friend-bio">${friendData.bio || "Sem biografia"}</div>
              <button class="secondary-button">Ver Perfil</button>
            </div>
          `

          // Adicionar evento de clique para ver o perfil do amigo
          friendElement.querySelector("button").addEventListener("click", () => {
            closeModal()
            showUserProfile(friendId)
          })

          friendsGrid.appendChild(friendElement)
        } catch (error) {
          console.error(`Erro ao carregar amigo ${friendId}:`, error)
        }
      }

      viewElement.innerHTML = ""
      viewElement.appendChild(friendsGrid)
    })
    .catch((error) => {
      console.error("Erro ao carregar amigos:", error)
      viewElement.innerHTML = '<div class="error-state">Erro ao carregar amigos. Tente novamente mais tarde.</div>'
    })

  return viewElement
}

// Função para mostrar alerta
function showAlert(message, type = "info") {
  // Criar elemento de alerta
  const alertElement = document.createElement("div")
  alertElement.className = `alert alert-${type}`
  alertElement.textContent = message

  // Adicionar ao corpo do documento
  document.body.appendChild(alertElement)

  // Remover após alguns segundos
  setTimeout(() => {
    alertElement.classList.add("alert-hide")
    setTimeout(() => {
      document.body.removeChild(alertElement)
    }, 300)
  }, 3000)
}

// Função auxiliar para buscar usuário por nome de usuário
async function showUserProfileByUsername(username) {
  try {
    const users = await apiRequest(`users/search?query=${encodeURIComponent(username)}`)

    if (users.length === 0) {
      showAlert("Usuário não encontrado", "error")
      return
    }

    // Encontrar o usuário com o nome de usuário exato
    const user = users.find((u) => u.username === username)

    if (user) {
      showUserProfile(user.id)
    } else {
      // Se não encontrar o usuário exato, mostrar o primeiro resultado
      showUserProfile(users[0].id)
    }
  } catch (error) {
    console.error("Erro ao buscar usuário:", error)
    showAlert("Erro ao buscar usuário: " + error.message, "error")
  }
}

// Função para mostrar um post específico
async function showPost(postId) {
  try {
    const post = await apiRequest(`posts/${postId}`)

    // Criar conteúdo do modal
    const modalContent = document.createElement("div")
    modalContent.className = "post-detail"

    const postElement = createPostElement(post)
    modalContent.appendChild(postElement)

    // Adicionar seção de comentários
    const commentsSection = document.createElement("div")
    commentsSection.className = "comments-section"
    commentsSection.innerHTML = "<h4>Comentários</h4>"

    const commentsList = document.createElement("div")
    commentsList.className = "comments-list"

    const comments = post.comments || []

    if (comments.length === 0) {
      commentsList.innerHTML = '<div class="empty-state">Nenhum comentário ainda. Seja o primeiro a comentar!</div>'
    } else {
      comments.forEach((comment) => {
        const commentElement = document.createElement("div")
        commentElement.className = "comment-item"
        commentElement.innerHTML = `
          <div class="comment-header">
            <img src="${comment.userAvatar || "https://i.imgur.com/oPj4A8u.jpg"}" alt="Avatar" class="comment-avatar">
            <div class="comment-user">${comment.username}</div>
          </div>
          <div class="comment-content">${comment.content}</div>
          <div class="comment-time">${new Date(comment.timestamp).toLocaleString()}</div>
        `
        commentsList.appendChild(commentElement)
      })
    }

    commentsSection.appendChild(commentsList)

    // Adicionar formulário de comentário
    const commentForm = document.createElement("div")
    commentForm.className = "comment-form"
    commentForm.innerHTML = `
      <textarea id="comment-input" placeholder="Escreva um comentário..."></textarea>
      <button id="submit-comment" class="primary-button">Comentar</button>
    `

    commentsSection.appendChild(commentForm)
    modalContent.appendChild(commentsSection)

    // Mostrar modal
    showModal("Post", modalContent)

    // Adicionar evento ao botão de comentar
    document.getElementById("submit-comment").addEventListener("click", () => {
      addComment(postId)
    })
  } catch (error) {
    console.error("Erro ao carregar post:", error)
    showAlert("Erro ao carregar post: " + error.message, "error")
  }
}

// Função para mostrar conversa específica
async function showConversation(conversationId) {
  showMessages()

  try {
    const conversation = await apiRequest(`conversations/${conversationId}`)

    const otherUserId = conversation.participants.find((id) => id !== currentUser.sub)

    // Buscar informações do outro usuário
    const userData = await apiRequest(`users/${otherUserId}`)

    // Abrir conversa
    setTimeout(() => {
      openConversation(conversationId, otherUserId, userData.username, userData.avatar)
    }, 500)
  } catch (error) {
    console.error("Erro ao carregar conversa:", error)
    showAlert("Erro ao carregar conversa: " + error.message, "error")
  }
}

// Import Auth0
import { createAuth0Client } from "@auth0/auth0-spa-js"
