/* ══════════════════════════════════════════
   ESTADO GLOBAL
══════════════════════════════════════════ */
let novedades = [];
let ultimoCalculo = null;

// Modo de redondeo: 'ninguno' | 'miles' | 'centenas' | 'manual'
let modoRedondeo = 'ninguno';
// Valor manual ingresado por el usuario (solo aplica si modoRedondeo === 'manual')
let valorManualRedondeo = null;

/* ══════════════════════════════════════════
   FORMATO EN TIEMPO REAL (inputs con puntos)
══════════════════════════════════════════ */
function fmtInput(input) {
  // Quitar todo lo que no sea dígito
  const raw = input.value.replace(/\D/g, '');
  // Guardar posición del cursor
  const pos = input.selectionStart;
  const prevLen = input.value.length;
  // Formatear con puntos
  input.value = raw ? raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
  // Restaurar cursor ajustando por los puntos añadidos
  const diff = input.value.length - prevLen;
  try { input.setSelectionRange(pos + diff, pos + diff); } catch(e) {}
}

function getVal(id) {
  // Leer valor de un input formateado, devolver número limpio
  const v = document.getElementById(id).value.replace(/\./g, '').trim();
  return parseInt(v, 10) || 0;
}

/* ══════════════════════════════════════════
   FORMATO DE FECHA (sin depender del locale)
══════════════════════════════════════════ */
const DIAS   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MESES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function fmtFechaLarga(fechaStr) {
  // fechaStr = 'YYYY-MM-DD'
  const d = new Date(fechaStr + 'T12:00:00');
  return DIAS[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
}

function fmtFechaCorta(fechaStr) {
  const d = new Date(fechaStr + 'T12:00:00');
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  return dd + '/' + mm + '/' + d.getFullYear();
}

/* ══════════════════════════════════════════
   SPLASH → APP
══════════════════════════════════════════ */
function entrarApp() {
  const splash = document.getElementById('splash');
  splash.classList.add('fade-out');
  setTimeout(() => {
    splash.classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  }, 620);
}

/* ══════════════════════════════════════════
   NOVEDADES
══════════════════════════════════════════ */
function agregarNovedad() {
  const tipo  = document.getElementById('nov-tipo').value;
  const desc  = document.getElementById('nov-desc').value.trim();
  const valor = getVal('nov-valor');

  if (!desc)                      { alert('Por favor escribe una descripción.'); return; }
  if (isNaN(valor) || valor <= 0) { alert('El valor debe ser mayor a 0.'); return; }

  novedades.push({ tipo: String(tipo), desc: String(desc), valor: valor });
  document.getElementById('nov-desc').value  = '';
  document.getElementById('nov-valor').value = '';
  renderNovedades();
}

function eliminarNovedad(i) {
  novedades.splice(i, 1);
  renderNovedades();
}

function renderNovedades() {
  const tbody   = document.getElementById('tbody-novedades');
  const lista   = document.getElementById('lista-novedades');
  const totalEl = document.getElementById('total-novedades-val');

  tbody.innerHTML = '';
  let total = 0;

  for (let i = 0; i < novedades.length; i++) {
    const n = novedades[i];
    const v = parseInt(n.valor, 10) || 0;
    total += v;
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + n.tipo + '</td>' +
      '<td>' + n.desc + '</td>' +
      '<td>' + fmt(v) + '</td>' +
      '<td><button class="btn-del" onclick="eliminarNovedad(' + i + ')">✕</button></td>';
    tbody.appendChild(tr);
  }

  totalEl.textContent = fmt(total);
  lista.classList.toggle('hidden', novedades.length === 0);
}

/* ══════════════════════════════════════════
   REDONDEO PERSONALIZADO
   Solo afecta la ganancia del conductor.
══════════════════════════════════════════ */
function setRedondeoSelect(sel) {
  modoRedondeo = sel.value;
  const manualWrap = document.getElementById('rnd-manual-wrap');

  if (modoRedondeo === 'manual') {
    manualWrap.classList.remove('hidden');
  } else {
    manualWrap.classList.add('hidden');
    valorManualRedondeo = null;
  }

  if (ultimoCalculo) renderProcedimiento(ultimoCalculo);
}

function aplicarRedondeoManual() {
  const val = getVal('rnd-manual-val');
  valorManualRedondeo = val > 0 ? val : null;
  if (ultimoCalculo) renderProcedimiento(ultimoCalculo);
}

/**
 * Aplica el redondeo configurado SOLO a la ganancia del conductor.
 * Retorna el valor redondeado (o el exacto si no hay redondeo).
 */
function redondearGanancia(gananciaExacta) {
  if (modoRedondeo === 'ninguno') return gananciaExacta;
  if (modoRedondeo === 'miles')   return Math.floor(gananciaExacta / 1000) * 1000;
  if (modoRedondeo === 'centenas') return Math.floor(gananciaExacta / 100) * 100;
  if (modoRedondeo === 'manual')  return valorManualRedondeo !== null ? valorManualRedondeo : gananciaExacta;
  return gananciaExacta;
}

function hayRedondeo() {
  if (modoRedondeo === 'ninguno') return false;
  if (modoRedondeo === 'manual' && valorManualRedondeo === null) return false;
  return true;
}

function etiquetaRedondeo() {
  if (modoRedondeo === 'miles')    return 'A miles';
  if (modoRedondeo === 'centenas') return 'A centenas';
  if (modoRedondeo === 'manual')   return 'Valor manual';
  return '';
}

/* ══════════════════════════════════════════
   CALCULAR
══════════════════════════════════════════ */
function calcular() {
  const fecha     = document.getElementById('fecha').value;
  const producido = getVal('producido');
  const tanqueada = getVal('tanqueada');

  if (!fecha)         { alert('Selecciona la fecha.'); return; }
  if (producido <= 0) { alert('Ingresa el producido del día.'); return; }

  // ── Paso 1: Producido − Tanqueada ──
  const subtotal1 = producido - tanqueada;

  // ── Paso 2: Ganancia exacta del conductor (25%) ──
  const ganConductorExacto = subtotal1 * 0.25;

  // ── Paso 3: Redondeo SOLO sobre la ganancia del conductor ──
  const ganConductorFinal = redondearGanancia(ganConductorExacto);

  // ── Paso 4: Subtotal − Ganancia conductor ──
  const subtotal2 = subtotal1 - ganConductorFinal;

  // ── Paso 5: Gastos extra ──
  let totalGastos = 0;
  for (let i = 0; i < novedades.length; i++) {
    totalGastos += parseInt(novedades[i].valor, 10) || 0;
  }

  // ── Paso 6: Libre del carro ──
  const libreCarro = subtotal2 - totalGastos;
  const libreCarroFinal = libreCarro < 0 ? 0 : libreCarro;

  ultimoCalculo = {
    producido,
    tanqueada,
    subtotal1,
    ganConductorExacto,
    ganConductorFinal,
    subtotal2,
    totalGastos,
    libreCarroFinal,
    modoRedondeo,
    valorManualRedondeo,
    novedadesSnap: JSON.parse(JSON.stringify(novedades))
  };

  // ── Resultados resumidos ──
  document.getElementById('res-total-final').textContent =
    libreCarroFinal > 0 ? fmt(libreCarroFinal) : 'Sin ganancia';
  document.getElementById('res-conductor').textContent = fmt(ganConductorFinal);

  document.getElementById('sec-resultados').classList.remove('hidden');
  document.getElementById('sec-motivador').classList.remove('hidden');

  // ── Procedimiento ──
  renderProcedimiento(ultimoCalculo);
  document.getElementById('sec-procedimiento').classList.remove('hidden');

  // ── Historial — guardar snapshot completo ──
  guardarHistorial({
    fecha,
    tanqueada,
    producido,
    totalGastos,
    totalFinal:         libreCarroFinal,
    ganConductorExacto,
    ganConductorFinal,
    novedades:          JSON.parse(JSON.stringify(novedades)),
    calculo: {
      subtotal1,
      ganConductorExacto,
      ganConductorFinal,
      subtotal2,
      totalGastos,
      libreCarroFinal
    },
    modoRedondeo,
    valorManualRedondeo
  });

  document.getElementById('sec-resultados').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ══════════════════════════════════════════
   RENDERIZAR PROCEDIMIENTO (app)
══════════════════════════════════════════ */
function renderProcedimiento(c) {
  // Si ya calculamos con un modo de redondeo anterior, recalcular con el actual
  const ganFinal   = redondearGanancia(c.ganConductorExacto);
  const subtotal2  = c.subtotal1 - ganFinal;
  const libreCarro = Math.max(0, subtotal2 - c.totalGastos);

  // ── Bloque exacto (siempre) ──
  document.getElementById('proc-producido').textContent = fmt(c.producido);
  document.getElementById('proc-tanqueada').textContent = fmt(c.tanqueada);
  document.getElementById('proc-subtotal1').textContent = fmt(c.subtotal1);
  document.getElementById('proc-conductor').textContent = fmt(c.ganConductorExacto);
  document.getElementById('proc-subtotal2').textContent = fmt(c.subtotal1 - c.ganConductorExacto);
  document.getElementById('proc-gastos').textContent    = fmt(c.totalGastos);
  document.getElementById('proc-libre').textContent     = fmt(Math.max(0, c.subtotal1 - c.ganConductorExacto - c.totalGastos));

  const roundBlock = document.getElementById('proc-round-block');

  if (!hayRedondeo() || ganFinal === c.ganConductorExacto) {
    roundBlock.classList.add('hidden');
    // Actualizar resultados resumidos con valor exacto
    document.getElementById('res-conductor').textContent   = fmt(c.ganConductorExacto);
    document.getElementById('res-total-final').textContent =
      (Math.max(0, c.subtotal1 - c.ganConductorExacto - c.totalGastos) > 0)
        ? fmt(Math.max(0, c.subtotal1 - c.ganConductorExacto - c.totalGastos))
        : 'Sin ganancia';
    return;
  }

  // ── Bloque redondeado ──
  roundBlock.classList.remove('hidden');

  document.getElementById('rnd-producido').textContent  = fmt(c.producido);
  document.getElementById('rnd-tanqueada').textContent  = fmt(c.tanqueada);
  document.getElementById('rnd-subtotal1').textContent  = fmt(c.subtotal1);
  document.getElementById('rnd-conductor').textContent  = fmt(ganFinal);
  document.getElementById('rnd-subtotal2').textContent  = fmt(subtotal2);
  document.getElementById('rnd-gastos').textContent     = fmt(c.totalGastos);
  document.getElementById('rnd-libre').textContent      = fmt(libreCarro);

  document.getElementById('round-tag-label').textContent = etiquetaRedondeo();

  const diff = Math.abs(c.ganConductorExacto - ganFinal);
  document.getElementById('proc-diff-val').textContent = fmt(diff);

  // Actualizar resultados resumidos con valor redondeado
  document.getElementById('res-conductor').textContent   = fmt(ganFinal);
  document.getElementById('res-total-final').textContent = libreCarro > 0 ? fmt(libreCarro) : 'Sin ganancia';
}

/* ══════════════════════════════════════════
   MODAL FACTURA (cálculo actual)
══════════════════════════════════════════ */
function verFactura() {
  if (!ultimoCalculo) return;
  const c = ultimoCalculo;

  // Recalcular con el redondeo activo en este momento
  const ganFinal   = redondearGanancia(c.ganConductorExacto);
  const subtotal2  = c.subtotal1 - ganFinal;
  const libreCarro = Math.max(0, subtotal2 - c.totalGastos);

  const fecha = document.getElementById('fecha').value;
  const fechaFmt = fmtFechaLarga(fecha);

  document.getElementById('f-fecha').textContent       = fechaFmt;
  document.getElementById('f-tanqueada').textContent   = fmt(c.tanqueada);
  document.getElementById('f-producido').textContent   = fmt(c.producido);
  document.getElementById('f-gastos').textContent      = fmt(c.totalGastos);
  document.getElementById('f-total-final').textContent = libreCarro > 0 ? fmt(libreCarro) : 'Sin ganancia';

  // Mostrar solo el valor final usado (redondeado si aplica, exacto si no)
  document.getElementById('f-conductor').textContent = fmt(ganFinal);
  document.getElementById('f-redondeo-row').classList.add('hidden');

  // Novedades
  const fLista = document.getElementById('f-novedades-lista');
  fLista.innerHTML = '';
  const novs = c.novedadesSnap || [];
  if (novs.length === 0) {
    fLista.innerHTML = '<p style="color:#aaa;font-size:.8rem;padding:.3rem 0;">Sin novedades</p>';
  } else {
    for (let i = 0; i < novs.length; i++) {
      const n = novs[i];
      const div = document.createElement('div');
      div.className = 'factura-row sub';
      div.innerHTML = '<span>' + n.tipo + ' – ' + n.desc + '</span><span>' + fmt(parseInt(n.valor,10)||0) + '</span>';
      fLista.appendChild(div);
    }
  }

  document.getElementById('modal-factura').classList.remove('hidden');
}

function cerrarFactura(e) {
  if (!e || e.target.id === 'modal-factura') {
    document.getElementById('modal-factura').classList.add('hidden');
  }
}

async function descargarFactura() {
  const el = document.getElementById('factura-content');
  try {
    const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
    const link = document.createElement('a');
    link.download = 'comprobante-' + (document.getElementById('f-fecha').textContent || 'dia') + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    alert('No se pudo generar la imagen. Intenta de nuevo.');
  }
}

/* ══════════════════════════════════════════
   MODAL COMPROBANTE HISTORIAL
══════════════════════════════════════════ */
function verComprobante(idx, lista) {
  const h   = lista || window._historialActual || [];
  const reg = h[idx];
  if (!reg) return;

  const fechaFmt = reg.fecha ? fmtFechaLarga(reg.fecha) : '—';

  document.getElementById('hf-fecha').textContent     = fechaFmt;
  document.getElementById('hf-tanqueada').textContent = fmt(reg.tanqueada || 0);
  document.getElementById('hf-producido').textContent = fmt(reg.producido || 0);
  document.getElementById('hf-gastos').textContent    = fmt(reg.totalGastos || 0);
  document.getElementById('hf-total-final').textContent =
    (reg.totalFinal > 0) ? fmt(reg.totalFinal) : 'Sin ganancia';

  // Mostrar solo el valor final usado (redondeado si aplica, exacto si no)
  const final = reg.ganConductorFinal !== undefined ? reg.ganConductorFinal : (reg.ganConductorExacto || 0);
  document.getElementById('hf-conductor').textContent = fmt(final);
  document.getElementById('hf-redondeo-row').classList.add('hidden');

  // Novedades
  const novLista = document.getElementById('hf-novedades-lista');
  novLista.innerHTML = '';
  const novs = reg.novedades || [];
  if (novs.length === 0) {
    novLista.innerHTML = '<p style="color:#aaa;font-size:.8rem;padding:.3rem 0;">Sin novedades</p>';
  } else {
    for (let i = 0; i < novs.length; i++) {
      const n   = novs[i];
      const div = document.createElement('div');
      div.className = 'factura-row sub';
      div.innerHTML = '<span>' + n.tipo + ' – ' + n.desc + '</span><span>' + fmt(parseInt(n.valor,10)||0) + '</span>';
      novLista.appendChild(div);
    }
  }

  // Procedimiento guardado
  const procBox = document.getElementById('hf-procedimiento');
  procBox.innerHTML = '';
  const c = reg.calculo;
  if (c) {
    const ganUsada = c.ganConductorFinal !== undefined ? c.ganConductorFinal : (c.ganConductorExacto || c.ganConductor || 0);
    const sub2     = c.subtotal1 - ganUsada;

    procBox.innerHTML =
      '<div class="hf-proc-row"><span>Producido</span><span>' + fmt(reg.producido) + '</span></div>' +
      '<div class="hf-proc-op"><span>− Tanqueada</span><span>' + fmt(reg.tanqueada) + '</span></div>' +
      '<div class="hf-proc-sub"><span>Subtotal</span><span>' + fmt(c.subtotal1) + '</span></div>' +
      '<div class="hf-proc-op"><span>− Ganancia conductor (25%)</span><span>' + fmt(ganUsada) + '</span></div>' +
      '<div class="hf-proc-sub"><span>Subtotal − Conductor</span><span>' + fmt(sub2) + '</span></div>' +
      '<div class="hf-proc-op"><span>− Gastos extra</span><span>' + fmt(c.totalGastos) + '</span></div>' +
      '<div class="hf-proc-final"><span>🚗 Libre del Carro</span><span>' + fmt(c.libreCarroFinal) + '</span></div>';
  } else {
    procBox.innerHTML = '<p style="color:#aaa;font-size:.8rem">Sin datos de procedimiento</p>';
  }

  document.getElementById('modal-hist').classList.remove('hidden');
}

function cerrarHistModal(e) {
  if (!e || e.target.id === 'modal-hist') {
    document.getElementById('modal-hist').classList.add('hidden');
  }
}

async function descargarHistFactura() {
  const el = document.getElementById('hist-factura-content');
  try {
    const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
    const link = document.createElement('a');
    const fecha = document.getElementById('hf-fecha').textContent || 'historial';
    link.download = 'comprobante-' + fecha + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    alert('No se pudo generar la imagen. Intenta de nuevo.');
  }
}

/* ══════════════════════════════════════════
   HISTORIAL — FIREBASE FIRESTORE
   Sincronizado en todos los dispositivos
══════════════════════════════════════════ */
const LS_KEY = 'leandro_historial'; // fallback local

// Referencia a Firestore (se inicializa en DOMContentLoaded)
let db = null;
const COL = 'historial'; // nombre de la colección en Firestore

function getHistorialLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}

async function guardarHistorial(reg) {
  // Siempre guardar local como respaldo
  const h = getHistorialLocal();
  h.unshift(reg);
  localStorage.setItem(LS_KEY, JSON.stringify(h));

  // Guardar en Firebase si está disponible
  if (db) {
    try {
      await db.collection(COL).add({
        ...reg,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('Guardado en Firebase ✅');
    } catch(e) {
      console.warn('Error Firebase, guardado solo local:', e);
    }
  }
  cargarHistorial();
}

async function eliminarRegistro(id) {
  // id puede ser índice local o docId de Firebase
  if (db) {
    try {
      await db.collection(COL).doc(id).delete();
    } catch(e) {
      // Si falla, eliminar localmente por índice
      const h = getHistorialLocal();
      h.splice(id, 1);
      localStorage.setItem(LS_KEY, JSON.stringify(h));
    }
  } else {
    const h = getHistorialLocal();
    h.splice(id, 1);
    localStorage.setItem(LS_KEY, JSON.stringify(h));
  }
  cargarHistorial();
}

async function limpiarHistorial() {
  if (!confirm('¿Eliminar todo el historial? Esta acción no se puede deshacer.')) return;

  if (db) {
    try {
      const snap = await db.collection(COL).get();
      const batch = db.batch();
      snap.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch(e) { console.warn(e); }
  }
  localStorage.removeItem(LS_KEY);
  cargarHistorial();
}

// Cargar historial desde Firebase (o local si no hay conexión)
async function cargarHistorial() {
  if (db) {
    try {
      const snap = await db.collection(COL)
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();
      const registros = [];
      snap.forEach(doc => registros.push({ ...doc.data(), _docId: doc.id }));
      renderHistorial(registros);
      return;
    } catch(e) {
      console.warn('No se pudo cargar Firebase, usando local:', e);
    }
  }
  // Fallback: usar localStorage
  renderHistorial(getHistorialLocal().map((r, i) => ({ ...r, _docId: i })));
}

function renderHistorial(registros) {
  const h     = registros || [];
  const tbody = document.getElementById('tbody-historial');
  const wrap  = document.getElementById('historial-tabla-wrap');
  const vacio = document.getElementById('historial-vacio');

  tbody.innerHTML = '';

  if (h.length === 0) {
    wrap.classList.add('hidden');
    vacio.classList.remove('hidden');
    return;
  }

  wrap.classList.remove('hidden');
  vacio.classList.add('hidden');

  for (let i = 0; i < h.length; i++) {
    const r = h[i];
    const fechaStr   = r.fecha ? fmtFechaCorta(r.fecha) : '—';
    const ganMostrar = r.ganConductorFinal !== undefined ? r.ganConductorFinal : (r.ganConductorExacto || 0);
    const docId      = r._docId !== undefined ? r._docId : i;
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + fechaStr + '</td>' +
      '<td>' + fmt(r.tanqueada || 0) + '</td>' +
      '<td>' + fmt(r.producido || 0) + '</td>' +
      '<td class="col-green">' + fmt(r.totalFinal || 0) + '</td>' +
      '<td class="col-green">' + fmt(ganMostrar) + '</td>' +
      '<td class="col-actions">' +
        '<button class="btn-comprobante" onclick="verComprobanteData(' + i + ')">🧾 Ver</button>' +
        '<button class="btn-del" onclick="eliminarRegistro(\'' + docId + '\')">✕</button>' +
      '</td>';
    tbody.appendChild(tr);
  }

  // Guardar copia local para verComprobante
  window._historialActual = h;
}

function verComprobanteData(idx) {
  const h = window._historialActual || [];
  verComprobante(idx, h);
}

/* ══════════════════════════════════════════
   UTILIDADES
══════════════════════════════════════════ */
function fmt(n) {
  const num = parseInt(n, 10) || 0;
  return '$ ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
  // Fecha de hoy en hora local (no UTC) para evitar desfase de zona horaria
  var hoy = new Date();
  var yyyy = hoy.getFullYear();
  var mm = String(hoy.getMonth() + 1).padStart(2, '0');
  var dd = String(hoy.getDate()).padStart(2, '0');
  document.getElementById('fecha').value = yyyy + '-' + mm + '-' + dd;

  // ── Inicializar Firebase ──
  try {
    const firebaseConfig = {
      apiKey: "AIzaSyDlc1biQy21mWaGkVVxhF4B0Rchv6x9Mdg",
      authDomain: "lm-control-de-cuentas.firebaseapp.com",
      projectId: "lm-control-de-cuentas",
      storageBucket: "lm-control-de-cuentas.firebasestorage.app",
      messagingSenderId: "686310087257",
      appId: "1:686310087257:web:1a69da165b344548526f48"
    };
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log('Firebase conectado ✅');
  } catch(e) {
    console.warn('Firebase no disponible, modo offline:', e);
    db = null;
  }

  cargarHistorial();

  // Formato con puntos en tiempo real
  ['base', 'tanqueada', 'producido', 'nov-valor', 'rnd-manual-val'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', function() { fmtInput(this); });
      el.addEventListener('keypress', function(e) {
        if (!/\d/.test(e.key) && e.key !== 'Backspace') e.preventDefault();
      });
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      cerrarFactura({});
      cerrarHistModal({});
    }
  });
});
