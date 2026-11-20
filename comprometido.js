// ====================================================================
// 🚢 MATERIAL COMPROMETIDO (ÓRDENES DE EMBARQUE)
// Depende de app.js: db, maestroProductos, BODEGAS, fmt, notificar, render
// Depende de mapa.js: MAPA_PRODUCTOS (lista de productos)
// Se engancha a material-critico.js: agrega filas de "comprometido" y "disponible neto"
// ====================================================================

const ordenesRef = firebase.database().ref('ordenes_embarque');
let ordenesEmbarque = {};      // id -> { oe, codigo, toneladas, estado, creado, embarcada }
let ordenEditandoId = null;

ordenesRef.on('value', (snap) => {
    ordenesEmbarque = snap.val() || {};
    ordRefrescarSiAbierto();
});

// ---------- Formatos y datos ----------
const ordNum = (n) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(n);

function ordNombreProducto(codigo) {
    const lista = (typeof MAPA_PRODUCTOS !== 'undefined') ? MAPA_PRODUCTOS : [];
    const p = lista.find(x => x.codigo === codigo);
    if (p) return p.nombre;
    for (const pp in maestroProductos) {
        if (maestroProductos[pp].codigo === codigo) return maestroProductos[pp].nombre || codigo;
    }
    return codigo;
}

function ordenesActivas() {
    return Object.keys(ordenesEmbarque)
        .map(id => ({ id, ...ordenesEmbarque[id] }))
        .filter(o => o.estado !== 'embarcada');
}

function ordenesEmbarcadas() {
    return Object.keys(ordenesEmbarque)
        .map(id => ({ id, ...ordenesEmbarque[id] }))
        .filter(o => o.estado === 'embarcada')
        .sort((a, b) => String(b.embarcada || '').localeCompare(String(a.embarcada || '')));
}

// Toneladas comprometidas por código contable (solo OE activas)
function comprometidoPorCodigo() {
    const t = {};
    ordenesActivas().forEach(o => { t[o.codigo] = (t[o.codigo] || 0) + (Number(o.toneladas) || 0); });
    return t;
}

function ordIdsUbicaciones() {
    const ids = new Set();
    Object.values(BODEGAS).forEach(b => b.layout.forEach(it => { if (Array.isArray(it)) ids.add(it[0]); }));
    return ids;
}

// Toneladas físicas por código contable, sumando todas las bodegas
function stockFisicoPorCodigoTon() {
    const ids = ordIdsUbicaciones();
    const t = {};
    for (const loc in db) {
        if (!ids.has(loc)) continue;
        for (const pp in db[loc]) {
            const cod = (maestroProductos[pp] || {}).codigo;
            if (!cod) continue;
            t[cod] = (t[cod] || 0) + (db[loc][pp].kg || 0) / 1000;
        }
    }
    return t;
}

function stockFisicoTotalTon() {
    const ids = ordIdsUbicaciones();
    let kg = 0;
    for (const loc in db) {
        if (!ids.has(loc)) continue;
        for (const pp in db[loc]) kg += db[loc][pp].kg || 0;
    }
    return kg / 1000;
}

// Resumen general: físico, comprometido y disponible (total y por producto)
function resumenComprometido() {
    const comp = comprometidoPorCodigo();
    const fis = stockFisicoPorCodigoTon();
    const filas = Object.keys(comp).map(cod => ({
        codigo: cod,
        nombre: ordNombreProducto(cod),
        fisico: fis[cod] || 0,
        comprometido: comp[cod],
        disponible: (fis[cod] || 0) - comp[cod]
    })).sort((a, b) => b.comprometido - a.comprometido);
    const totalFisico = stockFisicoTotalTon();
    const totalComprometido = filas.reduce((s, f) => s + f.comprometido, 0);
    return {
        filas, totalFisico, totalComprometido,
        totalDisponible: totalFisico - totalComprometido,
        nOrdenes: ordenesActivas().length
    };
}

// Para una tabla de Material Crítico: cuánto está comprometido y cuánto queda disponible (en toneladas)
function comprometidoParaBloque(bloque) {
    const comp = comprometidoPorCodigo();
    if (Object.keys(comp).length === 0) return null;

    const claves = bloque.tipo === 'porPP' ? bloque.columnas : Object.keys(bloque.datos);
    if (claves.length === 0) return null;
    const bodKeys = Object.keys(BODEGAS);
    const stockCol = claves.map(k => bodKeys.reduce((s, b) => s + (bloque.datos[k][b] || 0), 0) / 1000);
    const stockTotal = stockCol.reduce((a, b) => a + b, 0);

    let porColumna, netoColumna, codigosBloque, vacioColumna;
    if (bloque.tipo === 'porPP') {
        codigosBloque = [...new Set(claves.map(pp => (maestroProductos[pp] || {}).codigo).filter(Boolean))];
        porColumna = claves.map(() => null);
        netoColumna = claves.map(() => null);
        vacioColumna = claves.map(() => false);
    } else {
        codigosBloque = claves;
        porColumna = claves.map(k => comp[k] || 0);
        netoColumna = claves.map((k, i) => stockCol[i] - (comp[k] || 0));
        vacioColumna = claves.map((k, i) => stockCol[i] === 0 && !comp[k]);   // sin stock y sin órdenes
    }
    const total = codigosBloque.reduce((s, c) => s + (comp[c] || 0), 0);
    if (total <= 0) return null;
    return { porColumna, netoColumna, vacioColumna, total, neto: stockTotal - total };
}

// ---------- Filas extra en las tablas de Material Crítico ----------
function ordFilasBloqueHTML(bloque) {
    const c = comprometidoParaBloque(bloque);
    if (!c) return '';
    const mostrar = (n) => (typeof fmt === 'function' ? fmt(n) : ordNum(n));
    const base = 'padding: 6px 8px; text-align: right; border: 1px solid #cbd5e0; white-space: nowrap;';
    const celda = (txt, extra = '') => `<td style="${base} ${extra}">${txt}</td>`;

    let filaComp = `<tr style="background: #fff5f5;"><td style="${base} text-align: left; color: #c53030; font-weight: bold;">COMPROMETIDO (OE)</td>`;
    c.porColumna.forEach(v => { filaComp += celda(v === null ? '' : (v > 0 ? '−' + mostrar(v) : '–'), 'color: #c53030;'); });
    filaComp += celda('−' + mostrar(c.total), 'color: #c53030; font-weight: bold;') + '</tr>';

    const estilo = (n) => n < 0 ? 'color: #c53030; font-weight: bold; background: #fed7d7;' : 'color: #276749; font-weight: bold;';
    let filaNeto = `<tr style="background: #f0fff4;"><td style="${base} text-align: left; color: #276749; font-weight: bold;">DISPONIBLE NETO</td>`;
    c.netoColumna.forEach((v, i) => { filaNeto += celda(v === null ? '' : (c.vacioColumna[i] ? '–' : mostrar(v)), v === null ? '' : (c.vacioColumna[i] ? 'color: #cbd5e1;' : estilo(v))); });
    filaNeto += celda(mostrar(c.neto), estilo(c.neto)) + '</tr>';

    return filaComp + filaNeto;
}

// Se agrega a la función que dibuja las tablas del informe (material-critico.js)
(function () {
    if (typeof renderTablaMaterialCritico !== 'function') return;
    const original = renderTablaMaterialCritico;
    renderTablaMaterialCritico = function (bloque) {
        const html = original(bloque);
        const extra = ordFilasBloqueHTML(bloque);
        if (!extra) return html;
        const i = html.lastIndexOf('</tbody>');
        return i < 0 ? html : html.slice(0, i) + extra + html.slice(i);
    };
})();

// Si el inventario cambia con la ventana abierta, se actualizan las cifras
(function () {
    if (typeof render !== 'function') return;
    const original = render;
    render = function () {
        const r = original.apply(this, arguments);
        ordRefrescarSiAbierto();
        return r;
    };
})();

// ---------- Ventana de administración ----------
function ordAsegurarModal() {
    if (document.getElementById('modal-ordenes')) return;

    const estilo = document.createElement('style');
    estilo.textContent = `
        #modal-ordenes input, #modal-ordenes select {
            font-size: 14px !important; padding: 9px 10px !important; height: auto !important;
            border: 1px solid #cbd5e0 !important; border-radius: 6px !important; background: #fff !important;
            box-shadow: none !important; box-sizing: border-box; width: 100%;
        }
        #modal-ordenes label { display: block; font-size: 11px; font-weight: bold; color: #718096; margin-bottom: 3px; }
        @media (max-width: 600px) { #modal-ordenes > div { width: 100% !important; max-width: 100% !important; } }`;
    document.head.appendChild(estilo);

    const modal = document.createElement('div');
    modal.id = 'modal-ordenes';
    modal.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10003; justify-content: center; align-items: flex-start; padding-top: 40px; box-sizing: border-box;';
    modal.innerHTML = `
        <div style="background: white; padding: 18px; border-radius: 10px; max-width: 760px; width: 95%; max-height: 88vh; overflow-y: auto; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; color: #2d3748;">🚢 Órdenes de Embarque</h3>
                <button onclick="cerrarModalOrdenes()" style="background: #e53e3e; color: white; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-weight: bold;">✕</button>
            </div>
            <div id="ord-kpis"></div>

            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 12px 0; background: #f8fafc;">
                <div id="ord-form-titulo" style="font-size: 13px; font-weight: bold; color: #2d3748; margin-bottom: 8px;">Registrar orden de embarque</div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end;">
                    <div style="flex: 1 1 100px;"><label for="ord-oe">N° OE</label><input id="ord-oe" type="text" placeholder="1234" autocomplete="off"></div>
                    <div style="flex: 2 1 200px;"><label for="ord-producto">Producto</label><select id="ord-producto"></select></div>
                    <div style="flex: 1 1 100px;"><label for="ord-ton">Toneladas</label><input id="ord-ton" type="number" min="0" step="0.1" placeholder="100"></div>
                </div>
                <div style="display: flex; gap: 8px; margin-top: 10px;">
                    <button id="ord-btn-guardar" onclick="ordGuardar()" style="background: #38a169; color: white; border: none; padding: 9px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px;">+ Agregar</button>
                    <button id="ord-btn-cancelar" onclick="ordCancelarEdicion()" style="display: none; background: #e2e8f0; color: #4a5568; border: none; padding: 9px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px;">Cancelar edición</button>
                </div>
            </div>

            <div style="font-size: 13px; font-weight: bold; color: #2d3748; margin: 14px 0 6px;">Órdenes activas</div>
            <div id="ord-lista"></div>

            <div style="font-size: 13px; font-weight: bold; color: #2d3748; margin: 16px 0 6px;">Disponible por producto</div>
            <div id="ord-por-producto"></div>

            <details style="margin-top: 14px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px;">
                <summary style="cursor: pointer; font-weight: bold; font-size: 13px; color: #4a5568;">Órdenes ya embarcadas <span id="ord-contador-emb" style="font-weight: normal; color: #718096;"></span></summary>
                <div id="ord-embarcadas" style="margin-top: 8px;"></div>
            </details>
        </div>`;
    document.body.appendChild(modal);
}

function abrirModalOrdenes() {
    ordAsegurarModal();
    const sel = document.getElementById('ord-producto');
    const lista = (typeof MAPA_PRODUCTOS !== 'undefined') ? MAPA_PRODUCTOS : [];
    sel.innerHTML = '<option value="">Selecciona producto...</option>' +
        lista.map(p => `<option value="${p.codigo}">${p.nombre}</option>`).join('');
    ordCancelarEdicion();
    document.getElementById('modal-ordenes').style.display = 'flex';
    ordRefrescar();
}

function cerrarModalOrdenes() {
    const m = document.getElementById('modal-ordenes');
    if (m) m.style.display = 'none';
}

function ordRefrescarSiAbierto() {
    const m = document.getElementById('modal-ordenes');
    if (m && m.style.display === 'flex') ordRefrescar();
}

const ORD_TH = 'text-align: left; font-size: 10px; color: #718096; padding: 6px 8px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase;';
const ORD_TD = 'padding: 7px 8px; border-bottom: 1px solid #edf2f7; font-size: 12px; color: #2d3748; vertical-align: middle;';

function ordRefrescar() {
    const r = resumenComprometido();

    const tarjeta = (titulo, valor, color, sub) => `
        <div style="flex: 1 1 140px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; background: #fff;">
            <div style="font-size: 10px; color: #718096; font-weight: bold; text-transform: uppercase;">${titulo}</div>
            <div style="font-size: 22px; font-weight: bold; color: ${color};">${ordNum(valor)} <span style="font-size: 12px; font-weight: normal; color: #718096;">t</span></div>
            <div style="font-size: 11px; color: #a0aec0;">${sub}</div>
        </div>`;
    document.getElementById('ord-kpis').innerHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${tarjeta('Stock físico', r.totalFisico, '#2d3748', 'todas las bodegas')}
            ${tarjeta('Comprometido (OE)', r.totalComprometido, '#c53030', `${r.nOrdenes} ${r.nOrdenes === 1 ? 'orden activa' : 'órdenes activas'}`)}
            ${tarjeta('Disponible neto', r.totalDisponible, r.totalDisponible < 0 ? '#c53030' : '#276749', 'después de embarcar')}
        </div>`;

    // Lista de OE activas
    const activas = ordenesActivas().sort((a, b) => String(a.oe).localeCompare(String(b.oe), undefined, { numeric: true }));
    const boton = (txt, color, fn, id, titulo) =>
        `<button title="${titulo}" onclick="${fn}('${id}')" style="background: ${color}; color: white; border: none; width: 26px; height: 26px; border-radius: 4px; cursor: pointer; margin-left: 3px;">${txt}</button>`;
    document.getElementById('ord-lista').innerHTML = activas.length === 0
        ? '<div style="text-align: center; color: #a0aec0; padding: 14px; font-size: 12px;">No hay órdenes activas.</div>'
        : `<table style="width: 100%; border-collapse: collapse;">
            <thead><tr><th style="${ORD_TH}">OE</th><th style="${ORD_TH}">Producto</th><th style="${ORD_TH} text-align: right;">Toneladas</th><th style="${ORD_TH}"></th></tr></thead>
            <tbody>${activas.map(o => `
                <tr>
                    <td style="${ORD_TD} font-weight: bold; white-space: nowrap;">${o.oe}</td>
                    <td style="${ORD_TD}">${ordNombreProducto(o.codigo)}</td>
                    <td style="${ORD_TD} text-align: right; white-space: nowrap;">${ordNum(Number(o.toneladas) || 0)} t</td>
                    <td style="${ORD_TD} text-align: right; white-space: nowrap;">
                        ${boton('✏️', '#3182ce', 'ordEditar', o.id, 'Editar')}${boton('✅', '#38a169', 'ordMarcarEmbarcada', o.id, 'Marcar como embarcada')}${boton('🗑️', '#e53e3e', 'ordEliminar', o.id, 'Eliminar')}
                    </td>
                </tr>`).join('')}</tbody>
          </table>`;

    // Disponible por producto
    document.getElementById('ord-por-producto').innerHTML = r.filas.length === 0
        ? '<div style="text-align: center; color: #a0aec0; padding: 14px; font-size: 12px;">Aún no hay productos comprometidos.</div>'
        : `<table style="width: 100%; border-collapse: collapse;">
            <thead><tr><th style="${ORD_TH}">Producto</th><th style="${ORD_TH} text-align: right;">Físico</th><th style="${ORD_TH} text-align: right;">Comprom.</th><th style="${ORD_TH} text-align: right;">Disponible</th></tr></thead>
            <tbody>${r.filas.map(f => `
                <tr>
                    <td style="${ORD_TD}">${f.nombre}</td>
                    <td style="${ORD_TD} text-align: right; white-space: nowrap;">${ordNum(f.fisico)} t</td>
                    <td style="${ORD_TD} text-align: right; white-space: nowrap; color: #c53030;">−${ordNum(f.comprometido)} t</td>
                    <td style="${ORD_TD} text-align: right; white-space: nowrap; font-weight: bold; color: ${f.disponible < 0 ? '#c53030' : '#276749'}; ${f.disponible < 0 ? 'background: #fed7d7;' : ''}">${ordNum(f.disponible)} t</td>
                </tr>`).join('')}</tbody>
          </table>
          <div style="font-size: 11px; color: #a0aec0; margin-top: 6px;">En rojo: el producto está comprometido por más de lo que hay en stock.</div>`;

    // Embarcadas
    const emb = ordenesEmbarcadas().slice(0, 30);
    document.getElementById('ord-contador-emb').textContent = emb.length ? `(${emb.length})` : '';
    document.getElementById('ord-embarcadas').innerHTML = emb.length === 0
        ? '<div style="text-align: center; color: #a0aec0; padding: 10px; font-size: 12px;">Todavía no hay órdenes embarcadas.</div>'
        : `<table style="width: 100%; border-collapse: collapse;">
            <tbody>${emb.map(o => `
                <tr>
                    <td style="${ORD_TD} font-weight: bold; white-space: nowrap;">${o.oe}</td>
                    <td style="${ORD_TD}">${ordNombreProducto(o.codigo)}</td>
                    <td style="${ORD_TD} text-align: right; white-space: nowrap;">${ordNum(Number(o.toneladas) || 0)} t</td>
                    <td style="${ORD_TD} color: #718096; white-space: nowrap;">${o.embarcada ? new Date(o.embarcada).toLocaleDateString('es-CL') : ''}</td>
                    <td style="${ORD_TD} text-align: right; white-space: nowrap;">${boton('↩️', '#718096', 'ordReactivar', o.id, 'Volver a activa')}${boton('🗑️', '#e53e3e', 'ordEliminar', o.id, 'Eliminar')}</td>
                </tr>`).join('')}</tbody>
          </table>`;
}

// ---------- Acciones ----------
function ordExigirAdmin() {
    if (!firebase.auth().currentUser) {
        alert('Debes iniciar sesión como administrador para modificar las órdenes de embarque.');
        return false;
    }
    return true;
}

function ordCancelarEdicion() {
    ordenEditandoId = null;
    const campos = { 'ord-oe': '', 'ord-ton': '', 'ord-producto': '' };
    for (const id in campos) { const el = document.getElementById(id); if (el) el.value = campos[id]; }
    const t = document.getElementById('ord-form-titulo'); if (t) t.textContent = 'Registrar orden de embarque';
    const g = document.getElementById('ord-btn-guardar'); if (g) g.textContent = '+ Agregar';
    const c = document.getElementById('ord-btn-cancelar'); if (c) c.style.display = 'none';
}

function ordEditar(id) {
    const o = ordenesEmbarque[id];
    if (!o) return;
    ordenEditandoId = id;
    document.getElementById('ord-oe').value = o.oe;
    document.getElementById('ord-producto').value = o.codigo;
    document.getElementById('ord-ton').value = o.toneladas;
    document.getElementById('ord-form-titulo').textContent = 'Editando OE ' + o.oe;
    document.getElementById('ord-btn-guardar').textContent = 'Guardar cambios';
    document.getElementById('ord-btn-cancelar').style.display = 'inline-block';
    document.getElementById('ord-oe').focus();
}

function ordGuardar() {
    if (!ordExigirAdmin()) return;

    const oe = document.getElementById('ord-oe').value.trim();
    const codigo = document.getElementById('ord-producto').value;
    const ton = parseFloat(String(document.getElementById('ord-ton').value).replace(',', '.'));

    if (!oe) { alert('Ingresa el número de OE.'); return; }
    if (!codigo) { alert('Selecciona el producto.'); return; }
    if (!(ton > 0)) { alert('Ingresa un tonelaje mayor que cero.'); return; }

    const repetida = ordenesActivas().find(o => String(o.oe) === oe && o.codigo === codigo && o.id !== ordenEditandoId);
    if (repetida) {
        alert(`La OE ${oe} ya tiene registrado "${ordNombreProducto(codigo)}". Edítalo con el botón ✏️ de la lista.`);
        return;
    }

    // Aviso si el producto queda comprometido por más de lo que hay
    const previo = (ordenEditandoId && ordenesEmbarque[ordenEditandoId] && ordenesEmbarque[ordenEditandoId].codigo === codigo)
        ? (Number(ordenesEmbarque[ordenEditandoId].toneladas) || 0) : 0;
    const disponible = (stockFisicoPorCodigoTon()[codigo] || 0) - ((comprometidoPorCodigo()[codigo] || 0) - previo + ton);

    const editando = ordenEditandoId;
    const datos = { oe, codigo, toneladas: ton };
    const promesa = editando
        ? ordenesRef.child(editando).update(datos)
        : ordenesRef.push({ ...datos, estado: 'activa', creado: new Date().toISOString() });

    promesa.then(() => {
        notificar(editando ? `OE ${oe} actualizada` : `OE ${oe} registrada`, 'success');
        if (disponible < 0) {
            notificar(`⚠️ ${ordNombreProducto(codigo)}: queda en ${ordNum(disponible)} t (comprometido supera el stock)`, 'warning');
        }
        ordCancelarEdicion();
    }).catch(err => {
        console.error('Error guardando la OE:', err);
        alert('❌ No se pudo guardar. Intenta de nuevo.');
    });
}

function ordMarcarEmbarcada(id) {
    if (!ordExigirAdmin()) return;
    const o = ordenesEmbarque[id];
    if (!o) return;
    if (!confirm(`¿Marcar la OE ${o.oe} (${ordNombreProducto(o.codigo)}, ${ordNum(Number(o.toneladas) || 0)} t) como embarcada?\n\nDejará de restarse del disponible. Recuerda registrar la salida del stock.`)) return;
    ordenesRef.child(id).update({ estado: 'embarcada', embarcada: new Date().toISOString() })
        .then(() => notificar(`OE ${o.oe} marcada como embarcada`, 'success'))
        .catch(() => alert('❌ No se pudo actualizar. Intenta de nuevo.'));
}

function ordReactivar(id) {
    if (!ordExigirAdmin()) return;
    const o = ordenesEmbarque[id];
    if (!o) return;
    ordenesRef.child(id).update({ estado: 'activa', embarcada: null })
        .then(() => notificar(`OE ${o.oe} vuelve a estar activa`, 'info'))
        .catch(() => alert('❌ No se pudo actualizar. Intenta de nuevo.'));
}

function ordEliminar(id) {
    if (!ordExigirAdmin()) return;
    const o = ordenesEmbarque[id];
    if (!o) return;
    if (!confirm(`¿Eliminar la OE ${o.oe} (${ordNombreProducto(o.codigo)})? Esta acción no se puede deshacer.`)) return;
    ordenesRef.child(id).remove()
        .then(() => notificar(`OE ${o.oe} eliminada`, 'info'))
        .catch(() => alert('❌ No se pudo eliminar. Intenta de nuevo.'));
}
