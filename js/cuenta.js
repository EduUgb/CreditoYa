// CréditoYa — inicio de sesión y panel de cliente del MVP
(function () {
  const $ = id => document.getElementById(id);
  const fmt = amount => '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let cuenta = null;

  function mensaje(id, text, error) {
    const el = $(id);
    el.textContent = text;
    el.classList.toggle('error-texto', !!error);
    el.classList.toggle('exito-texto', !!text && !error);
  }

  function guardarCuenta() {
    try {
      CreditoYaStore.updateAccount(cuenta);
      return true;
    } catch (error) {
      mensaje('dashboardMsg', error.message || 'No se pudieron guardar los cambios en este navegador.', true);
      return false;
    }
  }

  function formatoFecha(value) {
    return new Date(value).toLocaleDateString('es-SV', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function activarPanel() {
    $('loginPanel').classList.add('oculto');
    $('dashboard').classList.remove('oculto');
    $('nombreCliente').textContent = cuenta.name.split(' ')[0];
    renderizar();
  }

  function actualizarSimulacion() {
    const principal = Number($('montoCredito').value);
    const plazo = Number($('plazoCredito').value);
    const tasa = 0.025;
    const cuota = principal * tasa / (1 - Math.pow(1 + tasa, -plazo));
    $('montoTexto').textContent = fmt(principal);
    $('plazoTexto').textContent = plazo + (plazo === 1 ? ' mes' : ' meses');
    $('cuotaCredito').textContent = fmt(cuota) + ' / mes';
    $('totalCredito').textContent = fmt(cuota * plazo);
  }

  function renderizar() {
    const plan = cuenta.subscription;
    const activa = plan.status === 'Activa';
    $('estadoPlan').textContent = plan.status;
    $('estadoPlan').classList.toggle('estado-cancelado', !activa);
    $('planPrecio').replaceChildren(document.createTextNode(fmt(Number(plan.amount)) + ' '));
    const unidad = document.createElement('small');
    unidad.textContent = '/ ' + (plan.cycle === 'anual' ? 'año' : 'mes');
    $('planPrecio').append(unidad);
    $('planDetalle').textContent = activa
      ? 'Línea de crédito de hasta $1,500 · sin fiador.'
      : 'Tu membresía está cancelada. No se cobrarán nuevos períodos de demostración.';
    $('planRenovacion').textContent = activa
      ? 'Próxima renovación: ' + formatoFecha(plan.renewsAt) + '.'
      : 'Cancelada el ' + formatoFecha(plan.cancelledAt) + '.';
    $('btnCancelarPlan').classList.toggle('oculto', !activa);
    $('btnReactivarPlan').classList.toggle('oculto', activa);
    $('btnSolicitarCredito').disabled = !activa;
    if (!activa) mensaje('creditoMsg', 'Reactiva tu plan desde el pago para enviar una nueva solicitud.', false);

    const creditos = cuenta.loans || [];
    const activos = creditos.filter(credito => credito.status === 'Aprobado' || credito.status === 'Activo');
    const pendientes = creditos.filter(credito => credito.status === 'En revisión').length;
    const saldo = activos.reduce((total, credito) => total + Number(credito.balance || credito.amount), 0);
    $('contadorCreditos').textContent = String(activos.length);
    $('contadorSolicitudes').textContent = String(pendientes);
    $('saldoDeuda').textContent = fmt(saldo);
    $('listaNotificaciones').replaceChildren();
    $('tablaCreditos').replaceChildren();
    $('sinCreditos').classList.toggle('oculto', creditos.length > 0);

    if (!(cuenta.notifications || []).length) {
      const empty = document.createElement('p');
      empty.className = 'actividad-vacia';
      empty.textContent = 'Aquí aparecerán los avisos de tu plan y tus solicitudes.';
      $('listaNotificaciones').append(empty);
    }
    (cuenta.notifications || []).forEach(notificacion => {
      const item = document.createElement('article');
      item.className = 'actividad-item' + (notificacion.read ? '' : ' sin-leer');
      const titulo = document.createElement('strong');
      titulo.textContent = notificacion.title;
      const texto = document.createElement('p');
      texto.textContent = notificacion.message;
      const fecha = document.createElement('small');
      fecha.textContent = formatoFecha(notificacion.createdAt);
      item.append(titulo, texto, fecha);
      $('listaNotificaciones').append(item);
    });

    creditos.slice().reverse().forEach(credito => {
      const fila = document.createElement('tr');
      [
        credito.reference,
        formatoFecha(credito.createdAt),
        fmt(credito.amount),
        credito.term + (credito.term === 1 ? ' mes' : ' meses'),
        credito.status,
        fmt(Number(credito.balance || 0))
      ].forEach((value, index) => {
        const celda = document.createElement('td');
        celda.textContent = value;
        if (index === 4) {
          celda.className = credito.status === 'En revisión' ? 'estado-tabla pendiente' : 'estado-tabla';
        }
        fila.append(celda);
      });
      $('tablaCreditos').append(fila);
    });
  }

  $('formLogin').addEventListener('submit', async event => {
    event.preventDefault();
    const button = $('btnLogin');
    button.disabled = true;
    mensaje('loginMsg', 'Validando tus datos…', false);
    try {
      cuenta = await CreditoYaStore.login($('loginEmail').value, $('loginPassword').value);
      mensaje('loginMsg', '', false);
      activarPanel();
    } catch (error) {
      mensaje('loginMsg', error.message || 'No se pudo iniciar sesión. Inténtalo de nuevo.', true);
    } finally {
      button.disabled = false;
    }
  });

  $('montoCredito').addEventListener('input', actualizarSimulacion);
  $('plazoCredito').addEventListener('input', actualizarSimulacion);
  actualizarSimulacion();

  $('formCredito').addEventListener('submit', event => {
    event.preventDefault();
    if (!cuenta || cuenta.subscription.status !== 'Activa') {
      mensaje('creditoMsg', 'Necesitas una membresía activa para solicitar un crédito.', true);
      return;
    }
    if (!cuenta.loans) cuenta.loans = [];
    if (cuenta.loans.some(credito => credito.status === 'En revisión')) {
      mensaje('creditoMsg', 'Ya tienes una solicitud en revisión. Espera la respuesta antes de enviar otra.', true);
      return;
    }
    const motivo = $('motivoCredito').value;
    if (!motivo) {
      mensaje('creditoMsg', 'Selecciona el motivo de tu solicitud.', true);
      $('motivoCredito').focus();
      return;
    }
    const amount = Number($('montoCredito').value);
    const term = Number($('plazoCredito').value);
    const tasa = 0.025;
    const cuota = amount * tasa / (1 - Math.pow(1 + tasa, -term));
    const reference = 'SOL-' + Date.now().toString().slice(-8);
    const loan = {
      reference,
      amount,
      term,
      purpose: motivo,
      monthlyPayment: Number(cuota.toFixed(2)),
      status: 'En revisión',
      balance: 0,
      createdAt: new Date().toISOString()
    };
    cuenta.loans.push(loan);
    cuenta.notifications.unshift(CreditoYaStore.newNotification(
      'Solicitud de microcrédito recibida',
      reference + ': ' + fmt(amount) + ' por ' + term + (term === 1 ? ' mes' : ' meses') + '. Estado: en revisión. Te avisaremos aquí cuando cambie.'
    ));
    if (!guardarCuenta()) {
      cuenta.loans.pop();
      cuenta.notifications.shift();
      return;
    }
    mensaje('creditoMsg', 'Solicitud ' + reference + ' enviada. Su estado es “En revisión”; recibirás una actualización en Notificaciones.', false);
    $('motivoCredito').value = '';
    renderizar();
  });

  $('btnLeerAvisos').addEventListener('click', () => {
    (cuenta.notifications || []).forEach(notificacion => { notificacion.read = true; });
    if (guardarCuenta()) renderizar();
  });

  $('btnCancelarPlan').addEventListener('click', () => {
    const tieneCreditoPendiente = (cuenta.loans || []).some(credito =>
      credito.status === 'Activo' || credito.status === 'Aprobado' || credito.status === 'En revisión'
    );
    if (tieneCreditoPendiente) {
      mensaje('dashboardMsg', 'No puedes cancelar el plan mientras tengas una solicitud o crédito pendiente.', true);
      return;
    }
    if (!window.confirm('¿Quieres cancelar tu membresía? La cancelación se guardará en esta demo.')) return;
    cuenta.subscription.status = 'Cancelada';
    cuenta.subscription.cancelledAt = new Date().toISOString();
    cuenta.notifications.unshift(CreditoYaStore.newNotification(
      'Membresía cancelada',
      'La renovación de tu Plan Impulso quedó cancelada. Puedes reactivarlo desde la página de pago.'
    ));
    if (guardarCuenta()) {
      mensaje('dashboardMsg', 'Membresía cancelada. La actualización quedó registrada en tu cuenta.', false);
      renderizar();
    }
  });

  $('btnLogout').addEventListener('click', () => {
    CreditoYaStore.logout();
    cuenta = null;
    $('dashboard').classList.add('oculto');
    $('loginPanel').classList.remove('oculto');
    $('loginPassword').value = '';
    mensaje('loginMsg', 'Has cerrado sesión.', false);
  });

  try {
    cuenta = CreditoYaStore.getCurrentAccount();
    if (cuenta) activarPanel();
  } catch (error) {
    mensaje('loginMsg', error.message || 'No se pudo cargar tu cuenta.', true);
  }
})();
