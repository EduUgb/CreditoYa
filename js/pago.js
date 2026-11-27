// CréditoYa — lógica de la página de pago (simulada, no envía datos)
(function () {
  const $ = id => document.getElementById(id);
  const fmt = n => '$' + n.toFixed(2);

  // ---------- Resumen y precios ----------
  const PRECIOS = { mensual: { precio: 4.99, valor: 55 }, anual: { precio: 47.88, valor: 660 } };
  let cuponActivo = false;

  function calcular() {
    const plan = PRECIOS[$('ciclo').value];
    const desc = cuponActivo ? plan.precio * 0.20 : 0;
    const base = plan.precio - desc;
    const iva = base * 0.13;
    const total = base + iva;
    $('rValor').textContent = fmt(plan.valor);
    $('rSub').textContent = fmt(plan.precio);
    $('rDesc').textContent = '-' + fmt(desc);
    $('rDescLinea').classList.toggle('oculto', !cuponActivo);
    $('rIva').textContent = fmt(iva);
    $('rTotal').textContent = fmt(total);
    $('btnMonto').textContent = fmt(total);
    document.querySelectorAll('.montoAlt').forEach(el => el.textContent = fmt(total));
  }
  $('ciclo').addEventListener('change', calcular);

  $('aplicarCupon').addEventListener('click', () => {
    const codigo = $('cupon').value.trim().toUpperCase();
    const msg = $('cuponMsg');
    if (codigo === 'IMPULSO') {
      cuponActivo = true;
      msg.textContent = '✓ Cupón aplicado: 20% de descuento';
      msg.style.color = 'var(--verde)';
    } else {
      cuponActivo = false;
      msg.textContent = codigo ? 'Cupón no válido. Prueba con IMPULSO' : 'Escribe un código.';
      msg.style.color = 'var(--rojo)';
    }
    calcular();
  });
  calcular();

  // ---------- Métodos de pago ----------
  const paneles = { tarjeta: $('formTarjeta'), transfer: $('panelTransfer'), paypal: $('panelPaypal') };
  document.querySelectorAll('.metodo').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.metodo').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      Object.entries(paneles).forEach(([k, el]) => el.classList.toggle('oculto', k !== btn.dataset.metodo));
    });
  });
  $('conceptoRef').textContent = 'IMPULSO-' + Math.floor(100000 + Math.random() * 900000);

  // ---------- Detección de marca ----------
  const MARCAS = [
    { id: 'amex', nombre: 'AMEX', re: /^3[47]/, largo: [15], cvv: 4, grad: 'linear-gradient(135deg,#2e77bc,#1b4f80)' },
    { id: 'diners', nombre: 'Diners Club', re: /^3(0[0-5]|[68])/, largo: [14], cvv: 3, grad: 'linear-gradient(135deg,#0079be,#2a2f45)' },
    { id: 'jcb', nombre: 'JCB', re: /^35/, largo: [16], cvv: 3, grad: 'linear-gradient(135deg,#0b7d3e,#0e4c7a)' },
    { id: 'visa', nombre: 'VISA', re: /^4/, largo: [13, 16, 19], cvv: 3, grad: 'linear-gradient(135deg,#1a1f71,#3b46c4)' },
    { id: 'mastercard', nombre: 'Mastercard', re: /^(5[1-5]|2[2-7])/, largo: [16], cvv: 3, grad: 'linear-gradient(135deg,#222,#eb001b 120%)' },
    { id: 'discover', nombre: 'Discover', re: /^(6011|65|64[4-9])/, largo: [16, 19], cvv: 3, grad: 'linear-gradient(135deg,#e55c20,#7a2d0c)' }
  ];
  const GRAD_DEF = 'linear-gradient(135deg, #533d93, #7a5fd0 60%, #f47d0a)';
  const detectar = num => MARCAS.find(m => m.re.test(num)) || null;

  function luhn(num) {
    let suma = 0, dobla = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let d = +num[i];
      if (dobla) { d *= 2; if (d > 9) d -= 9; }
      suma += d; dobla = !dobla;
    }
    return suma % 10 === 0;
  }

  const numero = $('numero');
  numero.addEventListener('input', () => {
    const limpio = numero.value.replace(/\D/g, '').slice(0, 19);
    const marca = detectar(limpio);
    // Formato: AMEX 4-6-5, resto grupos de 4
    numero.value = marca && marca.id === 'amex'
      ? limpio.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '))
      : limpio.replace(/(\d{4})(?=\d)/g, '$1 ');
    $('tvNum').textContent = numero.value || '•••• •••• •••• ••••';
    $('tvMarca').textContent = marca ? marca.nombre : 'CréditoYa';
    $('icoMarca').textContent = marca ? marca.nombre : '';
    $('tarjetaVisual').style.background = marca ? marca.grad : GRAD_DEF;
    const cont = $('marcas');
    cont.classList.toggle('todas', !marca);
    cont.querySelectorAll('.marca-tj').forEach(el => el.classList.toggle('detectada', !!marca && el.dataset.marca === marca.id));
    $('cvv').maxLength = marca ? marca.cvv : 4;
    limpiarError(numero);
  });

  $('nombre').addEventListener('input', e => {
    $('tvNombre').textContent = e.target.value.toUpperCase() || 'NOMBRE APELLIDO';
    limpiarError(e.target);
  });

  $('vence').addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
    e.target.value = v;
    $('tvVence').textContent = v || 'MM/AA';
    limpiarError(e.target);
  });

  $('cvv').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); limpiarError(e.target); });

  $('dui').addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 9);
    if (v.length > 8) v = v.slice(0, 8) + '-' + v.slice(8);
    e.target.value = v;
    limpiarError(e.target);
  });
  ['email', 'nombreCuenta', 'passwordCuenta', 'passwordConfirmar', 'depto'].forEach(id => {
    $(id).addEventListener('input', e => {
      limpiarError(e.target);
      $('cuentaMsg').textContent = '';
      $('cuentaMsg').classList.remove('error-texto');
    });
  });

  // ---------- Validación ----------
  function marcarError(el, mal) { el.closest('.campo').classList.toggle('error', mal); return !mal; }
  function limpiarError(el) { const c = el.closest('.campo'); if (c) c.classList.remove('error'); }

  function validarCuenta() {
    let ok = true;
    const email = $('email').value.trim();
    ok = marcarError($('email'), !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) && ok;
    ok = marcarError($('nombreCuenta'), $('nombreCuenta').value.trim().length < 3) && ok;
    ok = marcarError($('passwordCuenta'), $('passwordCuenta').value.length < 8) && ok;
    ok = marcarError($('passwordConfirmar'), $('passwordConfirmar').value !== $('passwordCuenta').value || !$('passwordConfirmar').value) && ok;
    ok = marcarError($('dui'), !/^\d{8}-\d$/.test($('dui').value)) && ok;
    ok = marcarError($('depto'), !$('depto').value) && ok;

    if (!$('terminos').checked) {
      ok = false;
      $('terminos').parentElement.style.color = 'var(--rojo)';
    } else {
      $('terminos').parentElement.style.color = '';
    }
    return ok;
  }

  function validar() {
    let ok = validarCuenta();

    const num = numero.value.replace(/\D/g, '');
    const marca = detectar(num);
    ok = marcarError(numero, !(marca && marca.largo.includes(num.length) && luhn(num))) && ok;

    ok = marcarError($('nombre'), $('nombre').value.trim().length < 3) && ok;

    const [mm, aa] = $('vence').value.split('/').map(Number);
    const hoy = new Date();
    const finMes = new Date(2000 + (aa || 0), mm || 0, 1);
    ok = marcarError($('vence'), !(mm >= 1 && mm <= 12 && aa >= 0 && finMes > hoy)) && ok;

    const cvvLargo = marca ? marca.cvv : 3;
    ok = marcarError($('cvv'), $('cvv').value.length !== cvvLargo) && ok;

    return ok;
  }

  // ---------- Envío simulado ----------
  function exito(referencia) {
    $('refPago').textContent = referencia;
    $('modal').classList.remove('oculto');
    document.querySelectorAll('.progreso > div').forEach(d => { d.classList.remove('actual'); d.classList.add('hecho'); d.querySelector('b').textContent = '✓'; });
  }

  async function procesar(btn) {
    if (!validarCuenta()) {
      const primero = document.querySelector('.campo.error input, .campo.error select');
      if (primero) primero.focus();
      return;
    }
    $('cuentaMsg').textContent = '';
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Procesando pago de demostración…';
    try {
      await CreditoYaStore.checkCheckoutAccount($('email').value, $('passwordCuenta').value);
      await new Promise(resolve => setTimeout(resolve, 1200));
      const referencia = 'CY-' + Date.now().toString().slice(-8);
      const ciclo = $('ciclo').value;
      const total = Number($('rTotal').textContent.replace('$', ''));
      const renewsAt = new Date();
      renewsAt.setMonth(renewsAt.getMonth() + (ciclo === 'anual' ? 12 : 1));
      await CreditoYaStore.createOrRenewAccount({
        email: $('email').value,
        name: $('nombreCuenta').value.trim(),
        password: $('passwordCuenta').value,
        subscription: {
          plan: 'Plan Impulso',
          status: 'Activa',
          cycle: ciclo,
          amount: total,
          reference: referencia,
          paidAt: new Date().toISOString(),
          renewsAt: renewsAt.toISOString()
        }
      });
      exito(referencia);
    } catch (error) {
      $('cuentaMsg').textContent = error.message || 'No se pudo completar el pago de demostración. Inténtalo nuevamente.';
      $('cuentaMsg').classList.add('error-texto');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  }

  $('formTarjeta').addEventListener('submit', e => {
    e.preventDefault();
    if (!validar()) {
      const primero = document.querySelector('.campo.error input, .campo.error select');
      if (primero) primero.focus();
      return;
    }
    void procesar($('btnPagar'));
  });
  document.querySelectorAll('[data-confirmar]').forEach(b => b.addEventListener('click', () => { void procesar(b); }));

  $('modal').addEventListener('click', e => { if (e.target.id === 'modal') e.target.classList.add('oculto'); });
})();
