// ====================================================================
// 📄 RESUMEN EJECUTIVO EN PDF (estilo panel de control)
// Depende de app.js: db, maestroProductos, BODEGAS, notificar
// Depende de material-critico.js: calcularCategoriasStock, calcularMaterialCritico
// Depende de mapa.js: MAPA_PRODUCTOS, mapaCategoriaDePP
// Depende de ocupacion.js: ocupColor
// Opcional (comprometido.js): resumenComprometido, ordenesActivas, comprometidoParaBloque, ordNombreProducto
// Usa la librería jsPDF (se descarga sola desde cdnjs la primera vez que se usa)
// ====================================================================

const PDFRES = {
    W: 1123, H: 794, M: 24,                 // página A4 horizontal (en píxeles lógicos)
    ESCALA: 2.5,                            // nitidez de la imagen dentro del PDF
    FUENTE: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    COLOR_CATEGORIA: {
        'ÁCIDO BÓRICO': '#3182ce', 'RECHAZO': '#e53e3e', 'CALCINADO': '#d69e2e',
        'GRANULEX': '#38a169', 'ULEXITA': '#805ad5', 'OTROS': '#718096'
    }
};

// ---------- Formatos y colores ----------
const pdfResNum = (n, dec = 0) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);
const pdfResTon = kg => pdfResNum(kg / 1000, 1);

function pdfResRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function pdfResMezcla(hex, destino, t) {
    const c = pdfResRgb(hex);
    return `rgb(${c.map((v, i) => Math.round(v + (destino[i] - v) * t)).join(',')})`;
}
const pdfResAclarar = (hex, t) => pdfResMezcla(hex, [255, 255, 255], t);
const pdfResOscurecer = (hex, t) => pdfResMezcla(hex, [0, 0, 0], t);

function pdfResColorOcup(p) {
    if (typeof ocupColor === 'function') return ocupColor(p);
    return p > 90 ? '#e53e3e' : (p > 70 ? '#eabc04' : '#38a169');
}

// ---------- Dibujo básico ----------
function pdfResRR(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function pdfResAjustar(ctx, txt, max) {
    let t = String(txt);
    if (!max || ctx.measureText(t).width <= max) return t;
    while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
    return t.trimEnd() + '…';
}

function pdfResTexto(ctx, txt, x, y, o = {}) {
    ctx.font = `${o.peso || 'normal'} ${o.tam || 12}px ${PDFRES.FUENTE}`;
    ctx.fillStyle = o.color || '#374151';
    ctx.textAlign = o.alinea || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    ctx.fillText(pdfResAjustar(ctx, txt, o.max), x, y);
}

// Parte un texto en hasta N líneas que quepan en un ancho
function pdfResEnvolver(ctx, txt, max, maxLineas) {
    const palabras = String(txt).split(' ');
    const lineas = [];
    let actual = '';
    palabras.forEach(p => {
        const prueba = actual ? actual + ' ' + p : p;
        if (ctx.measureText(prueba).width <= max || !actual) actual = prueba;
        else { lineas.push(actual); actual = p; }
    });
    if (actual) lineas.push(actual);
    if (lineas.length > maxLineas) {
        lineas.length = maxLineas;
        lineas[maxLineas - 1] = pdfResAjustar(ctx, lineas[maxLineas - 1] + '…', max);
    }
    return lineas.map(l => pdfResAjustar(ctx, l, max));
}

function pdfResTarjeta(ctx, x, y, w, h, titulo, subtitulo) {
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.13)';
    ctx.shadowBlur = 9;
    ctx.shadowOffsetY = 2;
    pdfResRR(ctx, x, y, w, h, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
    if (titulo) pdfResTexto(ctx, titulo, x + 14, y + 22, { peso: '600', tam: 13.5, color: '#1f2937', max: w - 28 });
    if (subtitulo) pdfResTexto(ctx, subtitulo.toUpperCase(), x + 14, y + 36, { tam: 8.5, color: '#9ca3af', max: w - 28 });
}

function pdfResFondo(ctx) {
    ctx.fillStyle = '#e8ebf0';
    ctx.fillRect(0, 0, PDFRES.W, PDFRES.H);
}

function pdfResBanner(ctx, titulo, subtitulo, logo, fecha, alto) {
    const x = PDFRES.M, y = PDFRES.M, w = PDFRES.W - 2 * PDFRES.M;
    ctx.save();
    ctx.shadowColor = 'rgba(30, 78, 140, 0.35)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    pdfResRR(ctx, x, y, w, alto, 12);
    const g = ctx.createLinearGradient(x, y, x + w * 0.55, y + alto * 3);
    g.addColorStop(0, '#1e4e8c');
    g.addColorStop(0.5, '#2b6cb0');
    g.addColorStop(1, '#3b82c4');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();

    // reflejo suave en la mitad superior
    ctx.save();
    pdfResRR(ctx, x, y, w, alto, 12);
    ctx.clip();
    const brillo = ctx.createLinearGradient(0, y, 0, y + alto);
    brillo.addColorStop(0, 'rgba(255,255,255,0.16)');
    brillo.addColorStop(0.5, 'rgba(255,255,255,0.02)');
    brillo.addColorStop(1, 'rgba(0,0,0,0.06)');
    ctx.fillStyle = brillo;
    ctx.fillRect(x, y, w, alto);
    ctx.restore();

    let tx = x + 22;
    if (logo) {
        const lh = Math.min(alto - 24, 38), lw = lh * (logo.width / logo.height || 2);
        ctx.drawImage(logo, x + 20, y + (alto - lh) / 2, lw, lh);
        tx = x + 20 + lw + 18;
    }
    pdfResTexto(ctx, titulo, tx, y + alto / 2 + (subtitulo ? -2 : 7), { peso: 'bold', tam: 22, color: '#ffffff' });
    if (subtitulo) pdfResTexto(ctx, subtitulo, tx, y + alto / 2 + 16, { tam: 11, color: 'rgba(255,255,255,0.85)' });
    pdfResTexto(ctx, fecha.dia, x + w - 22, y + alto / 2 - 2, { peso: '600', tam: 13, color: '#ffffff', alinea: 'right' });
    pdfResTexto(ctx, fecha.hora, x + w - 22, y + alto / 2 + 16, { tam: 10.5, color: 'rgba(255,255,255,0.85)', alinea: 'right' });
}

// Medidor semicircular
function pdfResGauge(ctx, cx, cy, R, grosor, pct) {
    const col = pdfResColorOcup(pct);
    ctx.lineCap = 'round';
    ctx.lineWidth = grosor;
    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.arc(cx, cy, R, Math.PI, 2 * Math.PI);
    ctx.stroke();

    if (pct > 0) {
        const fin = Math.PI + Math.PI * Math.min(pct, 100) / 100;
        ctx.save();
        ctx.shadowColor = 'rgba(15, 23, 42, 0.25)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
        const g = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
        g.addColorStop(0, pdfResAclarar(col, 0.18));
        g.addColorStop(1, pdfResOscurecer(col, 0.08));
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, R, Math.PI, fin);
        ctx.stroke();
        ctx.restore();
        // reflejo
        ctx.lineWidth = grosor * 0.28;
        ctx.strokeStyle = 'rgba(255,255,255,0.38)';
        ctx.beginPath();
        ctx.arc(cx, cy, R + grosor * 0.2, Math.PI + 0.03, fin - 0.03);
        ctx.stroke();
    }
    ctx.lineCap = 'butt';
}

// Dona con degradados, separadores y brillo
function pdfResDona(ctx, cx, cy, R, r, porciones, totalTexto) {
    const total = porciones.reduce((s, p) => s + p.valor, 0);
    if (total <= 0) {
        pdfResTexto(ctx, 'Sin datos', cx, cy, { alinea: 'center', color: '#9ca3af' });
        return;
    }
    const trazar = (a0, a1) => {
        ctx.beginPath();
        ctx.arc(cx, cy, R, a0, a1, false);
        ctx.arc(cx, cy, r, a1, a0, true);
        ctx.closePath();
    };
    let ang = -Math.PI / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.30)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    porciones.forEach(p => {
        if (p.valor <= 0) return;
        const barrido = (p.valor / total) * 2 * Math.PI;
        const g = ctx.createRadialGradient(cx, cy, r, cx, cy, R);
        g.addColorStop(0, pdfResOscurecer(p.color, 0.14));
        g.addColorStop(0.55, pdfResAclarar(p.color, 0.06));
        g.addColorStop(1, pdfResAclarar(p.color, 0.2));
        trazar(ang, ang + barrido);
        ctx.fillStyle = g;
        ctx.fill();
        ang += barrido;
    });
    ctx.restore();

    ang = -Math.PI / 2;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    porciones.forEach(p => {
        if (p.valor <= 0) return;
        const barrido = (p.valor / total) * 2 * Math.PI;
        trazar(ang, ang + barrido);
        ctx.stroke();
        ang += barrido;
    });

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI, false);
    ctx.arc(cx, cy, r, 0, 2 * Math.PI, true);
    ctx.clip();
    const brillo = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    brillo.addColorStop(0, 'rgba(255,255,255,0.30)');
    brillo.addColorStop(0.42, 'rgba(255,255,255,0.05)');
    brillo.addColorStop(0.58, 'rgba(255,255,255,0)');
    brillo.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = brillo;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();

    const disco = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, 3, cx, cy, r - 2);
    disco.addColorStop(0, '#ffffff');
    disco.addColorStop(1, '#eaeff5');
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 3, 0, 2 * Math.PI);
    ctx.fillStyle = disco;
    ctx.fill();
    ctx.restore();

    pdfResTexto(ctx, 'TOTAL', cx, cy - 7, { peso: 'bold', tam: 8, color: '#9ca3af', alinea: 'center' });
    pdfResTexto(ctx, totalTexto, cx, cy + 8, { peso: 'bold', tam: 14, color: '#111827', alinea: 'center' });
    pdfResTexto(ctx, 'toneladas', cx, cy + 19, { tam: 7.5, color: '#9ca3af', alinea: 'center' });
}

// Barra horizontal con brillo
function pdfResBarra(ctx, x, y, w, h, frac, color) {
    ctx.fillStyle = '#e5e7eb';
    pdfResRR(ctx, x, y, w, h, h / 2);
    ctx.fill();
    const wb = Math.max(h, w * Math.min(Math.max(frac, 0), 1));
    if (frac <= 0) return;
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, pdfResAclarar(color, 0.28));
    g.addColorStop(0.5, color);
    g.addColorStop(1, pdfResOscurecer(color, 0.1));
    pdfResRR(ctx, x, y, wb, h, h / 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
}

// ---------- Recopilación de datos ----------
function pdfResRecopilarDatos() {
    const claves = Object.keys(BODEGAS);
    const nombreProd = {};
    (typeof MAPA_PRODUCTOS !== 'undefined' ? MAPA_PRODUCTOS : []).forEach(p => { nombreProd[p.codigo] = p.nombre; });

    const bodegas = claves.map(clave => {
        let cap = 0, bultos = 0, kg = 0;
        const ubicaciones = [];
        BODEGAS[clave].layout.forEach(item => {
            if (!Array.isArray(item)) return;
            const [id, c] = item;
            let b = 0, k = 0;
            if (db[id]) for (const pp in db[id]) { b += db[id][pp].bultos || 0; k += db[id][pp].kg || 0; }
            cap += c; bultos += b; kg += k;
            ubicaciones.push({ id, cap: c, bultos: b, pct: c > 0 ? Math.round((b / c) * 100) : 0 });
        });
        return {
            clave, nombre: BODEGAS[clave].nombre, cap, bultos, kg,
            pct: cap > 0 ? Math.round((bultos / cap) * 100) : 0,
            ubicaciones, categorias: calcularCategoriasStock(clave).categorias
        };
    });

    const total = {
        cap: bodegas.reduce((s, b) => s + b.cap, 0),
        bultos: bodegas.reduce((s, b) => s + b.bultos, 0),
        kg: bodegas.reduce((s, b) => s + b.kg, 0)
    };
    total.pct = total.cap > 0 ? Math.round((total.bultos / total.cap) * 100) : 0;

    // Categorías del total (suma de las bodegas, para que todo cuadre)
    const categoriasTotal = {};
    bodegas.forEach(b => { for (const c in b.categorias) categoriasTotal[c] = (categoriasTotal[c] || 0) + b.categorias[c]; });

    // Por PP y por código contable (solo ubicaciones que pertenecen a alguna bodega)
    const idsValidos = new Set();
    bodegas.forEach(b => b.ubicaciones.forEach(u => idsValidos.add(u.id)));
    const porPP = {}, porCodigo = {};
    for (const loc in db) {
        if (!idsValidos.has(loc)) continue;
        for (const pp in db[loc]) {
            const it = db[loc][pp];
            const kg = it.kg || 0, bultos = it.bultos || 0;
            if (!(kg > 0 || bultos > 0)) continue;
            if (!porPP[pp]) porPP[pp] = { pp, kg: 0, bultos: 0, ubis: [] };
            porPP[pp].kg += kg; porPP[pp].bultos += bultos; porPP[pp].ubis.push(loc);

            const m = maestroProductos[pp] || {};
            const cod = m.codigo || 'SIN-CODIGO';
            if (!porCodigo[cod]) porCodigo[cod] = { codigo: cod, kg: 0, pps: new Set(), nombre: m.nombre || '', categoria: mapaCategoriaDePP(pp) };
            porCodigo[cod].kg += kg; porCodigo[cod].pps.add(pp);
        }
    }
    const topPP = Object.values(porPP).sort((a, b) => b.kg - a.kg).slice(0, 10).map(p => {
        const m = maestroProductos[p.pp] || {};
        return { ...p, codigo: m.codigo || '', material: nombreProd[m.codigo] || m.nombre || m.codigo || 'Sin código' };
    });
    const topMateriales = Object.values(porCodigo).sort((a, b) => b.kg - a.kg).slice(0, 8).map(c => ({
        ...c, etiqueta: nombreProd[c.codigo] || c.nombre || c.codigo, nPP: c.pps.size
    }));

    // Conteo de ubicaciones por semáforo
    const sem = { verde: 0, amarillo: 0, rojo: 0 };
    bodegas.forEach(b => b.ubicaciones.forEach(u => { if (u.pct > 90) sem.rojo++; else if (u.pct > 70) sem.amarillo++; else sem.verde++; }));

    // Material comprometido (órdenes de embarque), si el módulo está cargado
    let comp = null, ordenes = [];
    if (typeof resumenComprometido === 'function') {
        comp = resumenComprometido();
        ordenes = ordenesActivas()
            .sort((a, b) => String(a.oe).localeCompare(String(b.oe), undefined, { numeric: true }))
            .map(o => ({ oe: o.oe, nombre: ordNombreProducto(o.codigo), ton: Number(o.toneladas) || 0 }));
    }

    const ahora = new Date();
    return {
        ahora, bodegas, total, categoriasTotal, topPP, topMateriales, sem, comp, ordenes,
        nPP: Object.keys(porPP).length, nMateriales: Object.keys(porCodigo).length,
        criticas: calcularMaterialCritico(),
        fecha: {
            dia: ahora.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }),
            hora: 'Generado a las ' + ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })
        }
    };
}

// ---------- Página 1: panel general ----------
function pdfResPagina1(ctx, d, logo) {
    const { W, M } = PDFRES;
    pdfResFondo(ctx);
    pdfResBanner(ctx, 'RESUMEN DE BODEGAS', 'Control de Bodega PT. · Estado de stock y ocupación', logo, d.fecha, 66);

    // ----- Fila A: indicadores -----
    const yA = 104, hA = 150, gap = 12;
    const wA = (W - 2 * M - 3 * gap) / 4;
    const xA = i => M + i * (wA + gap);

    // A1: toneladas
    pdfResTarjeta(ctx, xA(0), yA, wA, hA, 'Stock total', 'Toneladas almacenadas');
    pdfResTexto(ctx, pdfResTon(d.total.kg), xA(0) + wA / 2, yA + 92, { peso: '300', tam: 46, color: '#111827', alinea: 'center' });
    pdfResTexto(ctx, 'toneladas', xA(0) + wA / 2, yA + 112, { tam: 11, color: '#6b7280', alinea: 'center' });
    if (d.comp && d.comp.nOrdenes > 0) {
        pdfResTexto(ctx, `${d.nPP} PP distintas · ${d.nMateriales} materiales`, xA(0) + wA / 2, yA + 127, { tam: 10, color: '#9ca3af', alinea: 'center' });
        pdfResTexto(ctx, `Comprometido ${pdfResNum(d.comp.totalComprometido, 0)} t · Disponible neto ${pdfResNum(d.comp.totalDisponible, 0)} t`, xA(0) + wA / 2, yA + 142,
            { peso: '600', tam: 9.5, color: d.comp.totalDisponible < 0 ? '#c53030' : '#276749', alinea: 'center', max: wA - 20 });
    } else {
        pdfResTexto(ctx, `${d.nPP} PP distintas · ${d.nMateriales} materiales`, xA(0) + wA / 2, yA + 134, { tam: 10, color: '#9ca3af', alinea: 'center' });
    }

    // A2: ocupación general
    pdfResTarjeta(ctx, xA(1), yA, wA, hA, 'Ocupación general', 'Bultos ocupados sobre capacidad');
    const cx2 = xA(1) + wA / 2;
    pdfResGauge(ctx, cx2, yA + 114, 56, 14, d.total.pct);
    pdfResTexto(ctx, d.total.pct + '%', cx2, yA + 112, { peso: '600', tam: 26, color: pdfResColorOcup(d.total.pct), alinea: 'center' });
    pdfResTexto(ctx, '0', cx2 - 56, yA + 130, { tam: 9, color: '#9ca3af', alinea: 'center' });
    pdfResTexto(ctx, '100%', cx2 + 56, yA + 130, { tam: 9, color: '#9ca3af', alinea: 'center' });
    pdfResTexto(ctx, `${pdfResNum(d.total.bultos)} / ${pdfResNum(d.total.cap)} bultos`, cx2, yA + 143, { tam: 10, color: '#6b7280', alinea: 'center' });

    // A3: disponibles
    pdfResTarjeta(ctx, xA(2), yA, wA, hA, 'Bultos disponibles', 'Espacio libre en todas las bodegas');
    pdfResTexto(ctx, pdfResNum(d.total.cap - d.total.bultos), xA(2) + wA / 2, yA + 92, { peso: '300', tam: 46, color: '#111827', alinea: 'center' });
    pdfResTexto(ctx, 'bultos', xA(2) + wA / 2, yA + 112, { tam: 11, color: '#6b7280', alinea: 'center' });
    pdfResTexto(ctx, `Capacidad total: ${pdfResNum(d.total.cap)} bultos`, xA(2) + wA / 2, yA + 134, { tam: 10, color: '#9ca3af', alinea: 'center' });

    // A4: ubicaciones críticas
    pdfResTarjeta(ctx, xA(3), yA, wA, hA, 'Ubicaciones críticas', 'Con más de 90% de ocupación');
    const colCrit = d.sem.rojo > 0 ? '#e53e3e' : '#38a169';
    pdfResTexto(ctx, String(d.sem.rojo), xA(3) + wA / 2, yA + 92, { peso: '300', tam: 46, color: colCrit, alinea: 'center' });
    pdfResTexto(ctx, `de ${d.sem.verde + d.sem.amarillo + d.sem.rojo} ubicaciones`, xA(3) + wA / 2, yA + 112, { tam: 11, color: '#6b7280', alinea: 'center' });
    const puntos = [['#38a169', d.sem.verde, 'hasta 70%'], [pdfResColorOcup(80), d.sem.amarillo, '71-90%'], ['#e53e3e', d.sem.rojo, '+90%']];
    const wp = (wA - 28) / 3;
    puntos.forEach((p, i) => {
        const px = xA(3) + 14 + i * wp + wp / 2;
        ctx.beginPath();
        ctx.arc(px - 16, yA + 131, 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = p[0];
        ctx.fill();
        pdfResTexto(ctx, String(p[1]), px - 8, yA + 135, { peso: 'bold', tam: 12, color: '#374151' });
    });

    // ----- Fila B -----
    const yB = 266, hB = 240;
    const wB1 = 320, wB2 = 420, wB3 = W - 2 * M - wB1 - wB2 - 2 * gap;
    const xB1 = M, xB2 = M + wB1 + gap, xB3 = xB2 + wB2 + gap;

    // B1: ocupación por bodega
    pdfResTarjeta(ctx, xB1, yB, wB1, hB, 'Ocupación por bodega', 'Bultos ocupados / capacidad');
    const filas = d.bodegas.length, hFila = (hB - 56) / filas;
    d.bodegas.forEach((b, i) => {
        const y0 = yB + 52 + i * hFila;
        pdfResTexto(ctx, 'BODEGA ' + b.nombre, xB1 + 14, y0 + 12, { peso: '600', tam: 11.5, color: '#374151' });
        pdfResTexto(ctx, `${pdfResNum(b.bultos)} / ${pdfResNum(b.cap)}`, xB1 + wB1 - 14, y0 + 12, { tam: 10, color: '#6b7280', alinea: 'right' });
        pdfResBarra(ctx, xB1 + 14, y0 + 22, wB1 - 28 - 52, 15, b.pct / 100, pdfResColorOcup(b.pct));
        pdfResTexto(ctx, b.pct + '%', xB1 + wB1 - 14, y0 + 35, { peso: 'bold', tam: 14, color: pdfResColorOcup(b.pct), alinea: 'right' });
        pdfResTexto(ctx, `${pdfResTon(b.kg)} toneladas`, xB1 + 14, y0 + 54, { tam: 9.5, color: '#9ca3af' });
    });

    // B2: toneladas por bodega y categoría (columnas apiladas)
    pdfResTarjeta(ctx, xB2, yB, wB2, hB, 'Toneladas por bodega y categoría', 'Distribución del stock');
    const catsPresentes = Object.keys(PDFRES.COLOR_CATEGORIA).filter(c => d.bodegas.some(b => (b.categorias[c] || 0) > 0));
    const tonBodega = d.bodegas.map(b => b.kg / 1000);
    const maxTon = Math.max(1, ...tonBodega);
    const escalaMax = Math.ceil(maxTon / 100) * 100 || 100;
    const gx0 = xB2 + 52, gx1 = xB2 + wB2 - 16, gy0 = yB + 58, gy1 = yB + hB - 52;
    [0, 0.5, 1].forEach(f => {
        const gy = gy1 - (gy1 - gy0) * f;
        ctx.strokeStyle = '#eef0f3'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();
        pdfResTexto(ctx, pdfResNum(escalaMax * f), gx0 - 8, gy + 3, { tam: 9, color: '#9ca3af', alinea: 'right' });
    });
    const nb = d.bodegas.length, paso = (gx1 - gx0) / nb, anchoBarra = Math.min(70, paso * 0.5);
    d.bodegas.forEach((b, i) => {
        const bx = gx0 + paso * i + (paso - anchoBarra) / 2;
        let yAcum = gy1;
        catsPresentes.forEach(c => {
            const t = (b.categorias[c] || 0) / 1000;
            if (t <= 0) return;
            const hh = (gy1 - gy0) * (t / escalaMax);
            const col = PDFRES.COLOR_CATEGORIA[c];
            const g = ctx.createLinearGradient(bx, 0, bx + anchoBarra, 0);
            g.addColorStop(0, pdfResAclarar(col, 0.22));
            g.addColorStop(0.5, col);
            g.addColorStop(1, pdfResOscurecer(col, 0.12));
            ctx.fillStyle = g;
            ctx.fillRect(bx, yAcum - hh, anchoBarra, hh);
            ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
            ctx.strokeRect(bx, yAcum - hh, anchoBarra, hh);
            if (hh >= 15) pdfResTexto(ctx, pdfResNum(t, 0), bx + anchoBarra / 2, yAcum - hh / 2 + 3.5, { peso: '600', tam: 9, color: '#ffffff', alinea: 'center' });
            yAcum -= hh;
        });
        pdfResTexto(ctx, pdfResNum(tonBodega[i], 0) + ' t', bx + anchoBarra / 2, yAcum - 6, { peso: 'bold', tam: 11, color: '#111827', alinea: 'center' });
        pdfResTexto(ctx, b.nombre, bx + anchoBarra / 2, gy1 + 16, { peso: '600', tam: 10, color: '#4b5563', alinea: 'center' });
    });
    // leyenda
    let lx = xB2 + 16;
    catsPresentes.forEach(c => {
        ctx.fillStyle = PDFRES.COLOR_CATEGORIA[c];
        pdfResRR(ctx, lx, yB + hB - 22, 9, 9, 2); ctx.fill();
        pdfResTexto(ctx, c, lx + 13, yB + hB - 14, { tam: 8.5, color: '#4b5563' });
        ctx.font = `normal 8.5px ${PDFRES.FUENTE}`;
        lx += 13 + ctx.measureText(c).width + 12;
    });

    // B3: stock por categoría (dona)
    pdfResTarjeta(ctx, xB3, yB, wB3, hB, 'Stock por categoría', 'Todas las bodegas');
    const porciones = Object.keys(PDFRES.COLOR_CATEGORIA)
        .map(c => ({ nombre: c, valor: d.categoriasTotal[c] || 0, color: PDFRES.COLOR_CATEGORIA[c] }))
        .filter(p => p.valor > 0);
    const totalCat = porciones.reduce((s, p) => s + p.valor, 0);
    pdfResDona(ctx, xB3 + 78, yB + 132, 60, 31, porciones, pdfResNum(totalCat / 1000, 0));
    let ly = yB + 62;
    porciones.forEach(p => {
        ctx.fillStyle = p.color;
        pdfResRR(ctx, xB3 + 150, ly - 8, 10, 10, 3); ctx.fill();
        pdfResTexto(ctx, p.nombre, xB3 + 166, ly, { peso: '600', tam: 9.5, color: '#374151', max: wB3 - 176 });
        pdfResTexto(ctx, `${pdfResNum(p.valor / 1000, 1)} t · ${pdfResNum((p.valor / totalCat) * 100, 1)}%`, xB3 + 166, ly + 12, { tam: 9, color: '#6b7280' });
        ly += 31;
    });

    // ----- Fila C -----
    const yC = 518, hC = 252;
    const wC1 = 520, wC2 = W - 2 * M - wC1 - gap;
    const xC2 = M + wC1 + gap;

    // C1: principales materiales
    pdfResTarjeta(ctx, M, yC, wC1, hC, 'Principales materiales', 'Toneladas por código contable');
    const maxMat = Math.max(1, ...d.topMateriales.map(m => m.kg));
    d.topMateriales.forEach((m, i) => {
        const y0 = yC + 56 + i * 23;
        pdfResTexto(ctx, m.etiqueta, M + 14, y0 + 10, { tam: 10, color: '#374151', max: 170 });
        pdfResBarra(ctx, M + 192, y0 + 1, 240, 12, m.kg / maxMat, PDFRES.COLOR_CATEGORIA[m.categoria] || '#718096');
        pdfResTexto(ctx, pdfResTon(m.kg) + ' t', M + wC1 - 14, y0 + 11, { peso: '600', tam: 10.5, color: '#111827', alinea: 'right' });
    });

    // C2: estado de las ubicaciones
    pdfResTarjeta(ctx, xC2, yC, wC2, hC, 'Estado de las ubicaciones', 'Semáforo de ocupación por ubicación');
    const tw = 36, th = 26, tg = 3;
    const porFila = Math.floor((wC2 - 28 + tg) / (tw + tg));
    let yy = yC + 52;
    d.bodegas.forEach(b => {
        pdfResTexto(ctx, 'BODEGA ' + b.nombre, xC2 + 14, yy + 9, { peso: '600', tam: 9.5, color: '#6b7280' });
        yy += 15;
        b.ubicaciones.forEach((u, i) => {
            const col = i % porFila, fila = Math.floor(i / porFila);
            const tx = xC2 + 14 + col * (tw + tg), ty = yy + fila * (th + tg);
            const c = pdfResColorOcup(u.pct);
            const g = ctx.createLinearGradient(tx, ty, tx, ty + th);
            g.addColorStop(0, pdfResAclarar(c, 0.22));
            g.addColorStop(1, pdfResOscurecer(c, 0.06));
            ctx.save();
            ctx.shadowColor = 'rgba(15,23,42,0.18)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
            pdfResRR(ctx, tx, ty, tw, th, 4);
            ctx.fillStyle = g; ctx.fill();
            ctx.restore();
            pdfResTexto(ctx, u.id, tx + tw / 2, ty + 11.5, { peso: 'bold', tam: 9.5, color: '#ffffff', alinea: 'center' });
            pdfResTexto(ctx, u.pct + '%', tx + tw / 2, ty + 22, { tam: 8, color: 'rgba(255,255,255,0.95)', alinea: 'center' });
        });
        yy += Math.ceil(b.ubicaciones.length / porFila) * (th + tg) + 3;
    });
}

// ---------- Página 2: material crítico y principales PP ----------
function pdfResPagina2(ctx, d, logo) {
    const { W, M } = PDFRES;
    pdfResFondo(ctx);
    pdfResBanner(ctx, 'MATERIAL CRÍTICO Y PRINCIPALES PP', 'Control de Bodega PT. · Detalle por bodega', logo, d.fecha, 56);

    const gap = 12, yTop = 94;
    const wL = 712, hL = PDFRES.H - yTop - M;
    const xR = M + wL + gap, wR = W - 2 * M - wL - gap;

    // Izquierda: material crítico
    pdfResTarjeta(ctx, M, yTop, wL, hL, 'Material crítico', 'Toneladas por bodega');
    const claves = d.bodegas.map(b => b.clave);
    const bloques = d.criticas;
    const compBloque = bloques.map(bl => (typeof comprometidoParaBloque === 'function') ? comprometidoParaBloque(bl) : null);
    const filasDe = i => claves.length + 1 + (compBloque[i] ? 2 : 0);
    const disponible = hL - 68;
    const sumaAlturas = hF => bloques.reduce((s, bl, i) => s + 16 + 26 + filasDe(i) * hF, 0);
    let hFila = 17;
    while (hFila > 12 && sumaAlturas(hFila) + 8 * (bloques.length - 1) > disponible) hFila -= 0.5;
    const holgura = Math.min(28, Math.max(8, (disponible - sumaAlturas(hFila)) / Math.max(1, bloques.length - 1)));
    let yBloque = yTop + 50;
    bloques.forEach((bl, i) => {
        pdfResTablaCritica(ctx, M + 14, yBloque, wL - 28, bl, claves, d.bodegas, hFila, compBloque[i]);
        yBloque += 16 + 26 + filasDe(i) * hFila + holgura;
    });

    // Derecha arriba: top 10 PP
    const hTop = 408;
    pdfResTarjeta(ctx, xR, yTop, wR, hTop, 'Principales PP', 'Top 10 por tonelaje');
    d.topPP.forEach((p, i) => {
        const y0 = yTop + 50 + i * 35;
        ctx.fillStyle = i < 3 ? '#2b6cb0' : '#cbd5e0';
        ctx.beginPath(); ctx.arc(xR + 24, y0 + 12, 10, 0, 2 * Math.PI); ctx.fill();
        pdfResTexto(ctx, String(i + 1), xR + 24, y0 + 16, { peso: 'bold', tam: 10, color: i < 3 ? '#ffffff' : '#475569', alinea: 'center' });
        pdfResTexto(ctx, 'PP ' + p.pp, xR + 42, y0 + 10, { peso: 'bold', tam: 11, color: '#111827' });
        pdfResTexto(ctx, p.material, xR + 42, y0 + 23, { tam: 8.5, color: '#9ca3af', max: wR - 150 });
        pdfResTexto(ctx, pdfResTon(p.kg) + ' t', xR + wR - 14, y0 + 11, { peso: 'bold', tam: 11.5, color: '#111827', alinea: 'right' });
        const ubis = p.ubis.length > 3 ? p.ubis.slice(0, 3).join(', ') + ` +${p.ubis.length - 3}` : p.ubis.join(', ');
        pdfResTexto(ctx, ubis, xR + wR - 14, y0 + 23, { tam: 8.5, color: '#6b7280', alinea: 'right' });
    });

    // Derecha abajo: categorías
    const yCat = yTop + hTop + gap, hCat = PDFRES.H - M - yCat;
    pdfResTarjeta(ctx, xR, yCat, wR, hCat, 'Categorías de producto', 'Toneladas y participación');
    const cats = Object.keys(PDFRES.COLOR_CATEGORIA).map(c => ({ c, v: d.categoriasTotal[c] || 0 })).filter(x => x.v > 0);
    const totC = cats.reduce((s, x) => s + x.v, 0) || 1;
    const maxC = Math.max(1, ...cats.map(x => x.v));
    cats.forEach((x, i) => {
        const y0 = yCat + 52 + i * 38;
        pdfResTexto(ctx, x.c, xR + 14, y0 + 10, { peso: '600', tam: 9.5, color: '#374151' });
        pdfResTexto(ctx, `${pdfResNum(x.v / 1000, 1)} t · ${pdfResNum((x.v / totC) * 100, 1)}%`, xR + wR - 14, y0 + 10, { tam: 9, color: '#6b7280', alinea: 'right' });
        pdfResBarra(ctx, xR + 14, y0 + 15, wR - 28, 8, x.v / maxC, PDFRES.COLOR_CATEGORIA[x.c]);
    });
}

function pdfResTablaCritica(ctx, x, y, w, bloque, claves, bodegas, hFila, comp) {
    hFila = hFila || 17;
    const colsKeys = bloque.tipo === 'porPP' ? bloque.columnas : Object.keys(bloque.datos);
    const colsNombres = bloque.tipo === 'porPP' ? bloque.columnas : colsKeys.map(k => bloque.datos[k].nombre);
    const n = Math.max(1, colsKeys.length);
    const wPrim = 108, wTot = 58;
    const wCol = Math.min(150, (w - wPrim - wTot) / n);
    const hCab = 26;
    const tam = hFila < 15 ? 8.5 : 9;
    const base = (fy) => fy + hFila / 2 + 3.5;
    const anchoTabla = wPrim + wCol * n + wTot;

    const tituloTabla = bloque.titulo.trim().toUpperCase() === 'BODEGA' ? colsNombres.join(' · ') : bloque.titulo;
    pdfResTexto(ctx, tituloTabla, x, y + 10, { peso: 'bold', tam: 11, color: '#1e4e8c', max: w });
    const yc = y + 16;

    ctx.fillStyle = '#e8f0fb';
    pdfResRR(ctx, x, yc, anchoTabla, hCab, 4);
    ctx.fill();
    pdfResTexto(ctx, 'BODEGA', x + 8, yc + 16, { peso: 'bold', tam: 8, color: '#1e4e8c' });
    ctx.font = `bold 8px ${PDFRES.FUENTE}`;
    colsNombres.forEach((nom, i) => {
        const lineas = pdfResEnvolver(ctx, nom, wCol - 8, 2);
        lineas.forEach((l, j) => pdfResTexto(ctx, l, x + wPrim + wCol * i + wCol - 6, yc + (lineas.length > 1 ? 11 : 16) + j * 10, { peso: 'bold', tam: 8, color: '#1e4e8c', alinea: 'right' }));
    });
    pdfResTexto(ctx, 'TOTAL (t)', x + wPrim + wCol * n + wTot - 6, yc + 16, { peso: 'bold', tam: 8, color: '#1e4e8c', alinea: 'right' });

    const sumaCol = colsKeys.map(() => 0);
    claves.forEach((clave, fi) => {
        const fy = yc + hCab + fi * hFila;
        if (fi % 2 === 1) { ctx.fillStyle = '#f8fafc'; ctx.fillRect(x, fy, anchoTabla, hFila); }
        pdfResTexto(ctx, 'BODEGA ' + bodegas[fi].nombre, x + 8, base(fy), { tam: 8.5, color: '#2b6cb0', peso: '600' });
        let totalFila = 0;
        colsKeys.forEach((k, ci) => {
            const mt = (bloque.datos[k][clave] || 0) / 1000;
            totalFila += mt; sumaCol[ci] += mt;
            pdfResTexto(ctx, mt > 0 ? pdfResNum(mt, 1) : '–', x + wPrim + wCol * ci + wCol - 6, base(fy), { tam, color: mt > 0 ? '#1f2937' : '#cbd5e1', alinea: 'right' });
        });
        pdfResTexto(ctx, totalFila > 0 ? pdfResNum(totalFila, 1) : '–', x + wPrim + wCol * n + wTot - 6, base(fy), { peso: 'bold', tam, color: totalFila > 0 ? '#111827' : '#cbd5e1', alinea: 'right' });
    });

    const fyT = yc + hCab + claves.length * hFila;
    ctx.fillStyle = '#eef2f7';
    ctx.fillRect(x, fyT, anchoTabla, hFila);
    ctx.strokeStyle = '#cbd5e0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, fyT); ctx.lineTo(x + anchoTabla, fyT); ctx.stroke();
    pdfResTexto(ctx, 'TOTAL (t)', x + 8, base(fyT), { peso: 'bold', tam: 8.5, color: '#1f2937' });
    sumaCol.forEach((sc, ci) => pdfResTexto(ctx, sc > 0 ? pdfResNum(sc, 1) : '–', x + wPrim + wCol * ci + wCol - 6, base(fyT), { peso: 'bold', tam, color: sc > 0 ? '#111827' : '#cbd5e1', alinea: 'right' }));
    const granTotal = sumaCol.reduce((a, b) => a + b, 0);
    pdfResTexto(ctx, granTotal > 0 ? pdfResNum(granTotal, 1) : '–', x + wPrim + wCol * n + wTot - 6, base(fyT), { peso: 'bold', tam, color: granTotal > 0 ? '#111827' : '#cbd5e1', alinea: 'right' });

    // filas de material comprometido (órdenes de embarque)
    if (comp) {
        const fyC = fyT + hFila, fyN = fyT + 2 * hFila;
        ctx.fillStyle = '#fff5f5'; ctx.fillRect(x, fyC, anchoTabla, hFila);
        pdfResTexto(ctx, 'COMPROMETIDO (OE)', x + 8, base(fyC), { peso: 'bold', tam: 8, color: '#c53030' });
        comp.porColumna.forEach((v, ci) => {
            if (v === null) return;
            pdfResTexto(ctx, v > 0 ? '−' + pdfResNum(v, 1) : '–', x + wPrim + wCol * ci + wCol - 6, base(fyC), { tam, color: v > 0 ? '#c53030' : '#cbd5e1', alinea: 'right' });
        });
        pdfResTexto(ctx, '−' + pdfResNum(comp.total, 1), x + wPrim + wCol * n + wTot - 6, base(fyC), { peso: 'bold', tam, color: '#c53030', alinea: 'right' });

        ctx.fillStyle = '#f0fff4'; ctx.fillRect(x, fyN, anchoTabla, hFila);
        pdfResTexto(ctx, 'DISPONIBLE NETO', x + 8, base(fyN), { peso: 'bold', tam: 8, color: '#276749' });
        const celdaNeta = (v, cx) => {
            if (v < 0) { ctx.fillStyle = '#fed7d7'; ctx.fillRect(cx - 52, fyN + 1, 54, hFila - 2); }
            pdfResTexto(ctx, pdfResNum(v, 1), cx, base(fyN), { peso: 'bold', tam, color: v < 0 ? '#c53030' : '#276749', alinea: 'right' });
        };
        comp.netoColumna.forEach((v, ci) => {
            if (v === null) return;
            const cx = x + wPrim + wCol * ci + wCol - 6;
            if (comp.vacioColumna[ci]) pdfResTexto(ctx, '–', cx, base(fyN), { tam, color: '#cbd5e1', alinea: 'right' });
            else celdaNeta(v, cx);
        });
        celdaNeta(comp.neto, x + wPrim + wCol * n + wTot - 6);
    }
}

// ---------- Página 3: material comprometido y disponible ----------
function pdfResPagina3(ctx, d, logo) {
    const { W, M } = PDFRES;
    const c = d.comp;
    pdfResFondo(ctx);
    pdfResBanner(ctx, 'MATERIAL COMPROMETIDO Y DISPONIBLE', 'Control de Bodega PT. · Órdenes de embarque activas', logo, d.fecha, 56);

    const gap = 12, yK = 94, hK = 112;
    const wK = (W - 2 * M - 2 * gap) / 3;
    const kpis = [
        ['Stock físico', 'Todas las bodegas', c.totalFisico, '#111827', 'toneladas almacenadas'],
        ['Comprometido en OE', `${c.nOrdenes} ${c.nOrdenes === 1 ? 'orden de embarque activa' : 'órdenes de embarque activas'}`, c.totalComprometido, '#c53030', 'toneladas por embarcar'],
        ['Disponible neto', 'Stock una vez embarcado todo', c.totalDisponible, c.totalDisponible < 0 ? '#c53030' : '#276749', 'toneladas libres']
    ];
    kpis.forEach((k, i) => {
        const x = M + i * (wK + gap);
        pdfResTarjeta(ctx, x, yK, wK, hK, k[0], k[1]);
        pdfResTexto(ctx, pdfResNum(k[2], 1), x + wK / 2, yK + 84, { peso: '300', tam: 42, color: k[3], alinea: 'center' });
        pdfResTexto(ctx, k[4], x + wK / 2, yK + 102, { tam: 9.5, color: '#9ca3af', alinea: 'center' });
    });

    const yB = yK + hK + gap, hB = PDFRES.H - M - yB;
    const wL = 650, wR = W - 2 * M - wL - gap, xR = M + wL + gap;

    pdfResTarjeta(ctx, M, yB, wL, hB, 'Stock físico vs. comprometido por producto', 'Rojo: comprometido · Verde: disponible');
    const maxFilas = Math.floor((hB - 60) / 40);
    const filas = c.filas.slice(0, maxFilas);
    const maxFis = Math.max(1, ...filas.map(f => Math.max(f.fisico, 0)));
    filas.forEach((f, i) => {
        const y0 = yB + 54 + i * 40;
        pdfResTexto(ctx, f.nombre, M + 14, y0 + 12, { peso: '600', tam: 10.5, color: '#1f2937', max: 215 });
        pdfResTexto(ctx, `Físico ${pdfResNum(f.fisico, 1)} t · Comprometido ${pdfResNum(f.comprometido, 1)} t`, M + 14, y0 + 26, { tam: 8.5, color: '#9ca3af', max: 215 });

        const bx = M + 240, bw = 270, bh = 16, by = y0 + 5;
        ctx.fillStyle = '#e5e7eb'; pdfResRR(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
        const anchoFis = Math.max(0, bw * (f.fisico / maxFis));
        const anchoComp = Math.min(anchoFis, bw * (Math.min(f.comprometido, Math.max(f.fisico, 0)) / maxFis));
        if (anchoFis > 0) {
            ctx.save();
            pdfResRR(ctx, bx, by, anchoFis, bh, bh / 2); ctx.clip();
            const gV = ctx.createLinearGradient(0, by, 0, by + bh);
            gV.addColorStop(0, pdfResAclarar('#38a169', 0.28)); gV.addColorStop(0.5, '#38a169'); gV.addColorStop(1, pdfResOscurecer('#38a169', 0.1));
            ctx.fillStyle = gV; ctx.fillRect(bx, by, anchoFis, bh);
            const gR = ctx.createLinearGradient(0, by, 0, by + bh);
            gR.addColorStop(0, pdfResAclarar('#e53e3e', 0.28)); gR.addColorStop(0.5, '#e53e3e'); gR.addColorStop(1, pdfResOscurecer('#e53e3e', 0.1));
            ctx.fillStyle = gR; ctx.fillRect(bx, by, anchoComp, bh);
            ctx.restore();
        }
        const hayFalta = f.disponible < 0;
        pdfResTexto(ctx, pdfResNum(f.disponible, 1) + ' t', M + wL - 14, y0 + 14, { peso: 'bold', tam: 13, color: hayFalta ? '#c53030' : '#276749', alinea: 'right' });
        pdfResTexto(ctx, hayFalta ? 'FALTA MATERIAL' : 'disponible', M + wL - 14, y0 + 27, { peso: hayFalta ? 'bold' : 'normal', tam: 8.5, color: hayFalta ? '#c53030' : '#9ca3af', alinea: 'right' });
    });
    if (c.filas.length > filas.length) {
        pdfResTexto(ctx, `+ ${c.filas.length - filas.length} producto(s) más con órdenes activas`, M + 14, yB + hB - 12, { tam: 9, color: '#9ca3af' });
    }

    pdfResTarjeta(ctx, xR, yB, wR, hB, 'Órdenes de embarque activas', 'Número de OE, producto y tonelaje');
    const hFilaOE = 24;
    const maxOE = Math.floor((hB - 60 - 34) / hFilaOE);
    const lista = d.ordenes.slice(0, maxOE);
    lista.forEach((o, i) => {
        const y0 = yB + 52 + i * hFilaOE;
        if (i % 2 === 0) { ctx.fillStyle = '#f8fafc'; ctx.fillRect(xR + 10, y0, wR - 20, hFilaOE); }
        pdfResTexto(ctx, 'OE ' + o.oe, xR + 16, y0 + 16, { peso: 'bold', tam: 10.5, color: '#1e4e8c', max: 70 });
        pdfResTexto(ctx, o.nombre, xR + 92, y0 + 16, { tam: 9.5, color: '#374151', max: wR - 92 - 80 });
        pdfResTexto(ctx, pdfResNum(o.ton, 1) + ' t', xR + wR - 16, y0 + 16, { peso: 'bold', tam: 10.5, color: '#111827', alinea: 'right' });
    });
    const yPie = yB + hB - 32;
    ctx.strokeStyle = '#cbd5e0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xR + 14, yPie - 6); ctx.lineTo(xR + wR - 14, yPie - 6); ctx.stroke();
    const resto = d.ordenes.length - lista.length;
    pdfResTexto(ctx, resto > 0 ? `+ ${resto} orden(es) más` : 'Total comprometido', xR + 16, yPie + 12, { peso: '600', tam: 10, color: '#6b7280' });
    pdfResTexto(ctx, pdfResNum(c.totalComprometido, 1) + ' t', xR + wR - 16, yPie + 12, { peso: 'bold', tam: 12, color: '#c53030', alinea: 'right' });
}

// ---------- Exportar ----------
function pdfResCargarJsPDF() {
    return new Promise((resolve, reject) => {
        if (window.jspdf && window.jspdf.jsPDF) return resolve(window.jspdf.jsPDF);
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.onload = () => (window.jspdf && window.jspdf.jsPDF) ? resolve(window.jspdf.jsPDF) : reject(new Error('jsPDF no disponible'));
        s.onerror = () => reject(new Error('No se pudo descargar jsPDF'));
        document.head.appendChild(s);
    });
}

function pdfResCargarLogo() {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = 'logo.png';
    });
}

async function exportarResumenPDF() {
    try {
        if (typeof notificar === 'function') notificar('Generando resumen en PDF…', 'info');
        const [jsPDF, logo] = await Promise.all([pdfResCargarJsPDF(), pdfResCargarLogo()]);
        const d = pdfResRecopilarDatos();
        const k = PDFRES.ESCALA;

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const paginas = [pdfResPagina1, pdfResPagina2];
        if (d.comp && d.comp.nOrdenes > 0) paginas.push(pdfResPagina3);
        paginas.forEach((dibujar, i) => {
            const c = document.createElement('canvas');
            c.width = Math.round(PDFRES.W * k);
            c.height = Math.round(PDFRES.H * k);
            const ctx = c.getContext('2d');
            ctx.scale(k, k);
            dibujar(ctx, d, logo);
            if (i > 0) doc.addPage();
            doc.addImage(c.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 297, 210);
        });

        const p = n => String(n).padStart(2, '0');
        const a = d.ahora;
        doc.save(`Resumen_Bodega_${a.getFullYear()}-${p(a.getMonth() + 1)}-${p(a.getDate())}.pdf`);
        if (typeof notificar === 'function') notificar('✅ Resumen PDF generado', 'success');
    } catch (err) {
        console.error('Error generando el PDF:', err);
        if (typeof notificar === 'function') notificar('No se pudo generar el PDF. Revisa tu conexión e inténtalo de nuevo.', 'error');
    }
}
