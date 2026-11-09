// ====================================================================
// 📊 OCUPACIÓN DE AMBAS BODEGAS A LA VEZ
// Depende de app.js: db, layoutPrin, layoutAdo, EXCEPCIONES
// ====================================================================

function calcularOcupacionBodegas() {
    const resultado = {
        principal: { pB: 0, pC: 0, eB: 0, eC: 0 },
        adoquines: { pB: 0, pC: 0, eB: 0, eC: 0 }
    };

    function acumular(layout, destino, esExterior) {
        layout.forEach(item => {
            if (!Array.isArray(item)) return;
            const [id, cap] = item;
            let usados = 0;
            if (db[id]) for (let pp in db[id]) usados += db[id][pp].bultos || 0;
            if (esExterior(id)) { destino.eB += usados; destino.eC += cap; }
            else { destino.pB += usados; destino.pC += cap; }
        });
    }

    acumular(layoutPrin, resultado.principal, id => id.startsWith('C') || EXCEPCIONES.includes(id));
    acumular(layoutAdo, resultado.adoquines, id => id.startsWith('E') && !EXCEPCIONES.includes(id));
    return resultado;
}

function ocupPct(b, c) { return c > 0 ? Math.round((b / c) * 100) : 0; }
function ocupColor(p) { return p > 90 ? '#e53e3e' : (p > 70 ? '#d69e2e' : '#38a169'); }
function ocupEmoji(p) { return p > 90 ? '🔴' : (p > 70 ? '🟡' : '🟢'); }
function colorearInsigniasOcupacion() {
    const fondos = { verde: '#e6fffa', amarillo: '#fffee6', rojo: '#fed7d7' };

    ['pct-total', 'pct-p', 'pct-ext'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const pct = parseInt(el.innerText, 10) || 0;
        el.style.background = pct > 90 ? fondos.rojo : (pct > 70 ? fondos.amarillo : fondos.verde);
    });
}
// ---------- ESCRITORIO: mini gráfico con ambas bodegas ----------
function actualizarOcupacionAmbasBodegas() {
    colorearInsigniasOcupacion();

    const el = document.getElementById('mini-grafico');
    if (!el) return;

    const o = calcularOcupacionBodegas();
    const p = o.principal, a = o.adoquines;

    function tarjeta(titulo, b, c, detalle, activa) {
        const pct = ocupPct(b, c);
        const col = ocupColor(pct);
        const borde = activa ? '1px solid #2b6cb0' : '1px solid #e2e8f0';
const fondo = activa ? '#f5faff' : '#ffffff';
        return `
            <div style="border:${borde}; background:${fondo}; border-radius:10px; padding:12px 16px;">
                <div style="font-size:13px; color:#4a5568; font-weight:600;">
                    ${titulo}${activa ? ' <span style="font-size:11px; color:#2b6cb0; font-weight:normal;">(en pantalla)</span>' : ''}
                </div>
                <div style="display:flex; align-items:center; justify-content:space-between; margin:4px 0 8px;">
                    <span style="font-size:22px; font-weight:bold; color:#2d3748;">${Math.round(b)} <span style="font-size:15px; color:#718096; font-weight:600;">/ ${c}</span></span>
                    <span style="display:inline-flex; align-items:center; gap:6px; background:${col}1a; padding:2px 10px; border-radius:12px; font-size:18px; font-weight:bold; color:${col};">
                        ${pct}% <span style="width:12px; height:12px; border-radius:50%; background:${col}; display:inline-block;"></span>
                    </span>
                </div>
                <div style="height:10px; background:#edf2f7; border-radius:20px; overflow:hidden;">
                    <div style="width:${Math.min(pct, 100)}%; height:100%; background:${col}; border-radius:20px;"></div>
                </div>
                <div style="display:flex; gap:18px; margin-top:8px; font-size:12px; color:#718096;">${detalle}</div>
            </div>`;
    }

    function dato(nombre, b, c) {
        const pct = ocupPct(b, c);
        return `<span>${nombre} <b style="color:${ocupColor(pct)};">${pct}%</b> <span style="color:#a0aec0;">(${Math.round(b)}/${c})</span></span>`;
    }

    const totalB = p.pB + p.eB + a.pB + a.eB;
    const totalC = p.pC + p.eC + a.pC + a.eC;

    el.style.lineHeight = '1.3';
    el.innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px;">
            
            ${tarjeta('BODEGA PRINCIPAL', p.pB + p.eB, p.pC + p.eC,
                dato('Pasillos', p.pB, p.pC) + dato('Patio', p.eB, p.eC), bodegaActual === 'principal')}
            ${tarjeta('BODEGA ADOQUINES', a.pB + a.eB, a.pC + a.eC,
                dato('Sectores', a.pB, a.pC) + dato('Galpón', a.eB, a.eC), bodegaActual === 'adoquines')}
${tarjeta('TOTAL GENERAL', totalB, totalC,
                `<span>Disponibles <b style="color:#4a5568;">${Math.round(totalC - totalB)}</b> bultos</span>`, false)}
        </div>`;
}

// ---------- MÓVIL: ventana de detalle con ambas bodegas ----------
// Reemplaza a la función del mismo nombre que está en app.js
window.abrirSemaforoMovil = function() {
    if (window.innerWidth > 768) return;
    const contenedor = document.getElementById('contenido-semaforo-clonado');
    if (!contenedor) return;

    const o = calcularOcupacionBodegas();

    function filaBarra(etiqueta, b, c, detalle) {
        const p = ocupPct(b, c);
        const col = ocupColor(p);
        return `
            <div style="margin-bottom: 18px; font-family: sans-serif;">
                <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:bold; margin-bottom:5px; color:#2d3748;">
                    <span>${etiqueta}</span>
                    <span style="color:${col};">${Math.round(b)} / ${c} &nbsp;|&nbsp; ${p}%</span>
                </div>
                <div style="background:#edf2f7; width:100%; height:14px; border-radius:7px; overflow:hidden;">
                    <div class="barra-ocup-movil" data-pct="${Math.min(p, 100)}" style="background:${col}; width:0%; height:100%; transition: width 2s cubic-bezier(0.1, 1, 0.1, 1);"></div>
                </div>
                ${detalle ? `<div style="display:flex; gap:16px; margin-top:6px; font-size:12px; color:#718096;">${detalle}</div>` : ''}
            </div>`;
    }

    function dato(nombre, b, c) {
        const p = ocupPct(b, c);
        return `<span>${nombre} <b style="color:${ocupColor(p)};">${p}%</b></span>`;
    }

    const p = o.principal, a = o.adoquines;
    const separador = `<div style="border-top: 2px solid #cbd5e0; margin: 8px 0 24px;"></div>`;

    contenedor.innerHTML =
        filaBarra('TOTAL GENERAL', p.pB + p.eB + a.pB + a.eB, p.pC + p.eC + a.pC + a.eC) +
        separador +
        filaBarra('BODEGA PRINCIPAL', p.pB + p.eB, p.pC + p.eC,
            dato('Pasillos', p.pB, p.pC) + dato('Patio', p.eB, p.eC)) +
        filaBarra('BODEGA ADOQUINES', a.pB + a.eB, a.pC + a.eC,
            dato('Sectores', a.pB, a.pC) + dato('Galpón', a.eB, a.eC));

    document.getElementById('modal-semaforo-movil').style.display = 'flex';

    setTimeout(() => {
        document.querySelectorAll('.barra-ocup-movil').forEach(el => {
            el.style.width = el.dataset.pct + '%';
        });
    }, 10);
};