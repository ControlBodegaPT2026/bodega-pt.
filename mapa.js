// ====================================================================
// 🗺️ MAPA DE OCUPACIÓN SOBRE EL PLANO REAL DE CADA BODEGA
// Depende de app.js: db, layoutPrin, layoutAdo
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

let mapaMostrarNombres = false;

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

    return Object.keys(m.zonas).map(id => {
        const [x, y, w, h] = m.zonas[id];
        const pct = pctUbicacionMapa(id, caps[id] || 0);
        const relleno = ocupColor(pct);
        const borde = ocupBorde(pct);
        const fuente = Math.max(14, Math.min(22, Math.min(w, h) * 0.55));
        const nombre = mapaMostrarNombres
            ? `<text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" dominant-baseline="central"
                style="font: 700 ${fuente}px sans-serif; fill: #fff; stroke: rgba(0,0,0,0.75); stroke-width: 3px; paint-order: stroke;">${id}</text>`
            : '';
        return `<g><title>${id}</title>
            <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${relleno}" fill-opacity="0.6" stroke="${borde}" stroke-width="3"/>
            ${nombre}</g>`;
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

function abrirModalMapa() {
    const modal = document.getElementById('modal-mapa');
    if (!modal) return;
    document.getElementById('leyenda-mapa').innerHTML = [
        [ocupColor(0), 'Hasta 70%'], [ocupColor(80), '71% a 90%'], [ocupColor(95), 'Más de 90%']
    ].map(([c, t]) => `<span style="display:inline-flex; align-items:center; gap:5px;">
            <span style="width:12px; height:12px; border-radius:3px; background:${c}; display:inline-block;"></span>${t}</span>`).join('');
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

// Se llama desde ocupacion.js cada vez que cambia el inventario
function actualizarMapaSiAbierto() {
    const modal = document.getElementById('modal-mapa');
    if (!modal || modal.style.display !== 'flex') return;
    Object.keys(MAPAS_BODEGA).forEach(clave => {
        const svg = document.getElementById('svg-mapa-' + clave);
        if (svg) svg.innerHTML = htmlRectsMapa(clave);
    });
}
