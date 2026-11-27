// CréditoYa — persistencia local del MVP (datos de demostración)
(function () {
  const ACCOUNTS_KEY = 'creditoya.accounts.v1';
  const SESSION_KEY = 'creditoya.session.v1';

  function readAccounts() {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return {};
    const accounts = JSON.parse(raw);
    if (!accounts || typeof accounts !== 'object' || Array.isArray(accounts)) {
      throw new Error('No se pudieron leer las cuentas guardadas. Limpia los datos locales de la demo e inténtalo de nuevo.');
    }
    return accounts;
  }

  function saveAccounts(accounts) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  function normalizeEmail(email) {
    return email.trim().toLowerCase();
  }

  function encode(bytes) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(bytes)));
  }

  function decode(value) {
    return Uint8Array.from(atob(value), character => character.charCodeAt(0));
  }

  async function hashPassword(password, salt) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Este navegador no permite proteger la contraseña en esta dirección. Abre el sitio con HTTPS o en localhost.');
    }
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt,
      iterations: 120000,
      hash: 'SHA-256'
    }, key, 256);
    return encode(bits);
  }

  function newNotification(title, message) {
    return {
      id: 'NT-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title,
      message,
      createdAt: new Date().toISOString(),
      read: false
    };
  }

  function setSession(email) {
    sessionStorage.setItem(SESSION_KEY, email);
  }

  function getAccount(email) {
    return readAccounts()[normalizeEmail(email)] || null;
  }

  async function checkCheckoutAccount(email, password) {
    const account = getAccount(email);
    if (!account) return;
    if (account.subscription && account.subscription.status === 'Activa') {
      throw new Error('Ya existe una cuenta con un plan activo para este correo. Inicia sesión para continuar.');
    }
    const passwordHash = await hashPassword(password, decode(account.password.salt));
    if (passwordHash !== account.password.hash) {
      throw new Error('La contraseña no coincide con la cuenta existente.');
    }
  }

  function getCurrentAccount() {
    const email = sessionStorage.getItem(SESSION_KEY);
    if (!email) return null;
    const account = getAccount(email);
    if (!account) sessionStorage.removeItem(SESSION_KEY);
    return account;
  }

  async function createOrRenewAccount(data) {
    const accounts = readAccounts();
    const email = normalizeEmail(data.email);
    const existing = accounts[email];
    let account;

    if (existing) {
      if (existing.subscription && existing.subscription.status === 'Activa') {
        throw new Error('Ya existe una cuenta con un plan activo para este correo. Inicia sesión para continuar.');
      }
      const passwordHash = await hashPassword(data.password, decode(existing.password.salt));
      if (passwordHash !== existing.password.hash) {
        throw new Error('La contraseña no coincide con la cuenta existente.');
      }
      account = existing;
      account.name = data.name;
      account.subscription = data.subscription;
      account.notifications.unshift(newNotification(
        'Plan Impulso reactivado',
        'Tu pago de demostración fue registrado. La renovación está activa en esta cuenta.'
      ));
    } else {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const passwordHash = await hashPassword(data.password, salt);
      account = {
        name: data.name,
        email,
        password: { salt: encode(salt), hash: passwordHash },
        createdAt: new Date().toISOString(),
        subscription: data.subscription,
        loans: [],
        notifications: [newNotification(
          'Plan Impulso activo',
          'El pago de demostración fue registrado. Ya puedes solicitar un microcrédito desde tu panel.'
        )]
      };
    }

    accounts[email] = account;
    saveAccounts(accounts);
    setSession(email);
    return account;
  }

  async function login(email, password) {
    const account = getAccount(email);
    if (!account) throw new Error('No encontramos una cuenta con ese correo. Activa tu plan desde la página de pago.');
    const passwordHash = await hashPassword(password, decode(account.password.salt));
    if (passwordHash !== account.password.hash) throw new Error('La contraseña no es correcta.');
    setSession(account.email);
    return account;
  }

  function updateAccount(account) {
    const accounts = readAccounts();
    const email = normalizeEmail(account.email);
    if (!accounts[email]) throw new Error('La cuenta ya no está disponible. Inicia sesión nuevamente.');
    accounts[email] = account;
    saveAccounts(accounts);
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  window.CreditoYaStore = {
    checkCheckoutAccount,
    createOrRenewAccount,
    getAccount,
    getCurrentAccount,
    login,
    logout,
    newNotification,
    normalizeEmail,
    updateAccount
  };
})();
