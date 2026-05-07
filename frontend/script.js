const PONTOS = {
  central: {
    nome: "EcoPonto Central",
    end: "Av. Eduardo Ribeiro, 520 — Manaus",
    dist: "0,3 km",
    mat: ["♻️ Plástico", "📄 Papel", "🥫 Metal"],
  },
  norte: {
    nome: "Coleta Norte",
    end: "R. Recife, 230 — Manaus",
    dist: "0,8 km",
    mat: ["🔵 Vidro", "♻️ Plástico"],
  },
  sul: {
    nome: "Ponto Eletrônico Sul",
    end: "Av. Constantino Nery, 1200",
    dist: "1,2 km",
    mat: ["🔋 Eletrônico", "🔋 Bateria"],
  },
  leste: {
    nome: "EcoPonto Leste",
    end: "R. Belo Horizonte, 88 — Manaus",
    dist: "1,9 km",
    mat: ["♻️ Plástico", "📄 Papel"],
  },
  shop: {
    nome: "Shopping Coleta",
    end: "Shopping Manauara — Piso G1",
    dist: "2,4 km",
    mat: ["🥫 Metal", "🔵 Vidro", "♻️ Plástico"],
  },
};

const MISSOES = {
  plastic: {
    tag: "♻️ Missão Ativa",
    titulo: "Recicle 2kg de Plástico",
    desc: "Leve pelo menos 2kg de plástico a qualquer EcoPonto. O voucher é creditado automaticamente quando o ponto confirmar o recebimento.",
    mat: ["♻️ Plástico"],
  },

  vidro: {
    tag: "🔵 Bônus Triplo",
    titulo: "Levar Vidro ao Ponto",
    desc: "Leve qualquer quantidade de vidro ao Coleta Norte ou Shopping Coleta.",
    mat: ["🔵 Vidro"],
  },

  eletro: {
    tag: "🔋 Missão Ativa",
    titulo: "Descarte Eletrônico",
    desc: "Leve eletrônicos ao Ponto Sul e ganhe VoucherVerde automaticamente.",
    mat: ["🔋 Eletrônico", "🔋 Bateria"],
  },
};

let user = {};
let slotSel = null;

/* =========================
   NAVEGAÇÃO
========================= */

function goTo(id) {
  document.querySelectorAll(".screen").forEach((s) => {
    s.classList.remove("active");
  });

  document.getElementById(id).classList.add("active");

  const nav = document.getElementById("bnav");

  if (["splash", "login", "cadastro"].includes(id)) {
    nav.classList.remove("show");
  } else {
    nav.classList.add("show");
  }
}

function setNav(id) {
  document.querySelectorAll(".nav-item").forEach((n) => {
    n.classList.remove("active");
  });

  const el = document.getElementById("nav-" + id);

  if (el) {
    el.classList.add("active");
  }
}

/* =========================
   LOCAL STORAGE
========================= */

function salvarUsuario() {
  localStorage.setItem("amazonviva_user", JSON.stringify(user));
}

function carregarUsuario() {
  const dados = localStorage.getItem("amazonviva_user");

  if (dados) {
    user = JSON.parse(dados);

    updateUI();

    goTo("home");

    setNav("home");

    showToast("👋 Login restaurado!");
  }
}

/* =========================
   LOGIN
========================= */

function fazerLogin() {
  const email = document.getElementById("l-email").value.trim();

  const senha = document.getElementById("l-senha").value;

  if (!email || !senha) {
    showToast("⚠️ Preencha e-mail e senha!");
    return;
  }

  const salvo = localStorage.getItem("amazonviva_user");

  if (!salvo) {
    showToast("⚠️ Nenhuma conta cadastrada!");
    return;
  }

  const usuarioSalvo = JSON.parse(salvo);

  if (usuarioSalvo.email !== email || usuarioSalvo.senha !== senha) {
    showToast("❌ E-mail ou senha incorretos!");
    return;
  }

  user = usuarioSalvo;

  updateUI();

  goTo("home");

  setNav("home");

  showToast("✅ Bem-vindo de volta!");
}

/* =========================
   CADASTRO
========================= */

function fazerCadastro() {
  const nome = document.getElementById("c-nome").value.trim();

  const sob = document.getElementById("c-sob").value.trim();

  const cpf = document.getElementById("c-cpf").value.trim();

  const tel = document.getElementById("c-tel").value.trim();

  const email = document.getElementById("c-email").value.trim();

  const senha = document.getElementById("c-senha").value;

  const cid = document.getElementById("c-cid").value.trim() || "Manaus";

  const est = document.getElementById("c-est").value;

  if (!nome || !sob || !cpf || !tel || !email || !senha) {
    showToast("⚠️ Preencha todos os campos!");
    return;
  }

  if (senha.length < 8) {
    showToast("⚠️ Senha: mínimo 8 caracteres!");
    return;
  }

  user = {
    nome,
    sobrenome: sob,
    cpf,
    tel,
    cidade: cid,
    estado: est,
    email,
    senha,
  };

  salvarUsuario();

  updateUI();

  goTo("home");

  setNav("home");

  showToast("🌿 Conta criada com sucesso!");
}

/* =========================
   ATUALIZAR TELA
========================= */

function updateUI() {
  const p = user.nome || "Usuário";

  const full = (user.nome + " " + (user.sobrenome || "")).trim();

  document.getElementById("home-nome").textContent = p;

  document.getElementById("perf-nome").textContent = full || p;

  document.getElementById("p-nome").textContent = full || p;

  document.getElementById("p-email").textContent = user.email || "";

  document.getElementById("p-tel").textContent = user.tel || "";

  document.getElementById("p-cid").textContent =
    `${user.cidade || "Manaus"} — ${user.estado || "AM"}`;
}

/* =========================
   LOGOUT
========================= */

function fazerLogout() {
  localStorage.removeItem("amazonviva_user");

  user = {};

  document.getElementById("l-email").value = "";

  document.getElementById("l-senha").value = "";

  goTo("splash");

  showToast("👋 Logout realizado!");
}

/* =========================
   MÁSCARAS
========================= */

function mCPF(i) {
  let v = i.value.replace(/\D/g, "");

  if (v.length > 11) {
    v = v.slice(0, 11);
  }

  v = v
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

  i.value = v;
}

function mTel(i) {
  let v = i.value.replace(/\D/g, "");

  if (v.length > 11) {
    v = v.slice(0, 11);
  }

  if (v.length <= 10) {
    v = v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  } else {
    v = v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  }

  i.value = v;
}

function mCEP(i) {
  let v = i.value.replace(/\D/g, "");

  if (v.length > 8) {
    v = v.slice(0, 8);
  }

  v = v.replace(/(\d{5})(\d)/, "$1-$2");

  i.value = v;
}

/* =========================
   MISSÕES
========================= */

function openMissao(id) {
  const m = MISSOES[id];

  document.getElementById("mm-tag").textContent = m.tag;

  document.getElementById("mm-titulo").textContent = m.titulo;

  document.getElementById("mm-desc").textContent = m.desc;

  document.getElementById("mm-mats").innerHTML = m.mat
    .map((x) => `<div class="mat-chip">${x}</div>`)
    .join("");

  openModal("mod-missao");
}

/* =========================
   PONTOS
========================= */

function openPonto(id) {
  const p = PONTOS[id];

  document.getElementById("mp-dist").textContent = "📍 " + p.dist + " de você";

  document.getElementById("mp-nome").textContent = p.nome;

  document.getElementById("mp-end").textContent = p.end;

  document.getElementById("mp-mats").innerHTML = p.mat
    .map((x) => `<div class="mat-chip">${x}</div>`)
    .join("");

  document.getElementById("mp-btn").onclick = () => {
    closeModal("mod-ponto");

    openAgenda(p.nome);
  };

  openModal("mod-ponto");
}

/* =========================
   AGENDAMENTO
========================= */

function openAgenda(nome) {
  document.getElementById("ag-nome").textContent = nome || "Ponto de Coleta";

  slotSel = null;

  document.querySelectorAll(".aslot").forEach((s) => {
    s.classList.remove("sel");
  });

  openModal("mod-agenda");
}

function selSlot(el) {
  document.querySelectorAll(".aslot").forEach((s) => {
    s.classList.remove("sel");
  });

  el.classList.add("sel");

  slotSel =
    el.querySelector("h4").textContent +
    " — " +
    el.querySelector("p").textContent;
}

function confirmarAgenda() {
  if (!slotSel) {
    showToast("⚠️ Escolha um horário!");
    return;
  }

  closeModal("mod-agenda");

  showToast("✅ Agendado: " + slotSel);
}

/* =========================
   MODAIS
========================= */

function openModal(id) {
  document.getElementById(id).classList.add("open");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

/* =========================
   FILTROS
========================= */

function setChip(el) {
  document.querySelectorAll(".chip").forEach((c) => {
    c.classList.remove("active");
  });

  el.classList.add("active");
}

/* =========================
   TOAST
========================= */

let tTimer;

function showToast(msg) {
  const t = document.getElementById("toast");

  t.textContent = msg;

  t.classList.add("show");

  clearTimeout(tTimer);

  tTimer = setTimeout(() => {
    t.classList.remove("show");
  }, 2800);
}

/* =========================
   AUTO LOGIN
========================= */

window.onload = () => {
  carregarUsuario();
};
