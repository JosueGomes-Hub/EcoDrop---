const API = "http://localhost:5000";

let usuarioLogado = null;

async function apiPost(path, data) {
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const body = await response.json();

  if (!response.ok) {
    throw body;
  }

  return body;
}

// NAVEGAÇÃO
function goTo(id) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));

  document.getElementById(id).classList.add("active");

  const nav = document.getElementById("bnav");

  if (
    id === "home" ||
    id === "mapa" ||
    id === "carteira" ||
    id === "perfil" ||
    id === "parceiros"
  ) {
    nav.style.display = "flex";
  } else {
    nav.style.display = "none";
  }
}

// TOAST
function showToast(msg) {
  const toast = document.getElementById("toast");

  toast.innerText = msg;
  toast.style.opacity = "1";

  setTimeout(() => {
    toast.style.opacity = "0";
  }, 3000);
}

// CADASTRO
async function fazerCadastro() {
  const nome =
    document.getElementById("c-nome").value;

  const sobrenome =
    document.getElementById("c-sob").value;

  const cpf =
    document.getElementById("c-cpf").value;

  const email =
    document.getElementById("c-email").value;

  const senha =
    document.getElementById("c-senha").value;

  const telefone =
    document.getElementById("c-tel").value;

  const cep =
    document.getElementById("c-cep").value;

  const cidade =
    document.getElementById("c-cid").value;

  const estado =
    document.getElementById("c-est").value;

  try {
    await apiPost("/cadastro", {
      nome,
      sobrenome,
      cpf,
      email,
      senha,
      telefone,
      cep,
      cidade,
      estado,
    });

    showToast("✅ Conta criada com sucesso!");

    goTo("login");
  } catch (error) {
    console.log(error);

    showToast("❌ Erro ao cadastrar");
  }
}

// LOGIN
async function fazerLogin() {
  const email =
    document.getElementById("l-email").value;

  const senha =
    document.getElementById("l-senha").value;

  try {
    const data = await apiPost("/login", {
      email,
      senha,
    });

    usuarioLogado = data.usuario;

    localStorage.setItem(
      "usuario",
      JSON.stringify(usuarioLogado)
    );

    carregarUsuario();

    showToast("✅ Login realizado!");

    goTo("home");
  } catch (error) {
    console.log(error);

    showToast("❌ Email ou senha inválidos");
  }
}

// CARREGAR USUÁRIO
function carregarUsuario() {
  const user = JSON.parse(
    localStorage.getItem("usuario")
  );

  if (!user) return;

  document.getElementById(
    "home-nome"
  ).innerText = user.nome;

  document.getElementById(
    "perf-nome"
  ).innerText = user.nome;

  document.getElementById(
    "p-nome"
  ).innerText = user.nome;

  document.getElementById(
    "p-email"
  ).innerText = user.email;

  document.getElementById(
    "p-tel"
  ).innerText = user.telefone || "";

  document.getElementById(
    "p-cid"
  ).innerText = user.cidade || "";
}

// LOGOUT
function fazerLogout() {
  localStorage.removeItem("usuario");

  usuarioLogado = null;

  showToast("👋 Logout realizado");

  goTo("login");
}

// NAVBAR
function setNav(id) {
  document
    .querySelectorAll(".nav-item")
    .forEach((item) =>
      item.classList.remove("active")
    );

  document
    .getElementById(`nav-${id}`)
    .classList.add("active");
}

// MÁSCARAS
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

// AUTO LOGIN
window.onload = () => {
  const user = localStorage.getItem("usuario");

  if (user) {
    carregarUsuario();

    goTo("home");
  } else {
    goTo("splash");
  }
};
