// ====================================================================
// 🗺️ MAPA DE OCUPACIÓN SOBRE EL PLANO REAL DE CADA BODEGA (con filtros de material)
// Depende de app.js: db, maestroProductos, layoutPrin, layoutAdo
// Depende de ocupacion.js: ocupColor, ocupBorde
// Imágenes necesarias en la misma carpeta: mapa-principal.jpg, mapa-adoquines.jpg
// ====================================================================

// Cada zona: [x, y, ancho, alto] medidos en píxeles sobre la imagen del mapa
const MAPAS_BODEGA = {
    principal: {
        titulo: 'Bodega Principal',
        imagen: 'mapa-principal.jpg',
        ancho: 1307,
        alto: 638,
        layout: () => layoutPrin,
        zonas: {
            C2: [901, 83, 92, 116],
            C4: [1032, 163, 127, 72],
            C1: [901, 202, 92, 115],
            C3: [1032, 238, 127, 71],
            C5: [784, 337, 198, 68],
            C6: [737, 461, 55, 77],
            C7: [1162, 499, 55, 54],
            A4: [180, 373, 123, 44],
            A3: [306, 373, 122, 44],
            A2: [431, 373, 122, 44],
            A1: [557, 373, 122, 44],
            A8: [180, 436, 123, 44],
            A7: [306, 436, 122, 44],
            A6: [431, 436, 122, 44],
            A5: [557, 436, 122, 44],
            B4: [180, 493, 123, 44],
            B3: [306, 493, 122, 44],
            B2: [431, 493, 122, 44],
            B1: [557, 493, 122, 44],
            B8: [87, 521, 68, 78],
            B7: [180, 556, 123, 44],
            B6: [306, 556, 122, 44],
            B5: [431, 556, 122, 44]
        }
    },
    adoquines: {
        titulo: 'Bodega Adoquines',
        imagen: 'mapa-adoquines.jpg',
        ancho: 1306,
        alto: 413,
        layout: () => layoutAdo,
        zonas: {
            D6: [1079, 20, 198, 60],
            D1: [75, 21, 198, 59],
            D2: [276, 21, 198, 59],
            D3: [477, 21, 198, 59],
            D4: [678, 21, 197, 59],
            D5: [878, 21, 198, 59],
            D7: [913, 125, 328, 43],
            D8: [70, 148, 61, 149],
            E1: [913, 181, 162, 44],
            E2: [1079, 181, 162, 44],
            D9: [804, 220, 76, 94],
            E3: [914, 264, 162, 44],
            E4: [1080, 264, 162, 43]
        }
    }
};

// ---------- FILTROS DE MATERIAL ----------

// Las 5 categorías del gráfico de dona (mismos colores)
const MAPA_CATEGORIAS = [
    { nombre: 'ÁCIDO BÓRICO', color: '#3182ce' },
    { nombre: 'RECHAZO',      color: '#e53e3e' },
    { nombre: 'CALCINADO',    color: '#d69e2e' },
    { nombre: 'GRANULEX',     color: '#38a169' },
    { nombre: 'ULEXITA',      color: '#805ad5' }
];

// Filtros por producto: los mismos materiales del diccionario del asistente virtual.
// Para agregar uno nuevo, añade una línea con su código contable y un nombre corto.
const MAPA_PRODUCTOS = [
    { codigo: 'PTAB030315', nombre: 'Chino' },
    { codigo: 'PTAB031110', nombre: 'Sacas 1200 GI' },
    { codigo: 'PTAB031010', nombre: 'Sacas 1100 GI' },
    { codigo: 'PTAB030610', nombre: 'Sacas 1000 GI' },
    { codigo: 'PTAB030310', nombre: 'Saco etiquetado' },
    { codigo: 'PTAB040310', nombre: 'Saco polvo GI' },
    { codigo: 'PTAB158001', nombre: 'Sacas 2400 GI' },
    { codigo: 'PTUL321001', nombre: 'Ulexita 1100 kg' },
    { codigo: 'PTAB101010', nombre: 'Rechazo polvo (caja manga)' },
    { codigo: 'PTAB941010', nombre: 'Rechazo granular (sobremalla)' },
    { codigo: 'PTAB030328', nombre: 'Saco McCassab' },
    { codigo: 'PTGR210601', nombre: 'Granulex 1000 kg' },
    { codigo: 'PTGR211401', nombre: 'Granulex 2000 lb' },
    { codigo: 'PTGR210501', nombre: 'Granulex 50 lb' },
    { codigo: 'PTAB150548', nombre: 'Saco 50 lb Borates Plus' },
    { codigo: 'PTAB170310', nombre: 'Saco bajo en sulfato' },
    { codigo: 'PTAB111111', nombre: 'Sacas 1100 estándar' },
    { codigo: 'PTAB111110', nombre: 'Sacas 1200 estándar' },
    { codigo: 'PTAB110602', nombre: 'Sacas 1000 estándar' },
    { codigo: 'PTAB300610', nombre: 'Sacas 1000 calcinado' }
];

// Colores para los productos (distintos a los 5 de las categorías)
const MAPA_PALETA_PRODUCTOS = ['#f97316', '#ec4899', '#0d9488', '#06b6d4', '#92400e', '#84cc16', '#4338ca', '#334155', '#c026d3'];

let mapaMostrarNombres = false;
const mapaEstado = { categorias: [], productos: [], coloresProducto: {} };

function mapaHayFiltros() {
    return mapaEstado.categorias.length + mapaEstado.productos.length > 0;
}

function mapaColorCategoria(nombre) {
    const c = MAPA_CATEGORIAS.find(x => x.nombre === nombre);
    return c ? c.color : '#718096';
}

// Misma clasificación por nombre que usa el gráfico de dona
function mapaCategoriaDePP(pp) {
    const nombre = (maestroProductos[pp] && maestroProductos[pp].nombre) ? maestroProductos[pp].nombre.toLowerCase() : '';
    if (nombre.includes('acido') || nombre.includes('ácido')) return 'ÁCIDO BÓRICO';
    if (nombre.includes('rechazo') || nombre.includes('manga')) return 'RECHAZO';
    if (nombre.includes('calcinado')) return 'CALCINADO';
    if (nombre.includes('granulex')) return 'GRANULEX';
    if (nombre.includes('ulexita')) return 'ULEXITA';
    return 'OTROS';
}

// Colores de los filtros activos que están presentes en una ubicación
function mapaColoresEnUbicacion(id) {
    const pps = [];
    if (db[id]) {
        for (let pp in db[id]) {
            const it = db[id][pp];
            if ((it.kg || 0) > 0 || (it.bultos || 0) > 0) pps.push(pp);
        }
    }
    const colores = [];
    mapaEstado.categorias.forEach(cat => {
        if (pps.some(pp => mapaCategoriaDePP(pp) === cat)) colores.push(mapaColorCategoria(cat));
    });
    mapaEstado.productos.forEach(cod => {
        if (pps.some(pp => maestroProductos[pp] && maestroProductos[pp].codigo === cod)) {
            colores.push(mapaEstado.coloresProducto[cod]);
        }
    });
    return colores;
}

function pctUbicacionMapa(id, cap) {
    let usados = 0;
    if (db[id]) for (let pp in db[id]) usados += db[id][pp].bultos || 0;
    return cap > 0 ? Math.round((usados / cap) * 100) : 0;
}

// Dibuja solo los rectángulos de color de un mapa (se usa también al actualizar en vivo)
function htmlRectsMapa(clave) {
    const m = MAPAS_BODEGA[clave];
    const caps = {};
    m.layout().forEach(item => { if (Array.isArray(item)) caps[item[0]] = item[1]; });
    const filtrando = mapaHayFiltros();

    return Object.keys(m.zonas).map(id => {
        const [x, y, w, h] = m.zonas[id];
        const fuente = Math.max(14, Math.min(22, Math.min(w, h) * 0.55));
        const nombre = mapaMostrarNombres
            ? `<text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" dominant-baseline="central"
                style="font: 700 ${fuente}px sans-serif; fill: #fff; stroke: rgba(0,0,0,0.75); stroke-width: 3px; paint-order: stroke;">${id}</text>`
            : '';

        let figura;
        if (!filtrando) {
            // Modo ocupación: color del semáforo
            const pct = pctUbicacionMapa(id, caps[id] || 0);
            figura = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${ocupColor(pct)}" fill-opacity="0.6" stroke="${ocupBorde(pct)}" stroke-width="3"/>`;
        } else {
            // Modo filtro: se pintan solo las ubicaciones donde está el material elegido
            const colores = mapaColoresEnUbicacion(id);
            if (colores.length === 0) {
                figura = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#2d3748" fill-opacity="0.45" stroke="#cbd5e0" stroke-width="2"/>`;
            } else {
                const ancho = w / colores.length;
                const franjas = colores.map((c, i) =>
                    `<rect x="${x + i * ancho}" y="${y}" width="${ancho}" height="${h}" fill="${c}" fill-opacity="0.8"/>`).join('');
                figura = `${franjas}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="none" stroke="#1a202c" stroke-width="3"/>`;
            }
        }
        return `<g><title>${id}</title>${figura}${nombre}</g>`;
    }).join('');
}

function renderMapas() {
    const contenedor = document.getElementById('contenedor-mapas');
    if (!contenedor) return;

    contenedor.innerHTML = Object.keys(MAPAS_BODEGA).map(clave => {
        const m = MAPAS_BODEGA[clave];
        return `
            <h4 style="margin: 14px 0 6px 0; color: #2b6cb0;">${m.titulo}</h4>
            <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                <div style="position: relative; min-width: ${mapaMostrarNombres ? 900 : 0}px;">
                    <img src="${m.imagen}" alt="${m.titulo}" style="display: block; width: 100%; height: auto;">
                    <svg id="svg-mapa-${clave}" viewBox="0 0 ${m.ancho} ${m.alto}" xmlns="http://www.w3.org/2000/svg"
                        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">${htmlRectsMapa(clave)}</svg>
                </div>
            </div>`;
    }).join('');
}

// ---------- PANEL DE FILTROS ----------

function renderFiltrosMapa() {
    const cont = document.getElementById('filtros-mapa');
    if (!cont) return;

    const filaCategoria = c => `
        <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;">
            <input type="checkbox" class="chk-filtro-mapa" ${mapaEstado.categorias.includes(c.nombre) ? 'checked' : ''}
                onchange="alternarFiltroMapa('categoria', '${c.nombre}', this.checked)">
            <span style="width: 12px; height: 12px; border-radius: 3px; background: ${c.color}; display: inline-block; flex-shrink: 0;"></span>${c.nombre}
        </label>`;

    const filaProducto = p => `
        <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;">
            <input type="checkbox" class="chk-filtro-mapa" ${mapaEstado.productos.includes(p.codigo) ? 'checked' : ''}
                onchange="alternarFiltroMapa('producto', '${p.codigo}', this.checked)">
            <span id="sw-prod-${p.codigo}" style="width: 12px; height: 12px; border-radius: 3px; border: 1px dashed #cbd5e0; background: ${mapaEstado.coloresProducto[p.codigo] || 'transparent'}; display: inline-block; flex-shrink: 0;"></span>${p.nombre}
        </label>`;

    const n = mapaEstado.categorias.length + mapaEstado.productos.length;
    cont.innerHTML = `
        <details ${n > 0 ? 'open' : ''} style="margin-top: 10px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px;">
            <summary style="cursor: pointer; font-weight: bold; font-size: 13px; color: #2d3748;">
                🔎 Filtrar por material <span id="contador-filtros-mapa" style="font-weight: normal; color: #2b6cb0;"></span>
            </summary>
            <div style="font-size: 11px; font-weight: bold; color: #718096; margin: 10px 0 4px;">CATEGORÍAS</div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px 12px;">
                ${MAPA_CATEGORIAS.map(filaCategoria).join('')}
            </div>
            <div style="font-size: 11px; font-weight: bold; color: #718096; margin: 12px 0 4px;">PRODUCTOS</div>
            <div style="max-height: 170px; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px 12px;">
                ${MAPA_PRODUCTOS.map(filaProducto).join('')}
            </div>
            <button type="button" onclick="limpiarFiltrosMapa()"
                style="margin-top: 10px; background: #e2e8f0; color: #4a5568; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;">
                Limpiar filtros
            </button>
        </details>`;
    mapaRefrescarContador();
}

function mapaRefrescarContador() {
    const n = mapaEstado.categorias.length + mapaEstado.productos.length;
    const cnt = document.getElementById('contador-filtros-mapa');
    if (cnt) cnt.textContent = n > 0 ? `(${n} activo${n > 1 ? 's' : ''})` : '';
}

function renderLeyendaMapa() {
    const el = document.getElementById('leyenda-mapa');
    if (!el) return;

    const chip = (color, texto, extra = '') => `<span style="display: inline-flex; align-items: center; gap: 5px;">
        <span style="width: 12px; height: 12px; border-radius: 3px; background: ${color}; display: inline-block; ${extra}"></span>${texto}</span>`;

    if (!mapaHayFiltros()) {
        el.innerHTML = chip(ocupColor(0), 'Hasta 70%') + chip(ocupColor(80), '71% a 90%') + chip(ocupColor(95), 'Más de 90%');
        return;
    }

    const items = [];
    mapaEstado.categorias.forEach(nombre => items.push(chip(mapaColorCategoria(nombre), nombre)));
    mapaEstado.productos.forEach(cod => {
        const p = MAPA_PRODUCTOS.find(x => x.codigo === cod);
        items.push(chip(mapaEstado.coloresProducto[cod], p ? p.nombre : cod));
    });
    items.push(chip('#2d3748', 'Sin ese material', 'opacity: 0.45;'));
    el.innerHTML = items.join('');
}

function mapaRefrescarFiltros() {
    MAPA_PRODUCTOS.forEach(p => {
        const sw = document.getElementById('sw-prod-' + p.codigo);
        if (sw) sw.style.background = mapaEstado.coloresProducto[p.codigo] || 'transparent';
    });
    mapaRefrescarContador();
    renderLeyendaMapa();
    actualizarMapaSiAbierto();
}

function alternarFiltroMapa(tipo, valor, marcado) {
    if (tipo === 'categoria') {
        mapaEstado.categorias = mapaEstado.categorias.filter(c => c !== valor);
        if (marcado) mapaEstado.categorias.push(valor);
    } else {
        mapaEstado.productos = mapaEstado.productos.filter(c => c !== valor);
        delete mapaEstado.coloresProducto[valor];
        if (marcado) {
            mapaEstado.productos.push(valor);
            const usados = Object.values(mapaEstado.coloresProducto);
            mapaEstado.coloresProducto[valor] = MAPA_PALETA_PRODUCTOS.find(c => !usados.includes(c))
                || MAPA_PALETA_PRODUCTOS[mapaEstado.productos.length % MAPA_PALETA_PRODUCTOS.length];
        }
    }
    mapaRefrescarFiltros();
}

function limpiarFiltrosMapa() {
    mapaEstado.categorias = [];
    mapaEstado.productos = [];
    mapaEstado.coloresProducto = {};
    document.querySelectorAll('#filtros-mapa .chk-filtro-mapa').forEach(chk => { chk.checked = false; });
    mapaRefrescarFiltros();
}

// ---------- VENTANA ----------

function abrirModalMapa() {
    const modal = document.getElementById('modal-mapa');
    if (!modal) return;
    renderFiltrosMapa();
    renderLeyendaMapa();
    renderMapas();
    modal.style.display = 'flex';
}

function cerrarModalMapa() {
    const modal = document.getElementById('modal-mapa');
    if (modal) modal.style.display = 'none';
}

function alternarNombresMapa(chk) {
    mapaMostrarNombres = chk.checked;
    renderMapas();
}

// Se llama desde ocupacion.js cada vez que cambia el inventario, y al cambiar un filtro
function actualizarMapaSiAbierto() {
    const modal = document.getElementById('modal-mapa');
    if (!modal || modal.style.display !== 'flex') return;
    Object.keys(MAPAS_BODEGA).forEach(clave => {
        const svg = document.getElementById('svg-mapa-' + clave);
        if (svg) svg.innerHTML = htmlRectsMapa(clave);
    });
}
