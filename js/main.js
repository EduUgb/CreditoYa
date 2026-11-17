// CréditoYa — interacciones de la landing page
(function () {
  // ----- Menú móvil -----
  const menuBtn = document.getElementById('menuBtn');
  const nav = document.getElementById('nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const abierto = nav.classList.toggle('abierto');
      menuBtn.classList.toggle('abierto', abierto);
      menuBtn.setAttribute('aria-expanded', abierto);
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('abierto');
      menuBtn.classList.remove('abierto');
      menuBtn.setAttribute('aria-expanded', 'false');
    }));
  }

  // ----- Animación al hacer scroll -----
  const elementos = document.querySelectorAll('.revelar');
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entradas => {
      entradas.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    elementos.forEach(el => obs.observe(el));
  } else {
    elementos.forEach(el => el.classList.add('visible'));
  }

  // ----- FAQ acordeón -----
  document.querySelectorAll('.faq-item button').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const resp = item.querySelector('.faq-resp');
      const abierto = item.classList.toggle('abierto');
      btn.setAttribute('aria-expanded', abierto);
      resp.style.maxHeight = abierto ? resp.scrollHeight + 'px' : 0;
    });
  });

  // ----- Simulador del mockup -----
  const TASA_MENSUAL = 0.025; // 2.5% mensual referencial
  const rMonto = document.getElementById('rangoMonto');
  const rPlazo = document.getElementById('rangoPlazo');
  const fmt = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function simular() {
    if (!rMonto) return;
    const p = +rMonto.value, n = +rPlazo.value, i = TASA_MENSUAL;
    const cuota = p * i / (1 - Math.pow(1 + i, -n));
    document.getElementById('simMonto').textContent = '$' + p.toLocaleString('en-US');
    document.getElementById('simPlazoTxt').textContent = n + (n === 1 ? ' mes' : ' meses');
    document.getElementById('simCuota').textContent = fmt(cuota);
    document.getElementById('simTotal').textContent = fmt(cuota * n);
  }
  if (rMonto) {
    rMonto.addEventListener('input', simular);
    rPlazo.addEventListener('input', simular);
    simular();
  }

  // ----- Cuenta regresiva (urgencia) hasta la medianoche -----
  const cuenta = document.getElementById('cuentaRegresiva');
  function tick() {
    const ahora = new Date();
    const fin = new Date(ahora); fin.setHours(24, 0, 0, 0);
    let s = Math.max(0, Math.floor((fin - ahora) / 1000));
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    cuenta.textContent = `${h}:${m}:${ss}`;
  }
  if (cuenta) { tick(); setInterval(tick, 1000); }
})();
