const API = `${location.protocol}//${location.hostname}:8000`;

// ── Helpers ──────────────────────────────────────────────────────────────────
const token = () => localStorage.getItem('admin_token');

async function req(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data.detail || 'Erro desconhecido';
  return data;
}

function toast(msg, err = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.background = err ? '#c0392b' : '#222';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── Estado ───────────────────────────────────────────────────────────────────
let materiais = [];
let agendamentoAtual = null;

// ── Login ────────────────────────────────────────────────────────────────────
document.getElementById('btn-login').addEventListener('click', async () => {
  const email = document.getElementById('l-email').value.trim();
  const senha = document.getElementById('l-senha').value;
  if (!email || !senha) return toast('Preencha e-mail e senha.', true);

  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  try {
    const data = await req('POST', '/auth/login', { email, senha });
    localStorage.setItem('admin_token', data.access_token);

    const me = await req('GET', '/users/me');
    if (me.role !== 'admin') {
      localStorage.removeItem('admin_token');
      return toast('Acesso negado. Conta sem permissão de admin.', true);
    }

    document.getElementById('admin-nome').textContent = me.nome;
    document.getElementById('page-login').style.display = 'none';
    document.getElementById('page-admin').style.display = 'flex';

    await carregarMateriais();
  } catch (e) {
    toast(typeof e === 'string' ? e : 'Credenciais inválidas.', true);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('l-senha').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-login').click();
});

// ── Logout ───────────────────────────────────────────────────────────────────
document.getElementById('btn-logout').addEventListener('click', () => {
  localStorage.removeItem('admin_token');
  location.reload();
});

// ── Busca ────────────────────────────────────────────────────────────────────
document.getElementById('btn-buscar').addEventListener('click', buscar);
document.getElementById('filtro').addEventListener('keydown', e => { if (e.key === 'Enter') buscar(); });

async function buscar() {
  const q = document.getElementById('filtro').value.trim();
  const container = document.getElementById('lista-agendamentos');
  container.innerHTML = '<p class="empty">Buscando…</p>';
  try {
    const lista = await req('GET', `/admin/agendamentos${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    renderTabela(lista);
  } catch (e) {
    toast(typeof e === 'string' ? e : 'Erro ao buscar agendamentos.', true);
    container.innerHTML = '<p class="empty">Erro ao carregar.</p>';
  }
}

function renderTabela(lista) {
  const container = document.getElementById('lista-agendamentos');
  if (!lista.length) {
    container.innerHTML = '<p class="empty">Nenhum agendamento em aberto encontrado.</p>';
    return;
  }

  const statusLabel = { scheduled: 'Agendado', confirmed: 'Confirmado', checked_in: 'Check-in' };
  const rows = lista.map(a => `
    <tr>
      <td>${a.id}</td>
      <td>${a.usuario_nome}<br/><small style="color:#888">${a.usuario_email}</small></td>
      <td>${a.usuario_cpf || '—'}</td>
      <td>${a.ponto_nome}</td>
      <td>${formatDate(a.data_agendada)}<br/><small>${a.janela_inicio.slice(0,5)}–${a.janela_fim.slice(0,5)}</small></td>
      <td><span class="badge badge-${a.status}">${statusLabel[a.status] || a.status}</span></td>
      <td><button class="btn-validar" onclick="abrirModal(${JSON.stringify(a).replace(/"/g, '&quot;')})">Validar</button></td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Usuário</th><th>CPF</th><th>Ponto</th><th>Data / Janela</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function formatDate(str) {
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

// ── Materiais ─────────────────────────────────────────────────────────────────
async function carregarMateriais() {
  try { materiais = await req('GET', '/admin/materiais'); } catch { materiais = []; }
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function abrirModal(ag) {
  agendamentoAtual = ag;
  document.getElementById('modal-sub').textContent =
    `Agendamento #${ag.id} · ${ag.usuario_nome} · ${formatDate(ag.data_agendada)}`;
  document.getElementById('itens-list').innerHTML = '';
  document.getElementById('obs-validar').value = '';
  document.getElementById('resultado').style.display = 'none';
  document.getElementById('btn-confirmar').disabled = false;
  adicionarItemRow();
  document.getElementById('modal-overlay').classList.add('open');
}

function fecharModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  agendamentoAtual = null;
}

document.getElementById('modal-fechar').addEventListener('click', fecharModal);
document.getElementById('btn-cancelar').addEventListener('click', fecharModal);
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) fecharModal(); });

document.getElementById('btn-add-item').addEventListener('click', adicionarItemRow);

function adicionarItemRow() {
  const list = document.getElementById('itens-list');
  const row = document.createElement('div');
  row.className = 'item-row';

  const sel = document.createElement('select');
  sel.innerHTML = '<option value="">Selecione o material…</option>' +
    materiais.map(m => `<option value="${m.id}" data-unidade="${m.unidade}">${m.nome} (${m.unidade})</option>`).join('');

  const qty = document.createElement('input');
  qty.type = 'number';
  qty.min = '0.01';
  qty.step = '0.01';
  qty.placeholder = 'Qtd';

  const rm = document.createElement('button');
  rm.className = 'btn-remove';
  rm.textContent = '✕';
  rm.onclick = () => row.remove();

  row.append(sel, qty, rm);
  list.appendChild(row);
}

// ── Confirmar ─────────────────────────────────────────────────────────────────
document.getElementById('btn-confirmar').addEventListener('click', async () => {
  const rows = document.querySelectorAll('#itens-list .item-row');
  const itens = [];

  for (const row of rows) {
    const material_id = parseInt(row.querySelector('select').value);
    const quantidade = parseFloat(row.querySelector('input').value);
    if (!material_id || !quantidade || quantidade <= 0) continue;
    itens.push({ material_id, quantidade });
  }

  if (!itens.length) return toast('Adicione ao menos um material com quantidade.', true);

  const btn = document.getElementById('btn-confirmar');
  btn.disabled = true;
  try {
    const res = await req('POST', `/admin/agendamentos/${agendamentoAtual.id}/validar`, {
      itens,
      observacoes: document.getElementById('obs-validar').value.trim() || null,
    });

    document.getElementById('res-protocolo').textContent = res.protocolo;
    document.getElementById('res-usuario').textContent = res.usuario;
    document.getElementById('res-pontos').textContent = `${res.total_pontos} pts`;
    document.getElementById('res-valor').textContent = `R$ ${res.total_valor.toFixed(2)}`;
    document.getElementById('resultado').style.display = 'block';
    document.getElementById('btn-add-item').style.display = 'none';
    document.getElementById('itens-list').style.display = 'none';
    document.getElementById('obs-validar').closest('.fg-obs').style.display = 'none';
    document.getElementById('modal-actions') && (document.querySelector('.modal-actions').style.display = 'none');

    toast(`Coleta validada! ${res.total_pontos} pts creditados.`);
    buscar(); // atualiza a lista
  } catch (e) {
    toast(typeof e === 'string' ? e : 'Erro ao validar coleta.', true);
    btn.disabled = false;
  }
});

// ── Auto-login se já tiver token ──────────────────────────────────────────────
(async () => {
  if (!token()) return;
  try {
    const me = await req('GET', '/users/me');
    if (me.role !== 'admin') { localStorage.removeItem('admin_token'); return; }
    document.getElementById('admin-nome').textContent = me.nome;
    document.getElementById('page-login').style.display = 'none';
    document.getElementById('page-admin').style.display = 'flex';
    await carregarMateriais();
  } catch {
    localStorage.removeItem('admin_token');
  }
})();
