// ====================================================================
// 🥧 GRÁFICOS DE DONA CON FILTROS DE MATERIAL
// Reemplaza a dibujarDonaEnCanvas() y abrirModalGraficos() de material-critico.js
// (cargar DESPUÉS de material-critico.js y mapa.js)
// Depende de: app.js (db, maestroProductos, BODEGAS, fmt)
//             material-critico.js (calcularCategoriasStock)
//             mapa.js (MAPA_CATEGORIAS, MAPA_PRODUCTOS, MAPA_PALETA_PRODUCTOS, mapaCategoriaDePP)
// ====================================================================

// Colores de las categorías cuando no hay filtros (los mismos del mapa)
const COLORES_DONA = {
    "ÁCIDO BÓRICO": "#3182ce", "RECHAZO": "#e53e3e", "CALCINADO": "#d69e2e",
    "GRANULEX": "#38a169", "ULEXITA": "#805ad5", "OTROS": "#718096"
};

// Filtro activo: por categoría o por producto, uno a la vez
const graficosFiltro = { tipo: null, valores: [] };   // tipo: 'categoria' | 'producto' | null

// Las casillas necesitan su propio tamaño (las reglas generales de input las deforman)
(function () {
    const estilo = document.createElement('style');
    estilo.textContent = `
        #modal-graficos input[type="checkbox"] {
            width: 16px !important; height: 16px !important; padding: 0 !important; margin: 0 !important;
            border: none !important; background: none !important; box-shadow: none !important;
            accent-color: #2b6cb0; cursor: pointer;
        }`;
    document.head.appendChild(estilo);
})();

function graficosHayFiltro() {
    return graficosFiltro.tipo !== null && graficosFiltro.valores.length > 0;
}

function graficosFormatoKg(n) {
    return typeof fmt === 'function' ? fmt(Math.round(n)) : String(Math.round(n));
}

// Recorta un nombre largo para que (nombre + sufijo) quepa en el ancho disponible
function graficosRecortar(ctx, nombre, sufijo, anchoMax) {
    if (ctx.measureText(nombre + sufijo).width <= anchoMax) return nombre + sufijo;
    let n = nombre;
    while (n.length > 3 && ctx.measureText(n + '…' + sufijo).width > anchoMax) n = n.slice(0, -1);
    return n.trimEnd() + '…' + sufijo;
}

function graficosColorPorcion(tipo, valor, indice) {
    if (tipo === 'categoria') return (typeof mapaColorCategoria === 'function') ? mapaColorCategoria(valor) : '#718096';
    const paleta = (typeof MAPA_PALETA_PRODUCTOS !== 'undefined') ? MAPA_PALETA_PRODUCTOS : [];
    if (indice < paleta.length) return paleta[indice];
    return `hsl(${Math.round((indice * 137.5) % 360)}, 60%, 48%)`;
}

// Suma de kg por porción (categoría o producto elegidos) en una bodega o en el total
function calcularPorcionesFiltradas(filtroBodega) {
    const idsBodega = (filtroBodega !== 'total' && BODEGAS[filtroBodega])
        ? new Set(BODEGAS[filtroBodega].layout.filter(item => Array.isArray(item)).map(item => item[0]))
        : null;

    const kgPorValor = {};
    graficosFiltro.valores.forEach(v => { kgPorValor[v] = 0; });

    for (let locId in db) {
        if (filtroBodega !== 'total' && !(idsBodega && idsBodega.has(locId))) continue;
        for (let pp in db[locId]) {
            const kg = db[locId][pp].kg || 0;
            const clave = graficosFiltro.tipo === 'categoria'
                ? mapaCategoriaDePP(pp)
                : (maestroProductos[pp] ? maestroProductos[pp].codigo : null);
            if (clave !== null && clave in kgPorValor) kgPorValor[clave] += kg;
        }
    }

    const porciones = {}, colores = {};
    let total = 0;
    graficosFiltro.valores.forEach((valor, i) => {
        let nombre = valor;
        if (graficosFiltro.tipo === 'producto') {
            const p = MAPA_PRODUCTOS.find(x => x.codigo === valor);
            nombre = p ? p.nombre : valor;
        }
        porciones[nombre] = kgPorValor[valor];
        colores[nombre] = graficosColorPorcion(graficosFiltro.tipo, valor, i);
        total += kgPorValor[valor];
    });
    return { porciones, colores, total };
}

function dibujarDonaEnCanvas(canvasId, categorias, stockTotalGeneral, tituloLeyenda, colores, mensajeVacio) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const paleta = colores || COLORES_DONA;
    const nombres = Object.keys(categorias).filter(n => categorias[n] > 0);
    const compacto = nombres.length > 6;
    const paso = compacto ? 34 : 45;

    // Si hay muchas porciones, el gráfico se alarga para que quepa toda la leyenda
    canvas.height = Math.max(260, 70 + paso * nombres.length);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (stockTotalGeneral === 0) {
        ctx.fillStyle = "#718096";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(mensajeVacio || "Sin existencias de stock para graficar", canvas.width / 2, 130);
        return;
    }

    const centerX = 100, centerY = 130, radius = 95, innerRadius = 45;
    let startAngle = 0;

    nombres.forEach(cat => {
        const sliceAngle = (categorias[cat] / stockTotalGeneral) * (2 * Math.PI);
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle, false);
        ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = paleta[cat] || '#718096';
        ctx.fill();
        startAngle += sliceAngle;
    });

    // Total en el centro de la dona
    ctx.textAlign = "center";
    ctx.fillStyle = "#718096";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("TOTAL", centerX, centerY - 13);
    ctx.fillStyle = "#1a202c";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(graficosFormatoKg(stockTotalGeneral), centerX, centerY + 4);
    ctx.fillStyle = "#718096";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("kg", centerX, centerY + 18);

    // Leyenda
    const legendX = 280;
    let legendY = 50;
    ctx.textAlign = "left";
    ctx.font = "bold 15px sans-serif";
    ctx.fillStyle = "#1a202c";
    ctx.fillText(graficosRecortar(ctx, tituloLeyenda, '', 215), legendX, legendY - 28);

    const letra = compacto ? 13 : 15;
    const filtrado = !!colores;   // con filtros, los nombres son más largos: el porcentaje va junto a los kilos
    nombres.forEach(cat => {
        const kgCat = categorias[cat];
        const pct = ((kgCat / stockTotalGeneral) * 100).toFixed(1);

        ctx.fillStyle = paleta[cat] || '#718096';
        ctx.fillRect(legendX, legendY - 11, 14, 14);
        ctx.fillStyle = "#2d3748";
        ctx.font = `bold ${letra}px sans-serif`;
        ctx.fillText(graficosRecortar(ctx, cat, filtrado ? '' : ` (${pct}%)`, 196), legendX + 22, legendY);
        ctx.fillStyle = "#4a5568";
        ctx.font = `bold ${filtrado ? (compacto ? 12 : 14) : letra}px monospace`;
        ctx.fillText(filtrado ? `${graficosFormatoKg(kgCat)} kg · ${pct}%` : `${graficosFormatoKg(kgCat)} kg`,
                     legendX + 22, legendY + (compacto ? 13 : 15));

        legendY += paso;
    });
}

function dibujarTodosLosGraficos() {
    [...Object.keys(BODEGAS), 'total'].forEach(clave => {
        const canvasId = 'canvas-grafico-' + clave;
        const titulo = clave === 'total' ? 'TOTAL GENERAL:' : 'BODEGA ' + BODEGAS[clave].nombre + ':';

        if (!graficosHayFiltro()) {
            const { categorias, stockTotalGeneral } = calcularCategoriasStock(clave);
            dibujarDonaEnCanvas(canvasId, categorias, stockTotalGeneral, titulo);
        } else {
            const r = calcularPorcionesFiltradas(clave);
            dibujarDonaEnCanvas(canvasId, r.porciones, r.total, titulo, r.colores, 'Sin existencias de este material');
        }
    });
}

// ---------- PANEL DE FILTROS ----------

function renderFiltrosGraficos() {
    const cont = document.getElementById('filtros-graficos');
    if (!cont) return;

    const categorias = (typeof MAPA_CATEGORIAS !== 'undefined') ? MAPA_CATEGORIAS : [];
    const productos = (typeof MAPA_PRODUCTOS !== 'undefined') ? MAPA_PRODUCTOS : [];
    const marcada = (tipo, valor) => graficosFiltro.tipo === tipo && graficosFiltro.valores.includes(valor);

    const fila = (tipo, valor, texto, color) => `
        <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;">
            <input type="checkbox" class="chk-filtro-grafico" data-tipo="${tipo}" ${marcada(tipo, valor) ? 'checked' : ''}
                onchange="alternarFiltroGraficos('${tipo}', '${valor}', this.checked)">
            ${color ? `<span style="width: 12px; height: 12px; border-radius: 3px; background: ${color}; display: inline-block; flex-shrink: 0;"></span>` : ''}${texto}
        </label>`;

    cont.innerHTML = `
        <details ${graficosHayFiltro() ? 'open' : ''} style="margin-bottom: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px;">
            <summary style="cursor: pointer; font-weight: bold; font-size: 13px; color: #2d3748;">
                🔎 Filtrar por material <span id="contador-filtros-graficos" style="font-weight: normal; color: #2b6cb0;"></span>
            </summary>
            <div style="font-size: 11px; color: #718096; margin-top: 8px;">
                Se puede filtrar por categoría o por producto, uno a la vez: al marcar del otro grupo, se desmarca el anterior.
            </div>
            <div style="font-size: 11px; font-weight: bold; color: #718096; margin: 10px 0 4px;">CATEGORÍAS</div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px 12px;">
                ${categorias.map(c => fila('categoria', c.nombre, c.nombre, c.color)).join('')}
            </div>
            <div style="font-size: 11px; font-weight: bold; color: #718096; margin: 12px 0 4px;">PRODUCTOS</div>
            <div style="max-height: 170px; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px 12px;">
                ${productos.map(p => fila('producto', p.codigo, p.nombre, '')).join('')}
            </div>
            <button type="button" onclick="limpiarFiltrosGraficos()"
                style="margin-top: 10px; background: #e2e8f0; color: #4a5568; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;">
                Limpiar filtros
            </button>
        </details>`;
    graficosRefrescarContador();
}

function graficosRefrescarContador() {
    const n = graficosFiltro.valores.length;
    const el = document.getElementById('contador-filtros-graficos');
    if (el) el.textContent = n > 0 ? `(${n} activo${n > 1 ? 's' : ''})` : '';
}

function alternarFiltroGraficos(tipo, valor, marcado) {
    // Al cambiar de grupo (categoría <-> producto) se limpia el otro, para no contar dos veces
    if (graficosFiltro.tipo !== null && graficosFiltro.tipo !== tipo) {
        graficosFiltro.valores = [];
        document.querySelectorAll('.chk-filtro-grafico').forEach(chk => {
            if (chk.dataset.tipo !== tipo) chk.checked = false;
        });
    }
    graficosFiltro.tipo = tipo;
    graficosFiltro.valores = graficosFiltro.valores.filter(v => v !== valor);
    if (marcado) graficosFiltro.valores.push(valor);
    if (graficosFiltro.valores.length === 0) graficosFiltro.tipo = null;

    graficosRefrescarContador();
    dibujarTodosLosGraficos();
}

function limpiarFiltrosGraficos() {
    graficosFiltro.tipo = null;
    graficosFiltro.valores = [];
    document.querySelectorAll('.chk-filtro-grafico').forEach(chk => { chk.checked = false; });
    graficosRefrescarContador();
    dibujarTodosLosGraficos();
}

// ---------- VENTANA ----------

function abrirModalGraficos() {
    const modal = document.getElementById('modal-graficos');
    if (!modal) return;
    modal.style.display = 'flex';
    renderFiltrosGraficos();
    dibujarTodosLosGraficos();
}
