const API = `${window.location.protocol}//${window.location.hostname}:8000`;
const STORAGE_TOKEN_KEY = "access_token";
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

function formatPoints(value) {
  return Math.floor(Number(value || 0)).toLocaleString("pt-BR");
}

const NIVEL_NAMES = {
  1: "Iniciante Verde",
  2: "Coletor Ativo",
  3: "Reciclador Dedicado",
  4: "Guardião da Floresta",
  5: "Herói Amazônico",
};

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

function formatCpf(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "Não informado";
  }

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
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
  const valor = mission.recompensa_valor ?? mission.rewardValue ?? 0;
  return `+${formatPoints(valor)} pts`;
}

function getLevelLabel(user) {
  const nivel = user.nivel ?? 1;
  const nome = user.nome_nivel ?? user.levelTitle ?? NIVEL_NAMES[nivel] ?? "Iniciante Verde";
  return `Nível ${nivel} · ${nome} 🌿`;
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
  const nivel = user.nivel ?? 1;
  const nome = user.nome_nivel ?? user.levelTitle ?? NIVEL_NAMES[nivel] ?? "Iniciante Verde";
  document.getElementById("home-nome").innerText = user.nome;
  document.getElementById("home-summary").innerText = `Prontos para usar · ${nome} 🌿`;
  document.getElementById("stat-nivel").innerText = nivel;
}

function updateProfile(user) {
  const fullName = `${user.nome} ${user.sobrenome}`.trim();

  document.getElementById("perf-nome").innerText = user.nome;
  document.getElementById("perf-nivel").innerText = getLevelLabel(user);
  document.getElementById("p-nome").innerText = fullName;
  document.getElementById("p-email").innerText = user.email;
  document.getElementById("p-cpf").innerText = formatCpf(user.cpf);
  
  // Formatar celular
  const phoneText = formatPhone(user.telefone);
  document.getElementById("p-telefone").innerText = phoneText;
  
  // Formatar endereço
  const addressParts = [];
  if (user.rua) addressParts.push(user.rua);
  if (user.numero) addressParts.push(user.numero);
  if (user.bairro) addressParts.push(user.bairro);
  if (user.cidade) addressParts.push(user.cidade);
  if (user.estado) addressParts.push(user.estado);
  
  const addressText = addressParts.length > 0 
    ? addressParts.join(", ") 
    : "Não informado";
  document.getElementById("p-endereco").innerText = addressText;
  
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
      const titulo = mission.titulo ?? mission.title ?? "Missão";
      const percentual = mission.percentual != null
        ? Math.round(mission.percentual * 100)
        : (mission.targetQuantity ? Math.round((mission.progress / mission.targetQuantity) * 100) : 0);
      const concluida = mission.concluida ?? mission.status === "completed";
      const progressText = concluida
        ? "Meta concluída com sucesso"
        : `${mission.progresso_atual ?? mission.progress ?? 0} / ${mission.meta_quantidade ?? mission.targetQuantity ?? 0} concluídos`;

      return `
        <div class="mc">
          <div class="mi" style="background:#e8f5ee">🎯</div>
          <div class="minfo">
            <h3>${escapeHtml(titulo)}</h3>
            <div class="pb"><div class="pf" style="width:${percentual}%"></div></div>
            <p>${escapeHtml(progressText)}</p>
          </div>
          <div class="mpts">+${formatPoints(mission.recompensa_valor ?? mission.rewardValue ?? 0)} pts</div>
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
      const tipo = transaction.tipo ?? transaction.type ?? "";
      const isPositive = tipo === "credit" || tipo === "bonus" || tipo === "entrada";
      const signalClass = isPositive ? "plus" : "minus";
      const icon = isPositive ? "♻️" : "🏪";
      const valor = transaction.valor ?? Math.abs(transaction.value ?? 0);
      const descricao = transaction.descricao ?? transaction.description ?? "";
      const data = transaction.created_at ?? transaction.createdAt;

      return `
        <div class="hi">
          <div class="hico" style="background:${isPositive ? "#e8f5ee" : "#fff3e0"}">${icon}</div>
          <div class="hinfo">
            <h4>${escapeHtml(descricao)}</h4>
            <p>${formatDateTime(data)} · ${isPositive ? "Pontos creditados" : "Pontos utilizados"}</p>
          </div>
          <div class="hval ${signalClass}">${isPositive ? "+" : "-"}${formatPoints(Math.abs(valor))} pts</div>
        </div>
      `;
    })
    .join("");

  historyContainer.innerHTML = `<div class="sec-t">📋 Histórico de Transações</div>${items}`;
}

function updateWallet(wallet) {
  const saldo = wallet.saldo_atual ?? wallet.balance ?? 0;
  const xpTotal = wallet.xp_total ?? 0;
  const nivel = wallet.nivel ?? wallet.level ?? 1;
  const nomeNivel = wallet.nome_nivel ?? NIVEL_NAMES[nivel] ?? "Iniciante Verde";
  const bonus = wallet.bonus_resgate ?? 0;
  const progresso = Math.round((wallet.progresso_proximo_nivel ?? wallet.progressPercent ?? 0) * 100);

  document.getElementById("saldo-c").innerText = formatPoints(saldo);
  document.getElementById("saldo-h").innerText = formatPoints(saldo);
  document.getElementById("stat-reciclado").innerText = formatPoints(xpTotal);
  document.getElementById("wallet-summary").innerText = `${nomeNivel} · Nível ${nivel} 🌿`;
  document.getElementById("wallet-level-title").innerText = `🌿 Nível ${nivel} — ${nomeNivel}`;
  document.getElementById("wallet-level-progress").innerText = `${progresso}%`;
  document.getElementById("wallet-level-bar").style.width = `${progresso}%`;
  const bonusText = bonus > 0 ? ` · Bônus de ${Math.round(bonus * 100)}% no resgate` : "";
  document.getElementById("wallet-level-description").innerText = `${progresso}% para o próximo nível${bonusText}.`;
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
    const missions = await api.getMissoesAtivas();
    missionsCache = missions;
    renderHomeMissions(missions);
  } catch (error) {
    const container = document.getElementById("home-missions");

    if (container) {
      container.innerHTML = '<div class="empty-state">Não foi possível carregar as missões agora.</div>';
    }
  }
}

async function loadDeliveryCount() {
  if (!getStoredToken()) return;
  try {
    const entregas = await api.getMinhasEntregas();
    deliveriesCache = entregas;
    document.getElementById("stat-entregas").innerText = entregas.length;
  } catch (_) {}
}

async function loadWalletData() {
  const [wallet, transactions] = await Promise.all([
    api.getSaldo(),
    api.getHistorico(),
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
    (accumulator, point) => {
      const name = point.nome ?? point.name ?? "";
      const slug = point.slug ?? String(point.id);
      return {
        ...accumulator,
        [slug]: {
          id: point.id,
          slug,
          name,
          nome: name,
          address: point.endereco ?? point.address ?? "",
          endereco: point.endereco ?? point.address ?? "",
          materials: point.materiais_aceitos ?? point.materials ?? [],
          materiais_aceitos: point.materiais_aceitos ?? point.materials ?? [],
        },
      };
    },
    {},
  );

  pointsContainer.innerHTML = points
    .map((point) => {
      const materiais = point.materiais_aceitos ?? point.materials ?? [];
      const icon = materiais.includes("eletrônico") || materiais.includes("Eletrônico")
        ? "🔋"
        : materiais.includes("vidro") || materiais.includes("Vidro")
          ? "🔵"
          : materiais.includes("metal") || materiais.includes("Metal")
            ? "🥫"
            : "♻️";
      const background = icon === "🔋" ? "#fdf0e6" : icon === "🔵" || icon === "🥫" ? "#e3f4fb" : "#e8f5ee";
      const tags = materiais.map((m) => `<span class="ptag">${m}</span>`).join("");
      const nome = point.nome ?? point.name;
      const endereco = point.endereco ?? point.address ?? "";

      const slug = point.slug ?? String(point.id);
      return `
        <div class="pc" onclick="openAgenda('${slug}')">
          <div class="pico" style="background:${background}">${icon}</div>
          <div class="pinfo">
            <h3>${escapeHtml(nome)}</h3>
            <p>${escapeHtml(endereco)}</p>
            <div class="ptags">${tags}</div>
          </div>
          <div class="pdist">
            <div class="dt">Aberto</div>
            <button class="ag-btn" onclick="event.stopPropagation();openAgenda('${slug}')">Agendar</button>
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

    const points = await api.getPontos(materialSlug || null);
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
    const cat = partner.categoria ?? partner.category ?? "Outros";
    if (!accumulator[cat]) accumulator[cat] = [];
    accumulator[cat].push(partner);
    return accumulator;
  }, {});

  partnersContainer.innerHTML = Object.entries(groupedPartners)
    .map(([category, items]) => {
      const cards = items
        .map((partner) => {
          const nome = partner.nome ?? partner.name;
          const descricao = partner.descricao ?? partner.description ?? "";

          return `
            <div class="parc-c" onclick="openPartnerBenefits(${partner.id})">
              <div class="parc-logo" style="background:#e8f5ee">🏪</div>
              <div class="parc-inf">
                <h3>${escapeHtml(nome)}</h3>
                <p>${escapeHtml(descricao)}</p>
              </div>
              <div class="parr">›</div>
            </div>
          `;
        })
        .join("");

      return `<div class="pcat">${escapeHtml(category)}</div>${cards}`;
    })
    .join("");
}

async function loadPartners() {
  try {
    const partners = await api.getParceiros();
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
    const user = await api.getMe();
    hydrateUser(user);
    await Promise.all([loadWalletData(), loadCollectionPoints(), loadPartners(), loadMissionData(), loadDeliveryCount()]);
    return true;
  } catch (error) {
    api.logout();
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

  document.getElementById("partner-benefits-tag").innerText = `${partner.logo_emoji ?? ""} ${partner.categoria}`;
  document.getElementById("partner-benefits-title").innerText = partner.nome;
  document.getElementById("partner-benefits-description").innerText = partner.descricao;

  const beneficios = partner.beneficios ?? [];

  if (!beneficios.length) {
    list.innerHTML = '<div class="empty-state">Este parceiro ainda não possui benefícios ativos.</div>';
    return;
  }

  list.innerHTML = beneficios
    .map((benefit) => `
      <div class="benefit-card">
        <div class="benefit-head">
          <div>
            <div class="benefit-title">${escapeHtml(benefit.titulo)}</div>
            <div class="benefit-sub">${escapeHtml(benefit.descricao)}</div>
          </div>
          <div class="status-badge generated">${escapeHtml(benefit.tipo)}</div>
        </div>
        <div class="benefit-meta">
          <div class="meta-chip">Custo: R$${formatCurrency(benefit.custo_voucher)}</div>
          ${benefit.valor_desconto !== null ? `<div class="meta-chip">Valor: R$${formatCurrency(benefit.valor_desconto)}</div>` : ""}
          ${benefit.limite_periodo ? `<div class="meta-chip">Limite: ${benefit.limite_periodo}/mês</div>` : ""}
        </div>
        <button class="btn-primary" style="margin-top:12px" onclick="redeemBenefit(${benefit.id}, ${partner.id}, ${benefit.custo_voucher ?? 0}, '${escapeHtml(benefit.titulo)}')">Resgatar benefício</button>
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

async function redeemBenefit(benefitId, parceiroId, custo) {
  if (!getStoredToken()) {
    showToast("Faça login para concluir o resgate.");
    goTo("login");
    return;
  }

  try {
    const result = await api.usarVoucher(parceiroId, benefitId, custo);
    await Promise.all([loadWalletData(), loadPartners()]);
    closeModal("mod-partner-benefits");
    showToast(`✅ Benefício resgatado com sucesso.`);
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
    const tickets = await api.getTickets();
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
    const ticket = await api.criarTicket({
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
    const ticket = await api.getTicket(ticketId);
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
    const ticket = await api.responderTicket(selectedTicketId, document.getElementById("sup-reply").value);

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
  appointmentsCache = await api.getAgendamentos();
  return appointmentsCache;
}

async function loadUserDeliveries() {
  try {
    deliveriesCache = await api.getMinhasEntregas();
    renderDeliveries(deliveriesCache);
  } catch (error) {
    document.getElementById("delivery-list").innerHTML =
      '<div class="empty-state">Não foi possível carregar suas entregas agora.</div>';
  }
}

async function openMeusAgendamentos() {
  if (!getStoredToken()) { showToast("Faça login para ver seus agendamentos."); goTo("login"); return; }
  openModal("mod-agendamentos");
  await renderMeusAgendamentos();
}

async function renderMeusAgendamentos() {
  const container = document.getElementById("meus-agendamentos-list");
  container.innerHTML = '<div class="empty-state">Carregando...</div>';
  try {
    const lista = await api.getAgendamentos();
    appointmentsCache = lista;
    if (!lista.length) {
      container.innerHTML = '<div class="empty-state">Você ainda não tem agendamentos.</div>';
      return;
    }
    const statusLabel = { scheduled: "Agendado", confirmed: "Confirmado", checked_in: "Check-in", completed: "Concluído", cancelled: "Cancelado", missed: "Não compareceu" };
    const statusColor = { scheduled: "#2e7d32", confirmed: "#1565c0", checked_in: "#e65100", completed: "#555", cancelled: "#c0392b", missed: "#888" };
    const cancelaveis = ["scheduled", "confirmed"];
    container.innerHTML = lista.map(a => {
      const [y, m, d] = a.data_agendada.split("-");
      const data = `${d}/${m}/${y}`;
      const inicio = a.janela_inicio.slice(0, 5);
      const fim = a.janela_fim.slice(0, 5);
      const cor = statusColor[a.status] || "#555";
      const label = statusLabel[a.status] || a.status;
      const btnCancelar = cancelaveis.includes(a.status)
        ? `<button onclick="cancelarAgendamento(${a.id})" style="margin-top:8px;width:100%;padding:8px;background:#fde8e8;color:#c0392b;border:none;border-radius:8px;font-family:inherit;font-size:.8rem;font-weight:600;cursor:pointer">Cancelar agendamento</button>`
        : "";
      return `
        <div style="background:#f9f7f4;border-radius:12px;padding:14px 16px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div style="font-weight:700;font-size:.9rem;color:#0a2e1f">${escapeHtml(a.ponto_nome || "Ponto de coleta")}</div>
            <span style="font-size:.72rem;font-weight:700;color:${cor};background:${cor}18;padding:3px 10px;border-radius:20px">${label}</span>
          </div>
          <div style="font-size:.82rem;color:#555">📅 ${data} · ⏰ ${inicio}–${fim}</div>
          ${a.observacoes ? `<div style="font-size:.78rem;color:#888;margin-top:4px">📝 ${escapeHtml(a.observacoes)}</div>` : ""}
          ${btnCancelar}
        </div>`;
    }).join("");
  } catch {
    container.innerHTML = '<div class="empty-state">Não foi possível carregar seus agendamentos.</div>';
  }
}

async function cancelarAgendamento(id) {
  if (!confirm("Deseja cancelar este agendamento?")) return;
  try {
    await api.cancelarAgendamento(id);
    showToast("Agendamento cancelado.");
    await renderMeusAgendamentos();
  } catch (e) {
    showToast(resolveErrorMessage(e, "Não foi possível cancelar o agendamento."));
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
    const delivery = await api.criarEntrega({
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
    operatorPendingCache = await api.getEntregasPendentes();
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
    operatorPendingCache = await api.revisarEntrega(selectedOperatorDeliveryId, payload);
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
    email: nextEmail,
  };

  if (currentPassword) {
    payload.senhaAtual = currentPassword;
  }

  saveButton.disabled = true;

  try {
    const result = await api.updateMe(payload);
    saveSession(getStoredToken(), result);
    hydrateUser(result);
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
    const result = await api.changePassword(payload);
    closePasswordModal();
    showToast(`✅ ${result.message || "Senha atualizada com sucesso."}`);
  } catch (error) {
    showToast(resolveErrorMessage(error, "Não foi possível atualizar sua senha."));
  } finally {
    saveButton.disabled = false;
  }
}

function openAddressModal() {
  const user = getProfileFormUser();

  if (!user) {
    showToast("Faça login para editar seu endereço.");
    goTo("login");
    return;
  }

  document.getElementById("addr-cep").value = formatCep(user.cep) === "Não informado" ? "" : formatCep(user.cep);
  document.getElementById("addr-rua").value = user.rua || "";
  document.getElementById("addr-numero").value = user.numero || "";
  document.getElementById("addr-bairro").value = user.bairro || "";
  document.getElementById("addr-cidade").value = user.cidade || "";
  document.getElementById("addr-estado").value = user.estado || "AM";

  openModal("mod-address");
}

function closeAddressModal() {
  closeModal("mod-address");
}

async function salvarEndereco() {
  if (!getStoredToken()) {
    showToast("Faça login para atualizar seu endereço.");
    goTo("login");
    return;
  }

  const saveButton = document.getElementById("addr-save-btn");
  const payload = {
    cep: document.getElementById("addr-cep").value,
    rua: document.getElementById("addr-rua").value,
    numero: document.getElementById("addr-numero").value,
    bairro: document.getElementById("addr-bairro").value,
    cidade: document.getElementById("addr-cidade").value,
    estado: document.getElementById("addr-estado").value,
  };

  saveButton.disabled = true;

  try {
    const result = await api.updateMe(payload);
    saveSession(getStoredToken(), result);
    hydrateUser(result);
    await loadCollectionPoints();
    closeAddressModal();
    showToast("✅ Endereço atualizado com sucesso.");
  } catch (error) {
    showToast(resolveErrorMessage(error, "Não foi possível atualizar o endereço."));
  } finally {
    saveButton.disabled = false;
  }
}

function openPhoneModal() {
  const user = getProfileFormUser();

  if (!user) {
    showToast("Faça login para editar seu celular.");
    goTo("login");
    return;
  }

  document.getElementById("phone-telefone").value = formatPhone(user.telefone) === "Não informado" ? "" : formatPhone(user.telefone);

  openModal("mod-phone");
}

function closePhoneModal() {
  closeModal("mod-phone");
}

async function salvarCelular() {
  if (!getStoredToken()) {
    showToast("Faça login para atualizar seu celular.");
    goTo("login");
    return;
  }

  const saveButton = document.getElementById("phone-save-btn");
  const payload = {
    telefone: document.getElementById("phone-telefone").value,
  };

  saveButton.disabled = true;

  try {
    const result = await api.updateMe(payload);
    saveSession(getStoredToken(), result);
    hydrateUser(result);
    closePhoneModal();
    showToast("✅ Celular atualizado com sucesso.");
  } catch (error) {
    showToast(resolveErrorMessage(error, "Não foi possível atualizar o celular."));
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
  loadCollectionPoints(element.dataset.slug || "");
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
    await api.criarAgendamento({
      ponto_id: agendaAtual.id,
      data_agendada: slotSelecionado.date,
      janela_inicio: slotSelecionado.startTime,
      janela_fim: slotSelecionado.endTime,
      observacoes: null,
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
  const senha = document.getElementById("c-senha").value;
  const confirmacaoSenha = document.getElementById("c-senha-conf").value;

  if (senha !== confirmacaoSenha) {
    showToast("❌ As senhas não coincidem!");
    return;
  }

  const payload = {
    nome: document.getElementById("c-nome").value.trim(),
    sobrenome: document.getElementById("c-sob").value.trim(),
    cpf: document.getElementById("c-cpf").value,
    email: document.getElementById("c-email").value,
    senha: senha,
    confirmacaoSenha: confirmacaoSenha,
  };

  try {
    await api.register(payload);
    showToast("✅ Conta criada com sucesso! Faça seu login.");
    goTo("login");
  } catch (error) {
    showToast(error?.detail || "Erro ao cadastrar sua conta.");
  }
}

async function fazerLogin() {
  const email = document.getElementById("l-email").value;
  const senha = document.getElementById("l-senha").value;

  try {
    await api.login(email, senha);
    const user = await api.getMe();
    hydrateUser(user);
    await carregarSessao();
    showToast("✅ Login realizado!");
    goTo("home");
  } catch (error) {
    showToast(error?.detail || "Email ou senha inválidos.");
  }
}

function fazerLogout() {
  api.logout();
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

async function buscarEnderecoPorCEP(cep) {
  // Remove caracteres não numéricos
  const cepLimpo = cep.replace(/\D/g, "");
  
  // Valida se o CEP tem 8 dígitos
  if (cepLimpo.length !== 8) {
    return null;
  }
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    
    if (!response.ok) {
      throw new Error("Erro ao buscar CEP");
    }
    
    const data = await response.json();
    
    // Verifica se o CEP foi encontrado
    if (data.erro) {
      showToast("❌ CEP não encontrado");
      return null;
    }
    
    return {
      cep: data.cep,
      rua: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf
    };
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    showToast("❌ Erro ao buscar CEP. Tente novamente.");
    return null;
  }
}

async function preencherEnderecoPorCEP() {
  const cepInput = document.getElementById("addr-cep");
  const cep = cepInput.value;
  
  // Só busca se o CEP tiver 8 dígitos (sem contar o hífen)
  const cepLimpo = cep.replace(/\D/g, "");
  if (cepLimpo.length !== 8) {
    return;
  }
  
  // Mostra loading
  const saveButton = document.getElementById("addr-save-btn");
  const originalText = saveButton.textContent;
  saveButton.textContent = "🔍 Buscando CEP...";
  saveButton.disabled = true;
  
  const endereco = await buscarEnderecoPorCEP(cep);
  
  if (endereco) {
    // Preenche os campos automaticamente
    document.getElementById("addr-rua").value = endereco.rua || "";
    document.getElementById("addr-bairro").value = endereco.bairro || "";
    document.getElementById("addr-cidade").value = endereco.cidade || "";
    document.getElementById("addr-estado").value = endereco.estado || "AM";
    
    showToast("✅ Endereço encontrado!");
  }
  
  // Remove loading
  saveButton.textContent = originalText;
  saveButton.disabled = false;
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
