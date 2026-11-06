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

// ---------- ESCRITORIO: mini gráfico con ambas bodegas ----------
function actualizarOcupacionAmbasBodegas() {
    const el = document.getElementById('mini-grafico');
    if (!el) return;

    const o = calcularOcupacionBodegas();
    const total = {
        b: o.principal.pB + o.principal.eB + o.adoquines.pB + o.adoquines.eB,
        c: o.principal.pC + o.principal.eC + o.adoquines.pC + o.adoquines.eC
    };

    function bloque(nombre, b, c, detalle) {
        const p = ocupPct(b, c);
        const col = ocupColor(p);
        return `
            <div style="margin-bottom: 8px; min-width: 230px;">
                <div style="display:flex; justify-content:space-between; font-weight:600; font-size:12px; color:#4a5568;">
                    <span>${nombre}</span>
                    <span style="color:${col};">${Math.round(b)}/${c} · ${p}% ${ocupEmoji(p)}</span>
                </div>
                <div style="height:10px; background:#edf2f7; border-radius:20px; overflow:hidden; margin:3px 0;">
                    <div style="width:${Math.min(p, 100)}%; height:100%; background:${col}; border-radius:20px;"></div>
                </div>
                ${detalle ? `<div style="font-size:11px; color:#718096;">${detalle}</div>` : ''}
            </div>`;
    }

    const p = o.principal, a = o.adoquines;
    el.innerHTML =
        bloque('PRINCIPAL', p.pB + p.eB, p.pC + p.eC,
            `Pasillos ${ocupPct(p.pB, p.pC)}% · Patio ${ocupPct(p.eB, p.eC)}%`) +
        bloque('ADOQUINES', a.pB + a.eB, a.pC + a.eC,
            `Sectores ${ocupPct(a.pB, a.pC)}% · Galpón ${ocupPct(a.eB, a.eC)}%`) +
        bloque('TOTAL GENERAL', total.b, total.c, '');
}

// ---------- MÓVIL: ventana de detalle con ambas bodegas ----------
// Reemplaza a la función del mismo nombre que está en app.js
window.abrirSemaforoMovil = function() {
    if (window.innerWidth > 768) return;
    const contenedor = document.getElementById('contenido-semaforo-clonado');
    if (!contenedor) return;

    const o = calcularOcupacionBodegas();

    function filaBarra(etiqueta, b, c) {
        const p = ocupPct(b, c);
        const col = ocupColor(p);
        return `
            <div style="margin-bottom: 12px; font-family: sans-serif;">
                <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:bold; margin-bottom:5px; color:#2d3748;">
                    <span>${etiqueta}</span>
                    <span style="color:${col};">${Math.round(b)} / ${c} &nbsp;|&nbsp; ${p}%</span>
                </div>
                <div style="background:#edf2f7; width:100%; height:14px; border-radius:7px; overflow:hidden;">
                    <div class="barra-ocup-movil" data-pct="${Math.min(p, 100)}" style="background:${col}; width:0%; height:100%; transition: width 2s cubic-bezier(0.1, 1, 0.1, 1);"></div>
                </div>
            </div>`;
    }

    function seccion(titulo, d, n1, n2) {
        return `
            <div style="font-size:12px; font-weight:bold; color:#2b6cb0; border-bottom:1px solid #edf2f7; padding-bottom:4px; margin:14px 0 10px;">${titulo}</div>
            ${filaBarra('OCUPACIÓN TOTAL', d.pB + d.eB, d.pC + d.eC)}
            ${filaBarra(n1, d.pB, d.pC)}
            ${filaBarra(n2, d.eB, d.eC)}`;
    }

    const p = o.principal, a = o.adoquines;
    contenedor.innerHTML =
        filaBarra('TOTAL GENERAL', p.pB + p.eB + a.pB + a.eB, p.pC + p.eC + a.pC + a.eC) +
        seccion('BODEGA PRINCIPAL', p, 'PASILLOS', 'PATIO') +
        seccion('BODEGA ADOQUINES', a, 'SECTORES', 'GALPÓN');

    document.getElementById('modal-semaforo-movil').style.display = 'flex';

    setTimeout(() => {
        document.querySelectorAll('.barra-ocup-movil').forEach(el => {
            el.style.width = el.dataset.pct + '%';
        });
    }, 10);
};