/* ============================================================
   TASACIÓN VO — Application Logic
   ============================================================ */

// ── State ──
let currentStep = 1;
let editingId = null; // when editing a saved tasación
const photos = {}; // { slotName: base64DataURL }

const PHOTO_SLOTS = [
  { key: 'lado_izquierdo', label: '1. Lado izquierdo completo' },
  { key: 'lado_derecho', label: '2. Lado derecho completo' },
  { key: 'delantera', label: '3. Parte delantera' },
  { key: 'trasera', label: '4. Parte trasera' },
  { key: 'cuentakm', label: '5. Cuentakilómetros' },
  { key: 'interior_del', label: '6. Interior delantero' },
  { key: 'interior_tras', label: '7. Interior trasero' },
  { key: 'permiso_circ', label: '8. Permiso de circulación' },
  { key: 'ficha_tec_anv', label: '9. Ficha técnica (anverso)' },
  { key: 'ficha_tec_rev', label: '10. Ficha técnica (reverso)' },
];

const STORAGE_KEY = 'tasaciones_vo_sya';

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  buildPhotoGrid();
  renderListado();
  // logo click -> home
  document.getElementById('logo-home').addEventListener('click', () => {
    resetWizard();
    showSection('wizard');
  });
});

// ── Section Navigation ──
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('active'));

  if (name === 'wizard') {
    document.getElementById('section-wizard').classList.add('active');
    document.getElementById('nav-nueva').classList.add('active');
  } else if (name === 'listado') {
    document.getElementById('section-listado').classList.add('active');
    document.getElementById('nav-listado').classList.add('active');
    renderListado();
  } else if (name === 'detalle') {
    document.getElementById('section-detalle').classList.add('active');
    document.getElementById('nav-listado').classList.add('active');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Step Navigation ──
function goToStep(target) {
  // validate current step before going forward
  if (target > currentStep) {
    for (let s = currentStep; s < target; s++) {
      if (!validateStep(s)) {
        return;
      }
    }
  }

  currentStep = target;
  updateProgressBar();
  updateStepPanels();



  // if step 5, compute result
  if (target === 5) {
    computeResult();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgressBar() {
  document.querySelectorAll('.progress-step').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove('active', 'done');
    if (s === currentStep) el.classList.add('active');
    else if (s < currentStep) el.classList.add('done');
  });
  for (let i = 1; i <= 4; i++) {
    const line = document.getElementById(`line-${i}-${i + 1}`);
    if (line) {
      line.classList.toggle('done', i < currentStep);
    }
  }
}

function updateStepPanels() {
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`step-${currentStep}`);
  if (panel) panel.classList.add('active');
}

// ── Validation ──
function validateStep(step) {
  clearErrors();

  if (step === 1) return validateStep1();
  if (step === 2) return validateStep2();
  if (step === 3) return validateStep3();
  if (step === 4) return validateStep4();
  return true;
}

function clearErrors() {
  document.querySelectorAll('.error-msg').forEach(e => e.textContent = '');
  document.querySelectorAll('.invalid').forEach(e => e.classList.remove('invalid'));
  document.querySelectorAll('.invalid-photo').forEach(e => e.classList.remove('invalid-photo'));
}

function setError(id, msg) {
  const el = document.getElementById(`err-${id}`);
  if (el) el.textContent = msg;
  const input = document.getElementById(id);
  if (input) input.classList.add('invalid');
}

function validateStep1() {
  let ok = true;
  const fields = ['tasador', 'matricula', 'marca', 'modelo', 'acabado', 'anio', 'kilometros'];
  fields.forEach(f => {
    const val = document.getElementById(f).value.trim();
    if (!val) { setError(f, 'Campo obligatorio'); ok = false; }
  });

  // matricula format (basic: at least 4 chars)
  const mat = document.getElementById('matricula').value.trim();
  if (mat && mat.length < 4) { setError('matricula', 'Matrícula no válida'); ok = false; }

  // numeric validations
  const anio = Number(document.getElementById('anio').value);
  if (anio && (anio < 1970 || anio > 2026)) { setError('anio', 'Año entre 1970 y 2026'); ok = false; }

  const km = Number(document.getElementById('kilometros').value);
  if (document.getElementById('kilometros').value.trim() && km < 0) { setError('kilometros', 'No puede ser negativo'); ok = false; }

  if (!ok) showToast('Completa todos los campos obligatorios', 'error');
  return ok;
}

function validateStep2() {
  let ok = true;
  PHOTO_SLOTS.forEach(slot => {
    if (!photos[slot.key]) {
      ok = false;
      const slotEl = document.querySelector(`.photo-slot[data-slot="${slot.key}"]`);
      if (slotEl) slotEl.classList.add('invalid-photo');
    }
  });
  if (!ok) {
    document.getElementById('err-photos').textContent = 'Debes subir las 10 fotos obligatorias';
    showToast('Faltan fotos obligatorias', 'error');
  }
  return ok;
}

function validateStep3() {
  let ok = true;
  ['precio-min'].forEach(f => {
    const val = document.getElementById(f).value.trim();
    if (!val) { setError(f, 'Campo obligatorio'); ok = false; }
    else if (Number(val) < 0) { setError(f, 'No puede ser negativo'); ok = false; }
  });
  ['estado-carroceria', 'estado-interior', 'estado-mecanico', 'itv', 'historial'].forEach(f => {
    const val = document.getElementById(f).value;
    if (!val) { setError(f, 'Selecciona una opción'); ok = false; }
  });
  if (!ok) showToast('Completa todos los campos obligatorios', 'error');
  return ok;
}

function validateStep4() {
  let ok = true;
  ['precio-venta-obj', 'coste-reparaciones', 'coste-reacond', 'gastos-admin', 'margen-min'].forEach(f => {
    const val = document.getElementById(f).value.trim();
    if (!val) { setError(f, 'Campo obligatorio'); ok = false; }
    else if (Number(val) < 0) { setError(f, 'No puede ser negativo'); ok = false; }
  });
  if (!ok) showToast('Completa todos los campos obligatorios', 'error');
  return ok;
}

// ── Photo Grid ──
function buildPhotoGrid() {
  const grid = document.getElementById('photo-grid');
  grid.innerHTML = '';
  PHOTO_SLOTS.forEach(slot => {
    const div = document.createElement('div');
    div.className = 'photo-slot';
    div.dataset.slot = slot.key;

    div.innerHTML = `
      <svg class="photo-icon" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="4" y="6" width="28" height="22" rx="3"/>
        <circle cx="18" cy="17" r="5"/>
        <circle cx="26" cy="11" r="2"/>
      </svg>
      <span class="photo-label">${slot.label}</span>
      <div class="photo-replace-hint">Cambiar foto</div>
      <input type="file" accept="image/jpeg,image/png" data-slot="${slot.key}" />
    `;

    const fileInput = div.querySelector('input[type="file"]');
    fileInput.addEventListener('change', (e) => handlePhotoUpload(e, slot.key, div));

    grid.appendChild(div);
  });
}

function handlePhotoUpload(e, slotKey, slotEl) {
  const file = e.target.files[0];
  if (!file) return;

  // validate type
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    showToast('Solo se permiten archivos JPG o PNG', 'error');
    e.target.value = '';
    return;
  }
  // validate size (10 MB)
  if (file.size > 10 * 1024 * 1024) {
    showToast('La imagen no puede superar 10 MB', 'error');
    e.target.value = '';
    return;
  }

  // Compress the image before storing
  compressImage(file, (compressedDataUrl) => {
    photos[slotKey] = compressedDataUrl;
    // show thumbnail
    let img = slotEl.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      slotEl.insertBefore(img, slotEl.firstChild);
    }
    img.src = compressedDataUrl;
    slotEl.classList.add('has-photo');
    slotEl.classList.remove('invalid-photo');
  });
}

// ── Compute Result ──
function computeResult() {
  const precioVenta = num('precio-venta-obj');
  const reparaciones = num('coste-reparaciones');
  const reacond = num('coste-reacond');
  const gastosAdmin = num('gastos-admin');
  const margenMin = num('margen-min');

  const costeTotal = reparaciones + reacond + gastosAdmin;
  const precioMaxCompra = precioVenta - costeTotal - margenMin;
  const beneficioEstimado = margenMin;

  // display
  document.getElementById('result-max-price').textContent = formatEuro(precioMaxCompra);
  document.getElementById('result-beneficio').textContent = formatEuro(beneficioEstimado);

  // change color if negative
  const heroEl = document.getElementById('result-hero');
  if (precioMaxCompra < 0) {
    heroEl.style.borderColor = 'rgba(239,68,68,.3)';
    document.getElementById('result-max-price').style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    document.getElementById('result-max-price').style.webkitBackgroundClip = 'text';
  } else {
    heroEl.style.borderColor = '';
    document.getElementById('result-max-price').style.background = '';
    document.getElementById('result-max-price').style.webkitBackgroundClip = '';
  }

  // build summary
  buildSummary(precioVenta, reparaciones, reacond, gastosAdmin, margenMin, costeTotal, precioMaxCompra, beneficioEstimado);
}

function buildSummary(precioVenta, reparaciones, reacond, gastosAdmin, margen, costeTotal, precioMax, beneficio) {
  const grid = document.getElementById('summary-grid');

  const rows = [
    { label: 'Tasador', value: val('tasador') },
    { label: 'Matrícula', value: val('matricula').toUpperCase() },
    { label: 'Vehículo', value: `${val('marca')} ${val('modelo')} ${val('acabado')}` },
    { label: 'Año / Km', value: `${val('anio')} · ${formatNum(num('kilometros'))} km` },
    { label: 'Precio mín. publicado', value: formatEuro(num('precio-min')) },
    { label: 'Estado carrocería', value: capitalize(val('estado-carroceria')) },
    { label: 'Estado interior', value: capitalize(val('estado-interior')) },
    { label: 'Estado mecánico', value: capitalize(val('estado-mecanico')) },
    { label: 'ITV vigente', value: val('itv') === 'si' ? 'Sí' : 'No' },
    { label: 'Historial mantenimiento', value: capitalize(val('historial')) },
    { label: 'Precio venta objetivo', value: formatEuro(precioVenta) },
    { label: 'Coste reparaciones', value: formatEuro(reparaciones) },
    { label: 'Coste reacondicionamiento', value: formatEuro(reacond) },
    { label: 'Gastos admin. / garantía', value: formatEuro(gastosAdmin) },
    { label: 'Coste total', value: formatEuro(costeTotal) },
    { label: 'Margen objetivo', value: formatEuro(margen) },
    { label: 'PRECIO MÁX. COMPRA', value: formatEuro(precioMax), highlight: true },
    { label: 'Beneficio estimado', value: formatEuro(beneficio), highlight: true },
  ];

  grid.innerHTML = rows.map(r =>
    `<div class="summary-row${r.highlight ? ' highlight' : ''}">
      <span class="s-label">${r.label}</span>
      <span class="s-value">${r.value}</span>
    </div>`
  ).join('');
}

// ── Save / Load ──
function getTasaciones() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveTasaciones(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

// ── Compress image on upload ──
function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      const MAX = 800;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.5));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function saveTasacion(estado) {
  const precioVenta = num('precio-venta-obj');
  const reparaciones = num('coste-reparaciones');
  const reacond = num('coste-reacond');
  const gastosAdmin = num('gastos-admin');
  const margenMin = num('margen-min');
  const costeTotal = reparaciones + reacond + gastosAdmin;
  const precioMax = precioVenta - costeTotal - margenMin;

  const tasacion = {
    id: editingId || generateId(),
    estado,
    fecha: new Date().toISOString(),
    tasador: val('tasador'),
    matricula: val('matricula').toUpperCase(),
    marca: val('marca'),
    modelo: val('modelo'),
    acabado: val('acabado'),
    anio: val('anio'),
    kilometros: num('kilometros'),
    fotos: { ...photos },
    precioMin: num('precio-min'),
    estadoCarroceria: val('estado-carroceria'),
    estadoInterior: val('estado-interior'),
    obsInterior: val('obs-interior'),
    estadoMecanico: val('estado-mecanico'),
    obsMecanico: val('obs-mecanico'),
    itv: val('itv'),
    historial: val('historial'),
    precioVentaObj: precioVenta,
    costeReparaciones: reparaciones,
    costeReacond: reacond,
    gastosAdmin,
    margenMin,
    costeTotal,
    precioMaxCompra: precioMax,
    beneficioEstimado: margenMin,
  };

  const list = getTasaciones();
  const idx = list.findIndex(t => t.id === tasacion.id);
  if (idx >= 0) list[idx] = tasacion;
  else list.unshift(tasacion);

  // Try to save — if localStorage is full, try without photos
  try {
    saveTasaciones(list);
  } catch (e) {
    console.warn('localStorage full, saving without photos...');
    tasacion.fotos = {};
    if (idx >= 0) list[idx] = tasacion;
    else list[0] = tasacion;
    try {
      saveTasaciones(list);
      showToast('Guardado sin fotos (memoria llena). El PDF sí incluirá las fotos.', 'warning');
    } catch (e2) {
      showToast('Error: no se pudo guardar la tasación.', 'error');
      return;
    }
  }

  editingId = null;
  const label = estado === 'finalizada' ? 'Tasación finalizada' : 'Borrador guardado';
  showToast(`${label} correctamente`, 'success');

  setTimeout(() => {
    resetWizard();
    showSection('listado');
  }, 1200);
}

function deleteTasacion(id, e) {
  e.stopPropagation();
  if (!confirm('¿Eliminar esta tasación?')) return;
  const list = getTasaciones().filter(t => t.id !== id);
  saveTasaciones(list);
  renderListado();
  showToast('Tasación eliminada', 'success');
}

// ── Render Listado ──
function renderListado() {
  const container = document.getElementById('listado-content');
  const query = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
  let list = getTasaciones();

  if (query) {
    list = list.filter(t =>
      t.matricula.toLowerCase().includes(query) ||
      t.marca.toLowerCase().includes(query) ||
      t.modelo.toLowerCase().includes(query) ||
      t.tasador.toLowerCase().includes(query)
    );
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="listado-empty">
        <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="8" width="36" height="28" rx="4"/><path d="M6 16h36M16 8v8M32 8v8"/></svg>
        <p>${query ? 'No se encontraron tasaciones con esa búsqueda.' : 'Aún no hay tasaciones guardadas.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(t => {
    const fecha = new Date(t.fecha);
    const fechaStr = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="tasacion-row" onclick="viewTasacion('${t.id}')">
        <span class="t-matricula">${t.matricula}</span>
        <div class="t-info">
          <span class="t-vehicle">${t.marca} ${t.modelo} ${t.acabado}</span>
          <span class="t-meta">${fechaStr} · ${t.tasador} · ${formatNum(t.kilometros)} km</span>
        </div>
        <span class="t-price">${formatEuro(t.precioMaxCompra)}</span>
        <span class="t-status ${t.estado}">${t.estado}</span>
        <div class="t-actions">
          <button title="Editar" onclick="editTasacion('${t.id}', event)">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/></svg>
          </button>
          <button class="btn-del" title="Eliminar" onclick="deleteTasacion('${t.id}', event)">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h10M5 5v8a1 1 0 001 1h4a1 1 0 001-1V5M7 5V4a1 1 0 011-1h0a1 1 0 011 1v1"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ── View Detail ──
function viewTasacion(id) {
  const t = getTasaciones().find(x => x.id === id);
  if (!t) return;

  const container = document.getElementById('detalle-content');
  const fecha = new Date(t.fecha);
  const fechaStr = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) + ' a las ' + fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const statusClass = t.estado === 'finalizada' ? 'finalizada' : 'borrador';

  let photosHTML = '';
  PHOTO_SLOTS.forEach(slot => {
    if (t.fotos && t.fotos[slot.key]) {
      photosHTML += `
        <div class="detail-photo">
          <img src="${t.fotos[slot.key]}" alt="${slot.label}" />
          <div class="dp-label">${slot.label}</div>
        </div>`;
    }
  });

  const rows = [
    ['Tasador', t.tasador],
    ['Matrícula', t.matricula],
    ['Vehículo', `${t.marca} ${t.modelo} ${t.acabado}`],
    ['Año', t.anio],
    ['Kilómetros', formatNum(t.kilometros) + ' km'],
    ['Precio mínimo publicado', formatEuro(t.precioMin)],
    ['Estado carrocería', capitalize(t.estadoCarroceria)],
    ['Estado interior', capitalize(t.estadoInterior)],
    ['Obs. interior', t.obsInterior || '—'],
    ['Estado mecánico', capitalize(t.estadoMecanico)],
    ['Obs. mecánica', t.obsMecanico || '—'],
    ['ITV vigente', t.itv === 'si' ? 'Sí' : 'No'],
    ['Historial mantenimiento', capitalize(t.historial)],
    ['Precio venta objetivo', formatEuro(t.precioVentaObj)],
    ['Coste reparaciones', formatEuro(t.costeReparaciones)],
    ['Coste reacondicionamiento', formatEuro(t.costeReacond)],
    ['Gastos admin. / garantía', formatEuro(t.gastosAdmin)],
    ['Coste total', formatEuro(t.costeTotal)],
    ['Margen objetivo', formatEuro(t.margenMin)],
  ];

  container.innerHTML = `
    <button class="detail-back" onclick="showSection('listado')">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4l-6 5 6 5"/></svg>
      Volver al historial
    </button>

    <div class="detail-header-grid">
      <h1>${t.marca} ${t.modelo} · ${t.matricula}</h1>
      <span class="detail-status t-status ${statusClass}">${t.estado}</span>
    </div>

    <p style="color:var(--text-muted);font-size:.85rem;margin-bottom:24px;">${fechaStr}</p>

    ${photosHTML ? `<div class="detail-photos">${photosHTML}</div>` : ''}

    <div class="result-hero" style="margin-bottom:24px;">
      <p class="result-label">PRECIO MÁXIMO DE COMPRA</p>
      <p class="result-price">${formatEuro(t.precioMaxCompra)}</p>
      <div class="result-sub">
        <span>Beneficio estimado: <strong>${formatEuro(t.beneficioEstimado)}</strong></span>
      </div>
    </div>

    <div class="form-card summary-card" style="margin-bottom:24px;">
      <h2 class="card-section-title">Datos completos</h2>
      <div class="summary-grid">
        ${rows.map(([l, v]) => `
          <div class="summary-row">
            <span class="s-label">${l}</span>
            <span class="s-value">${v}</span>
          </div>
        `).join('')}
        <div class="summary-row highlight">
          <span class="s-label">PRECIO MÁX. COMPRA</span>
          <span class="s-value">${formatEuro(t.precioMaxCompra)}</span>
        </div>
        <div class="summary-row highlight">
          <span class="s-label">Beneficio estimado</span>
          <span class="s-value">${formatEuro(t.beneficioEstimado)}</span>
        </div>
      </div>
    </div>

    <div class="btn-group" style="justify-content:flex-start;">
      <button class="btn-accent" onclick="exportPDFFromSaved('${t.id}')">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="2" width="12" height="14" rx="1"/><path d="M7 6h4M7 9h4M7 12h2"/></svg>
        Exportar PDF
      </button>
      <button class="btn-outline" onclick="editTasacion('${t.id}')">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M13.5 2.5l2 2L7 13H5v-2L13.5 2.5z"/></svg>
        Editar
      </button>
    </div>
  `;

  showSection('detalle');
}

// ── Edit Tasación ──
function editTasacion(id, e) {
  if (e) e.stopPropagation();
  const t = getTasaciones().find(x => x.id === id);
  if (!t) return;

  editingId = t.id;

  // populate fields
  document.getElementById('tasador').value = t.tasador;
  document.getElementById('matricula').value = t.matricula;
  document.getElementById('marca').value = t.marca;
  document.getElementById('modelo').value = t.modelo;
  document.getElementById('acabado').value = t.acabado;
  document.getElementById('anio').value = t.anio;
  document.getElementById('kilometros').value = t.kilometros;

  document.getElementById('precio-min').value = t.precioMin || '';
  document.getElementById('estado-carroceria').value = t.estadoCarroceria || '';
  document.getElementById('estado-interior').value = t.estadoInterior || '';
  document.getElementById('obs-interior').value = t.obsInterior || '';
  document.getElementById('estado-mecanico').value = t.estadoMecanico || '';
  document.getElementById('obs-mecanico').value = t.obsMecanico || '';
  document.getElementById('itv').value = t.itv || '';
  document.getElementById('historial').value = t.historial || '';

  document.getElementById('precio-venta-obj').value = t.precioVentaObj || '';
  document.getElementById('coste-reparaciones').value = t.costeReparaciones || '';
  document.getElementById('coste-reacond').value = t.costeReacond || '';
  document.getElementById('gastos-admin').value = t.gastosAdmin || '';
  document.getElementById('margen-min').value = t.margenMin || '';

  // restore photos
  Object.keys(photos).forEach(k => delete photos[k]);
  if (t.fotos) {
    Object.assign(photos, t.fotos);
    // rebuild photo thumbnails
    PHOTO_SLOTS.forEach(slot => {
      const slotEl = document.querySelector(`.photo-slot[data-slot="${slot.key}"]`);
      if (photos[slot.key] && slotEl) {
        let img = slotEl.querySelector('img');
        if (!img) {
          img = document.createElement('img');
          slotEl.insertBefore(img, slotEl.firstChild);
        }
        img.src = photos[slot.key];
        slotEl.classList.add('has-photo');
      }
    });
  }

  currentStep = 1;
  updateProgressBar();
  updateStepPanels();
  showSection('wizard');
  showToast('Editando tasación', 'info');
}

// ── Reset Wizard ──
function resetWizard() {
  editingId = null;
  currentStep = 1;
  updateProgressBar();
  updateStepPanels();

  // clear all form inputs
  const inputs = document.querySelectorAll('#section-wizard input[type="text"], #section-wizard input[type="number"], #section-wizard textarea');
  inputs.forEach(i => i.value = '');
  const selects = document.querySelectorAll('#section-wizard select');
  selects.forEach(s => s.selectedIndex = 0);

  // clear photos
  Object.keys(photos).forEach(k => delete photos[k]);
  document.querySelectorAll('.photo-slot').forEach(slot => {
    slot.classList.remove('has-photo', 'invalid-photo');
    const img = slot.querySelector('img');
    if (img) img.remove();
    const fileInput = slot.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  });

  clearErrors();
}

// ── PDF Export ──
function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');

  const margin = 15;
  let y = margin;

  // ── Header
  doc.setFillColor(62, 168, 184);
  doc.rect(0, 0, 210, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SYA MOTOR — TASACIÓN DE VEHÍCULO', margin, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')} · Tasador: ${val('tasador')}`, margin, 28);

  y = 46;
  doc.setTextColor(40, 40, 60);

  // ── Vehicle info
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL VEHÍCULO', margin, y); y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const vehicleData = [
    ['Matrícula', val('matricula').toUpperCase()],
    ['Marca / Modelo', `${val('marca')} ${val('modelo')} ${val('acabado')}`],
    ['Año', val('anio')],
    ['Kilómetros', formatNum(num('kilometros')) + ' km'],
  ];
  vehicleData.forEach(([l, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(l + ':', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(v, margin + 45, y);
    y += 6;
  });

  y += 4;

  // ── Market
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('ANÁLISIS DE MERCADO', margin, y); y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const marketData = [
    ['Precio mín. publicado', formatEuro(num('precio-min'))],
    ['E. carrocería', capitalize(val('estado-carroceria'))],
    ['E. interior', capitalize(val('estado-interior'))],
    ['E. mecánico', capitalize(val('estado-mecanico'))],
    ['ITV vigente', val('itv') === 'si' ? 'Sí' : 'No'],
    ['Historial', capitalize(val('historial'))],
  ];
  marketData.forEach(([l, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(l + ':', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(v, margin + 45, y);
    y += 6;
  });

  y += 4;

  // ── Costs
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('COSTES Y OBJETIVOS', margin, y); y += 8;
  doc.setFontSize(9);

  const precioVenta = num('precio-venta-obj');
  const reparaciones = num('coste-reparaciones');
  const reacond = num('coste-reacond');
  const gastosAdmin = num('gastos-admin');
  const margenMin = num('margen-min');
  const costeTotal = reparaciones + reacond + gastosAdmin;
  const precioMax = precioVenta - costeTotal - margenMin;

  const costData = [
    ['Precio venta objetivo', formatEuro(precioVenta)],
    ['Coste reparaciones', formatEuro(reparaciones)],
    ['Coste reacondicionamiento', formatEuro(reacond)],
    ['Gastos admin. / garantía', formatEuro(gastosAdmin)],
    ['Coste total', formatEuro(costeTotal)],
    ['Margen objetivo', formatEuro(margenMin)],
  ];
  costData.forEach(([l, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(l + ':', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(v, margin + 55, y);
    y += 6;
  });

  y += 8;

  // ── RESULT BOX
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(margin, y, 180, 28, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('NO PAGAR MÁS DE:', margin + 10, y + 12);
  doc.setFontSize(18);
  doc.text(formatEuro(precioMax), margin + 10, y + 23);

  y += 36;
  doc.setTextColor(40, 40, 60);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Beneficio estimado si se compra a este precio: ${formatEuro(margenMin)}`, margin, y);

  y += 8;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Documento generado por SYA Motor — Tasación VO · ' + new Date().toLocaleString('es-ES'), margin, y);

  // ── PHOTOS PAGE ──
  addPhotosToPDF(doc, photos, margin);

  doc.save(`tasacion_${val('matricula').toUpperCase()}_${Date.now()}.pdf`);
  showToast('PDF exportado', 'success');
}

function exportPDFFromSaved(id) {
  const t = getTasaciones().find(x => x.id === id);
  if (!t) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');

  const margin = 15;
  let y = margin;

  doc.setFillColor(62, 168, 184);
  doc.rect(0, 0, 210, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SYA MOTOR — TASACIÓN DE VEHÍCULO', margin, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const fechaPDF = new Date(t.fecha).toLocaleDateString('es-ES');
  doc.text(`Fecha: ${fechaPDF} · Tasador: ${t.tasador}`, margin, 28);

  y = 46;
  doc.setTextColor(40, 40, 60);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL VEHÍCULO', margin, y); y += 8;
  doc.setFontSize(9);

  const vehicleData = [
    ['Matrícula', t.matricula],
    ['Marca / Modelo', `${t.marca} ${t.modelo} ${t.acabado}`],
    ['Año', String(t.anio)],
    ['Kilómetros', formatNum(t.kilometros) + ' km'],
  ];
  vehicleData.forEach(([l, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(l + ':', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(v, margin + 45, y);
    y += 6;
  });

  y += 4;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('ANÁLISIS DE MERCADO', margin, y); y += 8;
  doc.setFontSize(9);

  const marketData = [
    ['Precio mín. publicado', formatEuro(t.precioMin)],
    ['E. carrocería', capitalize(t.estadoCarroceria)],
    ['E. interior', capitalize(t.estadoInterior)],
    ['E. mecánico', capitalize(t.estadoMecanico)],
    ['ITV vigente', t.itv === 'si' ? 'Sí' : 'No'],
    ['Historial', capitalize(t.historial)],
  ];
  marketData.forEach(([l, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(l + ':', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(v, margin + 45, y);
    y += 6;
  });

  y += 4;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('COSTES Y OBJETIVOS', margin, y); y += 8;
  doc.setFontSize(9);

  const costData = [
    ['Precio venta objetivo', formatEuro(t.precioVentaObj)],
    ['Coste reparaciones', formatEuro(t.costeReparaciones)],
    ['Coste reacondicionamiento', formatEuro(t.costeReacond)],
    ['Gastos admin. / garantía', formatEuro(t.gastosAdmin)],
    ['Coste total', formatEuro(t.costeTotal)],
    ['Margen objetivo', formatEuro(t.margenMin)],
  ];
  costData.forEach(([l, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(l + ':', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(v, margin + 55, y);
    y += 6;
  });

  y += 8;

  doc.setFillColor(16, 185, 129);
  doc.roundedRect(margin, y, 180, 28, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('NO PAGAR MÁS DE:', margin + 10, y + 12);
  doc.setFontSize(18);
  doc.text(formatEuro(t.precioMaxCompra), margin + 10, y + 23);

  y += 36;
  doc.setTextColor(40, 40, 60);
  doc.setFontSize(9);
  doc.text(`Beneficio estimado: ${formatEuro(t.beneficioEstimado)}`, margin, y);

  y += 8;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Documento generado por SYA Motor — Tasación VO · ' + new Date().toLocaleString('es-ES'), margin, y);

  // ── PHOTOS PAGE ──
  if (t.fotos) addPhotosToPDF(doc, t.fotos, margin);

  doc.save(`tasacion_${t.matricula}_${Date.now()}.pdf`);
  showToast('PDF exportado', 'success');
}

// ── Add photos to PDF (shared helper) ──
function addPhotosToPDF(doc, photosObj, margin) {
  const photoKeys = PHOTO_SLOTS.filter(s => photosObj[s.key]);
  if (photoKeys.length === 0) return;

  doc.addPage();
  let y = margin;

  doc.setFillColor(62, 168, 184);
  doc.rect(0, 0, 210, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FOTOGRAFÍAS DEL VEHÍCULO', margin, 14);

  y = 28;
  doc.setTextColor(40, 40, 60);

  const imgW = 82; // mm
  const imgH = 60; // mm
  const gap = 8;
  let col = 0;

  photoKeys.forEach((slot, i) => {
    const dataUrl = photosObj[slot.key];
    if (!dataUrl) return;

    const x = margin + col * (imgW + gap);

    // Check if we need a new page
    if (y + imgH + 12 > 285) {
      doc.addPage();
      y = margin;
    }

    try {
      doc.addImage(dataUrl, 'JPEG', x, y, imgW, imgH);
      // Label below image
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(slot.label, x, y + imgH + 4);
    } catch (e) {
      // If image fails, just add a placeholder
      doc.setDrawColor(200, 200, 200);
      doc.rect(x, y, imgW, imgH);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Foto no disponible', x + 20, y + imgH / 2);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(slot.label, x, y + imgH + 4);
    }

    col++;
    if (col >= 2) {
      col = 0;
      y += imgH + 14;
    }
  });
}

// ── Modal ──
function showAutoRefModal() {
  document.getElementById('modal-autoref').classList.add('active');
}
function closeAutoRefModal(e) {
  if (e.target === document.getElementById('modal-autoref')) {
    document.getElementById('modal-autoref').classList.remove('active');
  }
}

// ── Toast ──
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast active';
  if (type === 'success') toast.classList.add('success');
  else if (type === 'error') toast.classList.add('error');
  setTimeout(() => toast.classList.remove('active'), 3000);
}

// ── Helpers ──
function val(id) { return document.getElementById(id)?.value?.trim() || ''; }
function num(id) { return Number(document.getElementById(id)?.value) || 0; }

function formatEuro(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatNum(n) {
  return new Intl.NumberFormat('es-ES').format(n);
}

function capitalize(s) {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
