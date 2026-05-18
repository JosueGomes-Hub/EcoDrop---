const API_BASE = `${window.location.protocol}//${window.location.hostname}:8000`;

const api = {
  _getToken() { return localStorage.getItem('access_token'); },

  _headers(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra };
    const t = this._getToken();
    if (t) h['Authorization'] = `Bearer ${t}`;
    return h;
  },

  async _handleResponse(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, detail: data.detail || 'Erro desconhecido' };
    return data;
  },

  async _post(path, body) {
    const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: this._headers(), body: JSON.stringify(body) });
    return this._handleResponse(res);
  },

  async _get(path) {
    const res = await fetch(`${API_BASE}${path}`, { headers: this._headers() });
    return this._handleResponse(res);
  },

  async _put(path, body) {
    const res = await fetch(`${API_BASE}${path}`, { method: 'PUT', headers: this._headers(), body: JSON.stringify(body) });
    return this._handleResponse(res);
  },

  async _patch(path, body) {
    const res = await fetch(`${API_BASE}${path}`, { method: 'PATCH', headers: this._headers(), body: JSON.stringify(body) });
    return this._handleResponse(res);
  },

  // Auth
  async login(email, senha) {
    const data = await this._post('/auth/login', { email, senha });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data;
  },

  async register(userData) { return this._post('/auth/register', userData); },

  async logout() {
    const refresh_token = localStorage.getItem('refresh_token');
    if (refresh_token) await this._post('/auth/logout', { refresh_token }).catch(() => {});
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  // Usuário
  async getMe() { return this._get('/users/me'); },
  async getStats() { return this._get('/users/me/stats'); },
  async updateMe(data) { return this._put('/users/me', data); },
  async changePassword(data) { return this._patch('/users/me/password', data); },

  // Voucher / Carteira
  async getSaldo() { return this._get('/vouchers/saldo'); },
  async getHistorico(skip = 0, limit = 50) { return this._get(`/vouchers/historico?skip=${skip}&limit=${limit}`); },
  async usarVoucher(parceiro_id, beneficio_id, valor) { return this._post('/vouchers/usar', { parceiro_id, beneficio_id, valor }); },

  // Pontos de coleta
  async getPontos(material = null, city = null) {
    const params = new URLSearchParams();
    if (material) params.set('material', material);
    if (city) params.set('city', city);
    const qs = params.toString();
    return this._get(`/coleta/pontos${qs ? `?${qs}` : ''}`);
  },
  async getPonto(id) { return this._get(`/coleta/pontos/${id}`); },

  // Agendamentos
  async criarAgendamento(dados) { return this._post('/coleta/agendamentos', dados); },
  async getAgendamentos() { return this._get('/coleta/agendamentos'); },
  async cancelarAgendamento(id) {
    const res = await fetch(`${API_BASE}/coleta/agendamentos/${id}`, { method: 'DELETE', headers: this._headers() });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw { status: res.status, detail: d.detail || 'Erro' }; }
  },

  // Missões
  async getMissoes() { return this._get('/missoes'); },
  async getMissoesAtivas() { return this._get('/missoes/ativas'); },
  async getMinhasMissoes() { return this._get('/missoes/me'); },

  // Parceiros
  async getParceiros(categoria = null) { return this._get(`/parceiros${categoria ? `?categoria=${categoria}` : ''}`); },
  async getParceiro(id) { return this._get(`/parceiros/${id}`); },

  // Entregas
  async getMinhasEntregas() { return this._get('/deliveries/me'); },
  async criarEntrega(dados) { return this._post('/deliveries', dados); },
  async getEntregasPendentes() { return this._get('/deliveries/operator/pending'); },
  async revisarEntrega(deliveryId, dados) { return this._patch(`/deliveries/${deliveryId}/review`, dados); },

  // Suporte
  async getTickets() { return this._get('/support/tickets'); },
  async getTicket(id) { return this._get(`/support/tickets/${id}`); },
  async criarTicket(dados) { return this._post('/support/tickets', dados); },
  async responderTicket(id, message) { return this._post(`/support/tickets/${id}/messages`, { message }); },

  // Totem
  async totemValidarCpf(cpf) { return this._post('/totem/validar-cpf', { cpf }); },
  async totemFinalizarColeta(dados) { return this._post('/totem/finalizar-coleta', dados); },
  async totemHistorico(usuarioId) { return this._get(`/totem/historico/${usuarioId}`); },
  async totemMissaoAtiva() { return this._get('/totem/missao-ativa'); },

  isLoggedIn() { return !!this._getToken(); },
};
