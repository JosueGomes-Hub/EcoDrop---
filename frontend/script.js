const API = window.location.port === "5000"
  ? window.location.origin
  : `${window.location.protocol}//${window.location.hostname}:5000`;
const STORAGE_TOKEN_KEY = "ecodrop_token";
const STORAGE_USER_KEY = "ecodrop_user";
const STORAGE_PROFILE_PHOTO_PREFIX = "ecodrop_profile_photo_";
const MAX_PROFILE_PHOTO_SIZE = 2 * 1024 * 1024;

const DEFAULT_POINTS = {
  "ecoponto-central": {
    slug: "ecoponto-central",
    name: "EcoPonto Central",
    address: "Av. Eduardo Ribeiro, 520 — Manaus",
    materials: ["Plástico", "Papel", "Metal"],
    distance: "0,3 km",
    status: "Aberto",
  },
  "coleta-norte": {
    slug: "coleta-norte",
    name: "Coleta Norte",
    address: "R. Recife, 230 — Manaus",
    materials: ["Vidro", "Plástico"],
    distance: "0,8 km",
    status: "Aberto",
  },
  "ponto-eletronico-sul": {
    slug: "ponto-eletronico-sul",
    name: "Ponto Eletrônico Sul",
    address: "Av. Constantino Nery, 1200 — Manaus",
    materials: ["Eletrônico", "Bateria"],
    distance: "1,2 km",
    status: "Aberto",
  },
  "ecoponto-leste": {
    slug: "ecoponto-leste",
    name: "EcoPonto Leste",
    address: "R. Belo Horizonte, 88 — Manaus",
    materials: ["Plástico", "Papel"],
    distance: "1,9 km",
    status: "Aberto",
  },
  "shopping-coleta": {
    slug: "shopping-coleta",
    name: "Shopping Coleta",
    address: "Shopping Manauara — Piso G1",
    materials: ["Metal", "Vidro", "Plástico"],
    distance: "2,4 km",
    status: "Aberto",
  },
};

const MISSION_DETAILS = {
  "plastico-2kg": {
    tag: "♻️ Missão de Material",
    title: "Recicle 2kg de Plástico",
    description: "Acumule 2kg de plástico confirmado para desbloquear bônus direto na sua carteira.",
    materials: ["Plástico", "Garrafas PET", "Embalagens"],
    pointSlug: "ecoponto-central",
    icon: "♻️",
    background: "#e8f5ee",
  },
  "vidro-1kg": {
    tag: "🔵 Missão de Bônus",
    title: "Levar Vidro ao Ponto",
    description: "Faça sua primeira entrega de vidro no ponto e receba um bônus especial do mês.",
    materials: ["Vidro", "Garrafas", "Potes"],
    pointSlug: "coleta-norte",
    icon: "🔵",
    background: "#e3f4fb",
  },
  "eletronico-3-itens": {
    tag: "🔋 Missão Especial",
    title: "Descarte Eletrônico",
    description: "Entregue 3 itens eletrônicos para liberar recompensa extra e subir de nível mais rápido.",
    materials: ["Eletrônico", "Bateria", "Acessórios"],
    pointSlug: "ponto-eletronico-sul",
    icon: "🔋",
    background: "#fdf0e6",
  },
};

let usuarioLogado = null;
let toastTimeout = null;
let agendaAtual = null;
let slotSelecionado = null;
let collectionPointsCache = { ...DEFAULT_POINTS };
let partnersCache = [];
let appointmentsCache = [];
let deliveriesCache = [];
let operatorPendingCache = [];
let missionsCache = [];
let selectedTicketId = null;
let selectedOperatorDeliveryId = null;

function getStoredToken() {
  return localStorage.getItem(STORAGE_TOKEN_KEY);
}

function saveSession(token, user) {
  localStorage.setItem(STORAGE_TOKEN_KEY, token);
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
}

function getProfilePhotoKey(user = usuarioLogado || getStoredUser()) {
  return `${STORAGE_PROFILE_PHOTO_PREFIX}${user?.id || "guest"}`;
}

function getStoredUser() {
  const rawValue = localStorage.getItem(STORAGE_USER_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    clearSession();
    return null;
  }
}

async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getStoredToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  const hasJsonBody = response.headers.get("content-type")?.includes("application/json");
  const payload = hasJsonBody ? await response.json() : null;

  if (!response.ok) {
    throw payload?.error || payload || { message: "Erro inesperado na API." };
  }

  return payload?.data ?? payload;
}

function apiGet(path) {
  return apiRequest(path);
}

function apiPost(path, data) {
  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

function apiPut(path, data) {
  return apiRequest(path, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

function apiPatch(path, data) {
  return apiRequest(path, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

function resolveErrorMessage(error, fallbackMessage) {
  return error?.message || error?.error?.message || fallbackMessage;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value) {
  if (!value) {
    return "Agora";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "Não informado";
  }

  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }

  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }

  return value;
}

function formatCep(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "Não informado";
  }

  if (digits.length === 8) {
    return digits.replace(/(\d{5})(\d{3})/, "$1-$2");
  }

  return value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function canOperate(user = usuarioLogado || getStoredUser()) {
  return ["operator", "admin"].includes(user?.role);
}

function updateRoleActions(user = usuarioLogado || getStoredUser()) {
  const operatorCard = document.getElementById("atend-operator-card");

  if (operatorCard) {
    operatorCard.style.display = canOperate(user) ? "flex" : "none";
  }
}

function getStatusLabel(status) {
  return {
    pending_confirmation: "Aguardando revisão",
    confirmed: "Confirmada",
    rejected: "Rejeitada",
    cancelled: "Cancelada",
    generated: "Gerado",
    used: "Utilizado",
    expired: "Expirado",
    open: "Aberto",
    in_progress: "Em andamento",
    resolved: "Resolvido",
    closed: "Encerrado",
    completed: "Concluída",
    scheduled: "Agendada",
    checked_in: "Check-in",
    missed: "Não compareceu",
  }[status] || status;
}

function getPriorityLabel(priority) {
  return {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
  }[priority] || priority;
}

function getMissionRewardLabel(mission) {
  if (mission.rewardType === "xp") {
    return `+${Number(mission.rewardValue || 0).toLocaleString("pt-BR")} XP`;
  }

  return `+R$${formatCurrency(mission.rewardValue)}`;
}

function getLevelLabel(user) {
  return `Nível ${user.nivel} · ${user.levelTitle} 🌿`;
}

function updateProfilePhoto(user = usuarioLogado || getStoredUser()) {
  const avatar = document.getElementById("profile-photo-preview")?.parentElement;
  const preview = document.getElementById("profile-photo-preview");
  const removeButton = document.getElementById("profile-photo-remove");

  if (!avatar || !preview) {
    return;
  }

  const photo = localStorage.getItem(getProfilePhotoKey(user));

  if (photo) {
    preview.src = photo;
    avatar.classList.add("has-photo");
  } else {
    preview.removeAttribute("src");
    avatar.classList.remove("has-photo");
  }

  if (removeButton) {
    removeButton.disabled = !photo;
  }
}

function openProfilePhotoPicker() {
  if (!getProfileFormUser()) {
    showToast("Faça login para alterar sua foto.");
    goTo("login");
    return;
  }

  document.getElementById("profile-photo-input")?.click();
}

function alterarFotoPerfil(event) {
  const input = event.target;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    showToast("Escolha um arquivo de imagem.");
    input.value = "";
    return;
  }

  if (file.size > MAX_PROFILE_PHOTO_SIZE) {
    showToast("Escolha uma imagem de até 2 MB.");
    input.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    localStorage.setItem(getProfilePhotoKey(), reader.result);
    updateProfilePhoto();
    input.value = "";
    showToast("Foto de perfil atualizada.");
  };

  reader.onerror = () => {
    input.value = "";
    showToast("Não foi possível carregar a imagem.");
  };

  reader.readAsDataURL(file);
}

function removerFotoPerfil() {
  localStorage.removeItem(getProfilePhotoKey());
  updateProfilePhoto();
  showToast("Foto de perfil removida.");
}

function updateHome(user) {
  document.getElementById("home-nome").innerText = user.nome;
  document.getElementById("saldo-h").innerText = formatCurrency(user.saldo);
  document.getElementById("home-summary").innerText = `Saldo pronto para uso · Nível ${user.nivel} 🌿`;
  document.getElementById("stat-entregas").innerText = user.metrics?.deliveries ?? 0;
  document.getElementById("stat-reciclado").innerText = `${Number(user.metrics?.recycledAmount || 0).toLocaleString("pt-BR")} kg`;
  document.getElementById("stat-nivel").innerText = user.nivel;
}

function updateProfile(user) {
  const fullName = `${user.nome} ${user.sobrenome}`.trim();

  document.getElementById("perf-nome").innerText = user.nome;
  document.getElementById("perf-nivel").innerText = getLevelLabel(user);
  document.getElementById("p-nome").innerText = fullName;
  document.getElementById("p-email").innerText = user.email;
  document.getElementById("p-tel").innerText = formatPhone(user.telefone);
  document.getElementById("p-cep").innerText = formatCep(user.cep);
  document.getElementById("p-cid").innerText = `${user.cidade || "Cidade"} — ${user.estado || "UF"}`;
  updateProfilePhoto(user);
}

function renderHomeMissions(missions) {
  const container = document.getElementById("home-missions");

  if (!container) {
    return;
  }

  if (!missions.length) {
    container.innerHTML = '<div class="empty-state">Nenhuma missão ativa disponível no momento.</div>';
    return;
  }

  container.innerHTML = missions
    .map((mission) => {
      const missionMeta = MISSION_DETAILS[mission.slug] || {};
      const progressPercent = mission.targetQuantity
        ? Math.max(0, Math.min(100, Math.round((Number(mission.progress || 0) / Number(mission.targetQuantity || 1)) * 100)))
        : 0;
      const progressText = mission.status === "completed"
        ? "Meta concluída com sucesso"
        : `${Number(mission.progress || 0).toLocaleString("pt-BR")} / ${Number(mission.targetQuantity || 0).toLocaleString("pt-BR")} concluídos`;

      return `
        <div class="mc" onclick="openMissao('${mission.slug}')">
          <div class="mi" style="background:${missionMeta.background || "#e8f5ee"}">${missionMeta.icon || "🎯"}</div>
          <div class="minfo">
            <h3>${escapeHtml(mission.title)}</h3>
            <div class="pb"><div class="pf" style="width:${progressPercent}%"></div></div>
            <p>${escapeHtml(progressText)}</p>
          </div>
          <div class="mpts">${escapeHtml(getMissionRewardLabel(mission))}</div>
        </div>
      `;
    })
    .join("");
}

function renderTransactions(transactions) {
  const historyContainer = document.getElementById("wallet-history");

  if (!transactions.length) {
    historyContainer.innerHTML = `
      <div class="sec-t">📋 Histórico de Transações</div>
      <div class="empty-state">Ainda não há transações registradas na sua carteira.</div>
    `;
    return;
  }

  const items = transactions
    .map((transaction) => {
      const isPositive = transaction.value >= 0;
      const signalClass = isPositive ? "plus" : "minus";
      const icon = transaction.origin === "delivery" ? "♻️" : transaction.origin === "bonus" ? "🏆" : "🏪";

      return `
        <div class="hi">
          <div class="hico" style="background:${isPositive ? "#e8f5ee" : "#fff3e0"}">${icon}</div>
          <div class="hinfo">
            <h4>${transaction.description}</h4>
            <p>${formatDateTime(transaction.createdAt)} · ${transaction.type === "credit" || transaction.type === "bonus" ? "Crédito confirmado" : "Débito realizado"}</p>
          </div>
          <div class="hval ${signalClass}">${isPositive ? "+" : "-"}R$${formatCurrency(Math.abs(transaction.value))}</div>
        </div>
      `;
    })
    .join("");

  historyContainer.innerHTML = `<div class="sec-t">📋 Histórico de Transações</div>${items}`;
}

function updateWallet(wallet) {
  document.getElementById("saldo-c").innerText = formatCurrency(wallet.balance);
  document.getElementById("wallet-summary").innerText = `Cartão virtual ativo · Nível ${wallet.level} 🌿`;
  document.getElementById("wallet-level-title").innerText = `🌿 Nível ${wallet.level} — ${wallet.levelTitle}`;
  document.getElementById("wallet-level-progress").innerText = `${wallet.progressPercent}%`;
  document.getElementById("wallet-level-bar").style.width = `${wallet.progressPercent}%`;

  document.getElementById("wallet-level-description").innerText = wallet.nextLevelXp
    ? `${wallet.xpToNextLevel} XP para chegar ao próximo nível e desbloquear novos benefícios.`
    : "Você já está no nível máximo atual do MVP.";

  document.getElementById("saldo-h").innerText = formatCurrency(wallet.balance);
}

function hydrateUser(user) {
  usuarioLogado = user;
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  updateRoleActions(user);
  updateHome(user);
  updateProfile(user);
}

async function loadMissionData() {
  if (!getStoredToken()) {
    return;
  }

  try {
    const missions = await apiGet("/missions/me");
    missionsCache = missions;
    renderHomeMissions(missions);
  } catch (error) {
    const container = document.getElementById("home-missions");

    if (container) {
      container.innerHTML = '<div class="empty-state">Não foi possível carregar as missões agora.</div>';
    }
  }
}

async function loadWalletData() {
  const [wallet, transactions] = await Promise.all([
    apiGet("/wallet/me"),
    apiGet("/wallet/me/transactions"),
  ]);

  updateWallet(wallet);
  renderTransactions(transactions);
}

function formatDistance(distanceKm) {
  if (distanceKm === null || distanceKm === undefined) {
    return "--";
  }

  return `${Number(distanceKm).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`;
}

function renderCollectionPoints(points) {
  const pointsContainer = document.getElementById("points-list");

  if (!points.length) {
    pointsContainer.innerHTML = '<div class="empty-state">Nenhum ponto de coleta encontrado para este filtro.</div>';
    return;
  }

  collectionPointsCache = points.reduce(
    (accumulator, point) => ({
      ...accumulator,
      [point.slug]: {
        slug: point.slug,
        name: point.name,
        address: `${point.address} — ${point.city}`,
        materials: point.materials,
        materialOptions: point.materialOptions || [],
        distance: formatDistance(point.distanceKm),
        status: "Aberto",
        description: point.description,
      },
    }),
    { ...DEFAULT_POINTS },
  );

  pointsContainer.innerHTML = points
    .map((point) => {
      const icon = point.materials.includes("Eletrônico")
        ? "🔋"
        : point.materials.includes("Vidro")
          ? "🔵"
          : point.materials.includes("Metal")
            ? "🥫"
            : "♻️";

      const background = icon === "🔋" ? "#fdf0e6" : icon === "🔵" || icon === "🥫" ? "#e3f4fb" : "#e8f5ee";
      const tags = point.materials.map((material) => `<span class="ptag">${material}</span>`).join("");

      return `
        <div class="pc" onclick="openPonto('${point.slug}')">
          <div class="pico" style="background:${background}">${icon}</div>
          <div class="pinfo">
            <h3>${point.name}</h3>
            <p>${point.address} — ${point.city}</p>
            <div class="ptags">${tags}</div>
          </div>
          <div class="pdist">
            <div class="km">${formatDistance(point.distanceKm)}</div>
            <div class="dt">Aberto</div>
            <button class="ag-btn" onclick="event.stopPropagation();openAgenda('${point.slug}')">Agendar</button>
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadCollectionPoints(materialSlug = "") {
  try {
    const city = usuarioLogado?.cidade || "Manaus";
    const query = new URLSearchParams();

    if (city) {
      query.set("city", city);
    }

    if (materialSlug) {
      query.set("material", materialSlug);
    }

    const points = await apiGet(`/collection-points?${query.toString()}`);
    renderCollectionPoints(points);
  } catch (error) {
    document.getElementById("points-list").innerHTML =
      '<div class="empty-state">Não foi possível carregar os pontos de coleta agora.</div>';
  }
}

function renderPartners(partners) {
  const partnersContainer = document.getElementById("partners-list");

  if (!partners.length) {
    partnersContainer.innerHTML = '<div class="empty-state">Nenhum parceiro ativo encontrado.</div>';
    return;
  }

  const groupedPartners = partners.reduce((accumulator, partner) => {
    if (!accumulator[partner.category]) {
      accumulator[partner.category] = [];
    }

    accumulator[partner.category].push(partner);
    return accumulator;
  }, {});

  partnersContainer.innerHTML = Object.entries(groupedPartners)
    .map(([category, items]) => {
      const cards = items
        .map((partner) => {
          const firstBenefit = partner.benefits[0];
          const benefitText = firstBenefit
            ? `${firstBenefit.title} · R$${formatCurrency(firstBenefit.voucherCost)}`
            : "Benefício em configuração";

          return `
            <div class="parc-c" onclick="openPartnerBenefits(${partner.id})">
              <div class="parc-logo" style="background:#e8f5ee">${partner.logo}</div>
              <div class="parc-inf">
                <h3>${partner.name}</h3>
                <p>${partner.description}</p>
                <div class="parc-desc">${benefitText}</div>
              </div>
              <div class="parr">›</div>
            </div>
          `;
        })
        .join("");

      return `<div class="pcat">${category}</div>${cards}`;
    })
    .join("");
}

async function loadPartners() {
  try {
    const partners = await apiGet("/partners");
    partnersCache = partners;
    renderPartners(partners);
  } catch (error) {
    partnersCache = [];
    document.getElementById("partners-list").innerHTML =
      '<div class="empty-state">Não foi possível carregar os parceiros agora.</div>';
  }
}

async function carregarSessao() {
  const token = getStoredToken();

  if (!token) {
    return false;
  }

  const storedUser = getStoredUser();

  if (storedUser) {
    updateHome(storedUser);
    updateProfile(storedUser);
  }

  try {
    const user = await apiGet("/auth/me");
    hydrateUser(user);
    await Promise.all([loadWalletData(), loadCollectionPoints(), loadPartners(), loadMissionData()]);
    return true;
  } catch (error) {
    clearSession();
    usuarioLogado = null;
    updateRoleActions(null);
    return false;
  }
}

function goTo(id) {
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  const nav = document.getElementById("bnav");
  const navScreens = ["home", "mapa", "carteira", "perfil", "parceiros", "atendimento"];

  nav.style.display = navScreens.includes(id) ? "flex" : "none";

  if (navScreens.includes(id)) {
    setNav(id);
  }
}

function setNav(id) {
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));

  const navItem = document.getElementById(`nav-${id}`);

  if (navItem) {
    navItem.classList.add("active");
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toast.innerText = message;
  toast.classList.add("show");

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

function openModal(id) {
  document.getElementById(id).classList.add("open");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

async function openRedeemPartners() {
  if (!getStoredToken()) {
    showToast("Faça login para usar seu VoucherVerde.");
    goTo("login");
    return;
  }

  if (!partnersCache.length) {
    await loadPartners();
  }

  goTo("parceiros");
  setNav("parceiros");
  showToast("Selecione um parceiro para resgatar seu benefício.");
}

function renderPartnerBenefits(partner) {
  const list = document.getElementById("partner-benefits-list");

  document.getElementById("partner-benefits-tag").innerText = `${partner.logo} ${partner.category}`;
  document.getElementById("partner-benefits-title").innerText = partner.name;
  document.getElementById("partner-benefits-description").innerText = partner.description;

  if (!partner.benefits.length) {
    list.innerHTML = '<div class="empty-state">Este parceiro ainda não possui benefícios ativos.</div>';
    return;
  }

  list.innerHTML = partner.benefits
    .map((benefit) => `
      <div class="benefit-card">
        <div class="benefit-head">
          <div>
            <div class="benefit-title">${escapeHtml(benefit.title)}</div>
            <div class="benefit-sub">${escapeHtml(benefit.description)}</div>
          </div>
          <div class="status-badge generated">${escapeHtml(benefit.type)}</div>
        </div>
        <div class="benefit-meta">
          <div class="meta-chip">Custo: R$${formatCurrency(benefit.voucherCost)}</div>
          ${benefit.discountValue !== null ? `<div class="meta-chip">Valor: R$${formatCurrency(benefit.discountValue)}</div>` : ""}
          ${benefit.periodLimit ? `<div class="meta-chip">Limite: ${benefit.periodLimit}/mês</div>` : ""}
        </div>
        <button class="btn-primary" style="margin-top:12px" onclick="redeemBenefit(${benefit.id})">Resgatar benefício</button>
      </div>
    `)
    .join("");
}

function openPartnerBenefits(partnerId) {
  const partner = partnersCache.find((item) => item.id === partnerId);

  if (!partner) {
    showToast("Parceiro indisponível no momento.");
    return;
  }

  renderPartnerBenefits(partner);
  openModal("mod-partner-benefits");
}

async function redeemBenefit(benefitId) {
  if (!getStoredToken()) {
    showToast("Faça login para concluir o resgate.");
    goTo("login");
    return;
  }

  try {
    const result = await apiPost("/wallet/redeem", { benefitId });

    if (usuarioLogado) {
      usuarioLogado.saldo = result.wallet.balance;
      saveSession(getStoredToken(), usuarioLogado);
      hydrateUser(usuarioLogado);
    }

    updateWallet(result.wallet);
    await Promise.all([loadWalletData(), loadPartners()]);
    closeModal("mod-partner-benefits");
    showToast(`✅ Resgate gerado: ${result.redemption.code}`);
  } catch (error) {
    showToast(resolveErrorMessage(error, "Não foi possível resgatar este benefício."));
  }
}

function renderSupportTickets(tickets) {
  const container = document.getElementById("support-ticket-list");

  if (!tickets.length) {
    container.innerHTML = '<div class="empty-state">Você ainda não abriu nenhum ticket de suporte.</div>';
    return;
  }

  container.innerHTML = tickets
    .map((ticket) => `
      <div class="ticket-card" onclick="openSupportTicket(${ticket.id})">
        <div class="ticket-head">
          <div>
            <div class="ticket-title">${escapeHtml(ticket.subject)}</div>
            <div class="ticket-sub">${escapeHtml(ticket.category)} · Atualizado em ${escapeHtml(formatDateTime(ticket.updatedAt))}</div>
          </div>
          <div class="status-badge ${ticket.status}">${escapeHtml(getStatusLabel(ticket.status))}</div>
        </div>
        <div class="ticket-meta">
          <div class="priority-badge ${ticket.priority}">${escapeHtml(getPriorityLabel(ticket.priority))}</div>
          <div class="meta-chip">${ticket.interactionCount} interações</div>
        </div>
      </div>
    `)
    .join("");
}

async function loadSupportTickets() {
  try {
    const tickets = await apiGet("/support/tickets");
    renderSupportTickets(tickets);
  } catch (error) {
    document.getElementById("support-ticket-list").innerHTML =
      '<div class="empty-state">Não foi possível carregar os tickets agora.</div>';
  }
}

async function openSupportModal() {
  if (!getStoredToken()) {
    showToast("Faça login para acessar o suporte.");
    goTo("login");
    return;
  }

  openModal("mod-support");
  await loadSupportTickets();
}

function openSupportForm() {
  document.getElementById("sup-category").value = "Conta";
  document.getElementById("sup-subject").value = "";
  document.getElementById("sup-priority").value = "medium";
  document.getElementById("sup-description").value = "";
  openModal("mod-support-form");
}

async function submitSupportTicket() {
  const button = document.getElementById("sup-create-btn");
  button.disabled = true;

  try {
    const ticket = await apiPost("/support/tickets", {
      category: document.getElementById("sup-category").value,
      subject: document.getElementById("sup-subject").value,
      priority: document.getElementById("sup-priority").value,
      description: document.getElementById("sup-description").value,
    });

    closeModal("mod-support-form");
    await loadSupportTickets();
    await openSupportTicket(ticket.id);
    showToast("✅ Ticket aberto com sucesso.");
  } catch (error) {
    showToast(resolveErrorMessage(error, "Não foi possível abrir o ticket."));
  } finally {
    button.disabled = false;
  }
}

function renderSupportDetail(ticket) {
  const currentUserId = getProfileFormUser()?.id;
  selectedTicketId = ticket.id;

  document.getElementById("support-detail-status").innerText = `${getStatusLabel(ticket.status)} · ${getPriorityLabel(ticket.priority)}`;
  document.getElementById("support-detail-title").innerText = ticket.subject;
  document.getElementById("support-detail-meta").innerText = `${ticket.category} · aberto em ${formatDateTime(ticket.createdAt)}`;
  document.getElementById("support-thread").innerHTML = ticket.messages
    .map((message) => `
      <div class="ticket-bubble ${message.authorId === currentUserId ? "self" : ""}">
        <strong>${escapeHtml(message.authorName)}</strong>
        <small>${escapeHtml(formatDateTime(message.createdAt))}</small>
        <p>${escapeHtml(message.message)}</p>
      </div>
    `)
    .join("");
}

async function openSupportTicket(ticketId) {
  try {
    const ticket = await apiGet(`/support/tickets/${ticketId}`);
    renderSupportDetail(ticket);
    document.getElementById("sup-reply").value = "";
    openModal("mod-support-detail");
  } catch (error) {
    showToast(resolveErrorMessage(error, "Não foi possível carregar o ticket."));
  }
}

async function sendSupportReply() {
  const button = document.getElementById("sup-reply-btn");
  button.disabled = true;

  try {
    const ticket = await apiPost(`/support/tickets/${selectedTicketId}/messages`, {
      message: document.getElementById("sup-reply").value,
    });

    renderSupportDetail(ticket);
    document.getElementById("sup-reply").value = "";
    await loadSupportTickets();
    showToast("✅ Resposta enviada ao suporte.");
  } catch (error) {
    showToast(resolveErrorMessage(error, "Não foi possível enviar sua resposta."));
  } finally {
    button.disabled = false;
  }
}

function renderDeliveries(deliveries) {
  const container = document.getElementById("delivery-list");

  if (!deliveries.length) {
    container.innerHTML = '<div class="empty-state">Você ainda não registrou nenhuma entrega.</div>';
    return;
  }

  container.innerHTML = deliveries
    .map((delivery) => `
      <div class="delivery-card">
        <div class="delivery-head">
          <div>
            <div class="delivery-title">${escapeHtml(delivery.protocol)}</div>
            <div class="delivery-sub">${escapeHtml(delivery.point.name)} · ${escapeHtml(formatDateTime(delivery.createdAt))}</div>
          </div>
          <div class="status-badge ${delivery.status}">${escapeHtml(getStatusLabel(delivery.status))}</div>
        </div>
        <div class="delivery-items">
          ${delivery.items.map((item) => `<div class="item-chip">${escapeHtml(item.materialName)} · ${item.quantity.toLocaleString("pt-BR")} ${escapeHtml(item.unit)}</div>`).join("")}
        </div>
        <div class="ticket-meta">
          <div class="meta-chip">+${delivery.totals.points} pts</div>
          <div class="meta-chip">R$${formatCurrency(delivery.totals.creditedValue)}</div>
        </div>
      </div>
    `)
    .join("");
}

async function loadAppointmentsData() {
  appointmentsCache = await apiGet("/appointments/me");
  return appointmentsCache;
}

async function loadUserDeliveries() {
  try {
    deliveriesCache = await apiGet("/deliveries/me");
    renderDeliveries(deliveriesCache);
  } catch (error) {
    document.getElementById("delivery-list").innerHTML =
      '<div class="empty-state">Não foi possível carregar suas entregas agora.</div>';
  }
}

async function openDeliveriesModal() {
  if (!getStoredToken()) {
    showToast("Faça login para acompanhar suas entregas.");
    goTo("login");
    return;
  }

  openModal("mod-deliveries");
  await loadUserDeliveries();
}

function populateDeliveryPointOptions(selectedPointSlug = "") {
  const select = document.getElementById("del-point");
  const points = Object.values(collectionPointsCache).sort((left, right) => left.name.localeCompare(right.name));

  select.innerHTML = points
    .map((point) => `<option value="${escapeHtml(point.slug)}">${escapeHtml(point.name)}</option>`)
    .join("");

  if (selectedPointSlug) {
    select.value = selectedPointSlug;
  }
}

function renderDeliveryAppointmentOptions(pointSlug) {
  const select = document.getElementById("del-appointment");
  const appointments = appointmentsCache.filter(
    (appointment) => appointment.point.slug === pointSlug && !["completed", "cancelled", "missed", "checked_in"].includes(appointment.status),
  );

  select.innerHTML = ['<option value="">Sem agendamento vinculado</option>']
    .concat(
      appointments.map(
        (appointment) => `<option value="${appointment.id}">${escapeHtml(formatDateTime(`${appointment.scheduledDate}T${appointment.startTime}`))} · ${escapeHtml(getStatusLabel(appointment.status))}</option>`,
      ),
    )
    .join("");
}

function renderDeliveryMaterialInputs(pointSlug) {
  const container = document.getElementById("del-items");
  const point = getPointBySlug(pointSlug);
  const materials = point?.materialOptions || [];

  if (!materials.length) {
    container.innerHTML = '<div class="empty-state">Este ponto não possui materiais disponíveis para entrega no momento.</div>';
    return;
  }

  container.innerHTML = materials
    .map((material) => `
      <div class="material-form-card">
        <div class="material-form-top">
          <div>
            <h4>${escapeHtml(material.name)}</h4>
            <span>${escapeHtml(material.unit)} · ${material.pointsPerUnit} pts/${escapeHtml(material.unit)} · R$${formatCurrency(material.valuePerUnit)}</span>
          </div>
        </div>
        <div class="fg" style="margin-bottom:0">
          <label>QUANTIDADE</label>
          <input type="number" min="0" step="0.01" data-material-slug="${escapeHtml(material.slug)}" placeholder="0"/>
        </div>
      </div>
    `)
    .join("");
}

function onDeliveryPointChange() {
  const pointSlug = document.getElementById("del-point").value;
  renderDeliveryAppointmentOptions(pointSlug);
  renderDeliveryMaterialInputs(pointSlug);
}

async function openDeliveryForm(pointSlug = "") {
  if (!getStoredToken()) {
    showToast("Faça login para registrar uma entrega.");
    goTo("login");
    return;
  }

  try {
    await Promise.all([loadCollectionPoints(), loadAppointmentsData()]);
    populateDeliveryPointOptions(pointSlug);
    document.getElementById("del-notes").value = "";
    openModal("mod-delivery-form");
    onDeliveryPointChange();
  } catch (error) {
    showToast("Não foi possível preparar o formulário de entrega.");
  }
}

async function submitDelivery() {
  const button = document.getElementById("del-save-btn");
  const pointSlug = document.getElementById("del-point").value;
  const items = Array.from(document.querySelectorAll("#del-items [data-material-slug]"))
    .map((input) => ({
      materialSlug: input.dataset.materialSlug,
      quantity: Number(input.value),
    }))
    .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);

  if (!items.length) {
    showToast("Informe ao menos um material com quantidade maior que zero.");
    return;
  }

  button.disabled = true;

  try {
    const delivery = await apiPost("/deliveries", {
      pointSlug,
      appointmentId: document.getElementById("del-appointment").value || null,
      userNotes: document.getElementById("del-notes").value,
      items,
    });

    closeModal("mod-delivery-form");
    await loadUserDeliveries();
    showToast(`✅ Entrega registrada com protocolo ${delivery.protocol}.`);
  } catch (error) {
    showToast(resolveErrorMessage(error, "Não foi possível registrar sua entrega."));
  } finally {
    button.disabled = false;
  }
}

function renderOperatorPendingDeliveries(deliveries) {
  const container = document.getElementById("operator-delivery-list");

  if (!deliveries.length) {
    container.innerHTML = '<div class="empty-state">Nenhuma entrega pendente para revisão agora.</div>';
    return;
  }

  container.innerHTML = deliveries
    .map((delivery) => `
      <div class="operator-card" onclick="openOperatorReview(${delivery.id})">
        <div class="delivery-head">
          <div>
            <div class="delivery-title">${escapeHtml(delivery.userName || delivery.protocol)}</div>
            <div class="delivery-sub">${escapeHtml(delivery.point.name)} · ${escapeHtml(delivery.protocol)}</div>
          </div>
          <div class="status-badge pending_confirmation">Aguardando</div>
        </div>
        <div class="delivery-items">
          ${delivery.items.map((item) => `<div class="item-chip">${escapeHtml(item.materialName)} · ${item.quantity.toLocaleString("pt-BR")} ${escapeHtml(item.unit)}</div>`).join("")}
        </div>
      </div>
    `)
    .join("");
}

async function loadOperatorPendingDeliveries() {
  try {
    operatorPendingCache = await apiGet("/deliveries/operator/pending");
    renderOperatorPendingDeliveries(operatorPendingCache);
  } catch (error) {
    document.getElementById("operator-delivery-list").innerHTML =
      '<div class="empty-state">Não foi possível carregar as entregas pendentes.</div>';
  }
}

async function openOperatorModal() {
  if (!canOperate()) {
    showToast("Este acesso é exclusivo para operadores do ponto.");
    return;
  }

  openModal("mod-operator");
  await loadOperatorPendingDeliveries();
}

function openOperatorReview(deliveryId) {
  const delivery = operatorPendingCache.find((item) => item.id === deliveryId);

  if (!delivery) {
    showToast("Entrega indisponível para revisão.");
    return;
  }

  selectedOperatorDeliveryId = deliveryId;
  document.getElementById("op-review-meta").innerText = `${delivery.userName} · ${delivery.point.name} · ${delivery.protocol}`;
  document.getElementById("op-review-summary").innerHTML = `
    <div class="summary-card">
      <div class="delivery-head">
        <div>
          <div class="delivery-title">${escapeHtml(delivery.protocol)}</div>
          <div class="summary-text">${escapeHtml(delivery.userName)} · ${escapeHtml(delivery.point.address)}</div>
        </div>
        <div class="meta-chip">R$${formatCurrency(delivery.totals.creditedValue)}</div>
      </div>
      <div class="delivery-items">
        ${delivery.items.map((item) => `<div class="item-chip">${escapeHtml(item.materialName)} · ${item.quantity.toLocaleString("pt-BR")} ${escapeHtml(item.unit)} · +${item.generatedPoints} pts</div>`).join("")}
      </div>
    </div>
  `;
  document.getElementById("op-review-notes").value = "";
  openModal("mod-operator-review");
}

async function submitOperatorReview(status) {
  const payload = {
    status,
    operatorNotes: document.getElementById("op-review-notes").value,
  };

  const confirmButton = document.getElementById("op-confirm-btn");
  const rejectButton = document.getElementById("op-reject-btn");
  confirmButton.disabled = true;
  rejectButton.disabled = true;

  try {
    operatorPendingCache = await apiPatch(`/deliveries/${selectedOperatorDeliveryId}/review`, payload);
    renderOperatorPendingDeliveries(operatorPendingCache);
    closeModal("mod-operator-review");
    showToast(status === "confirmed" ? "✅ Entrega confirmada com sucesso." : "✅ Entrega rejeitada com sucesso.");
  } catch (error) {
    showToast(resolveErrorMessage(error, "Não foi possível concluir a revisão da entrega."));
  } finally {
    confirmButton.disabled = false;
    rejectButton.disabled = false;
  }
}

function getProfileFormUser() {
  return usuarioLogado || getStoredUser();
}

function openProfileEditModal() {
  const user = getProfileFormUser();

  if (!user) {
    showToast("Faça login para editar seus dados.");
    goTo("login");
    return;
  }

  document.getElementById("up-nome").value = user.nome || "";
  document.getElementById("up-sobrenome").value = user.sobrenome || "";
  document.getElementById("up-telefone").value = formatPhone(user.telefone) === "Não informado" ? "" : formatPhone(user.telefone);
  document.getElementById("up-cep").value = formatCep(user.cep) === "Não informado" ? "" : formatCep(user.cep);
  document.getElementById("up-cidade").value = user.cidade || "";
  document.getElementById("up-estado").value = user.estado || "AM";
  document.getElementById("up-email").value = user.email || "";
  document.getElementById("up-senha-atual").value = "";

  openModal("mod-profile-edit");
}

function closeProfileEditModal() {
  document.getElementById("up-senha-atual").value = "";
  closeModal("mod-profile-edit");
}

function openPasswordModal() {
  if (!getStoredToken()) {
    showToast("Faça login para alterar sua senha.");
    goTo("login");
    return;
  }

  document.getElementById("pw-atual").value = "";
  document.getElementById("pw-nova").value = "";
  document.getElementById("pw-confirmacao").value = "";
  openModal("mod-password");
}

function closePasswordModal() {
  document.getElementById("pw-atual").value = "";
  document.getElementById("pw-nova").value = "";
  document.getElementById("pw-confirmacao").value = "";
  closeModal("mod-password");
}

async function salvarPerfil() {
  const user = getProfileFormUser();

  if (!user || !getStoredToken()) {
    showToast("Faça login para atualizar seu perfil.");
    goTo("login");
    return;
  }

  const saveButton = document.getElementById("up-save-btn");
  const nextEmail = document.getElementById("up-email").value.trim().toLowerCase();
  const currentPassword = document.getElementById("up-senha-atual").value;

  if (nextEmail !== String(user.email || "").trim().toLowerCase() && !currentPassword) {
    showToast("Informe a senha atual para alterar o e-mail.");
    return;
  }

  const payload = {
    nome: document.getElementById("up-nome").value,
    sobrenome: document.getElementById("up-sobrenome").value,
    telefone: document.getElementById("up-telefone").value,
    cep: document.getElementById("up-cep").value,
    cidade: document.getElementById("up-cidade").value,
    estado: document.getElementById("up-estado").value,
    email: nextEmail,
  };

  if (currentPassword) {
    payload.senhaAtual = currentPassword;
  }

  saveButton.disabled = true;

  try {
    const result = await apiPut("/users/me", payload);
    saveSession(result.token || getStoredToken(), result.usuario);
    hydrateUser(result.usuario);
    await loadCollectionPoints();
    closeProfileEditModal();
    showToast("✅ Dados atualizados com sucesso.");
  } catch (error) {
    showToast(resolveErrorMessage(error, "Não foi possível atualizar seu perfil."));
  } finally {
    saveButton.disabled = false;
  }
}

async function alterarSenha() {
  if (!getStoredToken()) {
    showToast("Faça login para alterar sua senha.");
    goTo("login");
    return;
  }

  const saveButton = document.getElementById("pw-save-btn");
  const payload = {
    senhaAtual: document.getElementById("pw-atual").value,
    novaSenha: document.getElementById("pw-nova").value,
    confirmacaoNovaSenha: document.getElementById("pw-confirmacao").value,
  };

  saveButton.disabled = true;

  try {
    const result = await apiPatch("/users/me/password", payload);
    closePasswordModal();
    showToast(`✅ ${result.message || "Senha atualizada com sucesso."}`);
  } catch (error) {
    showToast(resolveErrorMessage(error, "Não foi possível atualizar sua senha."));
  } finally {
    saveButton.disabled = false;
  }
}

function createMaterialChips(items) {
  return items.map((item) => `<div class="mat-chip">${item}</div>`).join("");
}

function openMissao(slug) {
  const mission = missionsCache.find((item) => item.slug === slug);
  const missionMeta = MISSION_DETAILS[slug] || {};

  if (!mission && !missionMeta.title) {
    showToast("Missão não encontrada.");
    return;
  }

  document.getElementById("mm-tag").innerText = missionMeta.tag || "🎯 Missão";
  document.getElementById("mm-titulo").innerText = mission?.title || missionMeta.title;
  document.getElementById("mm-desc").innerText = mission?.description || missionMeta.description || "Acompanhe sua missão ativa.";
  document.getElementById("mm-mats").innerHTML = createMaterialChips(missionMeta.materials || ["Entrega", "Reciclagem"]);

  const button = document.querySelector("#mod-missao .btn-primary");
  button.onclick = () => {
    closeModal("mod-missao");
    openAgenda(missionMeta.pointSlug || "ecoponto-central");
  };

  openModal("mod-missao");
}

function getPointBySlug(slug) {
  return collectionPointsCache[slug] || DEFAULT_POINTS[slug] || null;
}

function openPonto(slug) {
  const point = getPointBySlug(slug);

  if (!point) {
    showToast("Ponto de coleta indisponível no momento.");
    return;
  }

  document.getElementById("mp-dist").innerText = `${point.distance} · ${point.status}`;
  document.getElementById("mp-nome").innerText = point.name;
  document.getElementById("mp-end").innerText = point.address;
  document.getElementById("mp-mats").innerHTML = createMaterialChips(point.materials);
  document.getElementById("mp-btn").onclick = () => {
    closeModal("mod-ponto");
    openAgenda(point.slug);
  };
  document.getElementById("mp-delivery-btn").onclick = () => {
    closeModal("mod-ponto");
    openDeliveryForm(point.slug);
  };

  openModal("mod-ponto");
}

function setChip(element) {
  document.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("active"));
  element.classList.add("active");

  const slugByLabel = {
    Todos: "",
    "♻️ Plástico": "plastico",
    "🔵 Vidro": "vidro",
    "🥫 Metal": "metal",
    "📄 Papel": "papel",
    "🔋 Eletrônico": "eletronico",
  };

  loadCollectionPoints(slugByLabel[element.innerText] ?? "");
}

function buildAgendaSlots() {
  const slots = [];
  const schedules = [
    ["08:00", "10:00"],
    ["14:00", "16:00"],
    ["09:00", "11:00"],
    ["15:00", "17:00"],
  ];

  schedules.forEach((schedule, index) => {
    const date = new Date();
    date.setDate(date.getDate() + (index < 2 ? 1 : 3));

    slots.push({
      date: date.toISOString().slice(0, 10),
      dateLabel: date.toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      }),
      startTime: schedule[0],
      endTime: schedule[1],
    });
  });

  return slots;
}

function renderAgendaSlots(point) {
  const slotsContainer = document.getElementById("ag-slots");
  const slots = buildAgendaSlots();

  slotsContainer.innerHTML = slots
    .map(
      (slot) => `
        <div
          class="aslot"
          data-date="${slot.date}"
          data-start="${slot.startTime}"
          data-end="${slot.endTime}"
          onclick="selSlot(this)"
        >
          <div>
            <h4>${slot.dateLabel} — ${point.name}</h4>
            <p>${slot.startTime} às ${slot.endTime}</p>
          </div>
          <span class="achk">✅</span>
        </div>
      `,
    )
    .join("");
}

function openAgenda(pointSlug) {
  const point = getPointBySlug(pointSlug);

  if (!point) {
    showToast("Escolha um ponto de coleta válido.");
    return;
  }

  agendaAtual = point;
  slotSelecionado = null;

  document.getElementById("ag-nome").innerText = `Agendar entrega em ${point.name}`;
  renderAgendaSlots(point);
  openModal("mod-agenda");
}

function selSlot(element) {
  document.querySelectorAll(".aslot").forEach((slot) => slot.classList.remove("sel"));
  element.classList.add("sel");

  slotSelecionado = {
    date: element.dataset.date,
    startTime: element.dataset.start,
    endTime: element.dataset.end,
  };
}

async function confirmarAgenda() {
  if (!getStoredToken()) {
    showToast("Faça login para agendar uma entrega.");
    goTo("login");
    return;
  }

  if (!agendaAtual || !slotSelecionado) {
    showToast("Selecione um horário para concluir o agendamento.");
    return;
  }

  const confirmButton = document.getElementById("ag-confirm-btn");
  confirmButton.disabled = true;

  try {
    await apiPost("/appointments", {
      pointSlug: agendaAtual.slug,
      scheduledDate: slotSelecionado.date,
      startTime: slotSelecionado.startTime,
      endTime: slotSelecionado.endTime,
      notes: null,
    });

    closeModal("mod-agenda");
    showToast(`✅ Entrega agendada em ${agendaAtual.name}.`);
  } catch (error) {
    showToast(resolveErrorMessage(error, "Não foi possível salvar o agendamento."));
  } finally {
    confirmButton.disabled = false;
  }
}

async function fazerCadastro() {
  const payload = {
    nome: document.getElementById("c-nome").value,
    sobrenome: document.getElementById("c-sob").value,
    cpf: document.getElementById("c-cpf").value,
    telefone: document.getElementById("c-tel").value,
    cep: document.getElementById("c-cep").value,
    cidade: document.getElementById("c-cid").value,
    estado: document.getElementById("c-est").value,
    email: document.getElementById("c-email").value,
    senha: document.getElementById("c-senha").value,
  };

  try {
    await apiPost("/auth/register", payload);
    showToast("✅ Conta criada com sucesso! Faça seu login.");
    goTo("login");
  } catch (error) {
    showToast(resolveErrorMessage(error, "Erro ao cadastrar sua conta."));
  }
}

async function fazerLogin() {
  const payload = {
    email: document.getElementById("l-email").value,
    senha: document.getElementById("l-senha").value,
  };

  try {
    const result = await apiPost("/auth/login", payload);
    saveSession(result.token, result.usuario);
    await carregarSessao();
    showToast("✅ Login realizado!");
    goTo("home");
  } catch (error) {
    showToast(resolveErrorMessage(error, "Email ou senha inválidos."));
  }
}

function fazerLogout() {
  clearSession();
  usuarioLogado = null;
  updateRoleActions(null);
  showToast("👋 Logout realizado");
  goTo("login");
}

function mCPF(el) {
  el.value = el.value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function mTel(el) {
  el.value = el.value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function mCEP(el) {
  el.value = el.value
    .replace(/\D/g, "")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

window.onload = async () => {
  const params = new URLSearchParams(window.location.search);
  const hasSession = await carregarSessao();

  if (params.get("tela") === "atendimento") {
    await Promise.all([loadCollectionPoints(), loadPartners()]);
    goTo("atendimento");
    return;
  }

  if (hasSession) {
    goTo("home");
    return;
  }

  await Promise.all([loadCollectionPoints(), loadPartners()]);
  updateRoleActions(null);
  goTo("splash");
};
