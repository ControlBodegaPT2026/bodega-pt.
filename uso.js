// ====================================================================
// 📈 CONTADOR DE USO DEL SISTEMA (propio, en Firebase)
// - Registra aperturas, dispositivos distintos y consultas, sin datos personales.
// - La ventana "Uso del sistema" es solo para el administrador (no aparece en el PDF).
// Depende de app.js: firebase (auth y database), render
// Opcional: abrirModalMapa (mapa.js) y abrirModalGraficos (graficos.js) para contar su uso
// ====================================================================

const USO = {
    MINUTOS_ENTRE_VISITAS: 20,   // si el mismo equipo recarga antes de este tiempo, no cuenta otra apertura
    CLAVE_DISPOSITIVO: 'bodega_dispositivo_id',
    CLAVE_ULTIMA_VISITA: 'bodega_ultima_visita',
    CLAVE_DIA_DISPOSITIVO: 'bodega_dia_dispositivo'
};

let usoRol = 'op';           // 'op' = operador, 'ad' = administrador
let usoPeriodo = 30;         // días que muestra la ventana

// ---------- Utilidades ----------
function usoDia(fecha = new Date()) {
    const p = n => String(n).padStart(2, '0');
    return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}`;
}

function usoDispositivoId() {
    try {
        let id = localStorage.getItem(USO.CLAVE_DISPOSITIVO);
        if (!id) {
            const bytes = new Uint8Array(10);
            (window.crypto || window.msCrypto).getRandomValues(bytes);
            id = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
            localStorage.setItem(USO.CLAVE_DISPOSITIVO, id);
        }
        return id;
    } catch (e) {
        return null;           // sin almacenamiento disponible: no se registra el dispositivo
    }
}

function usoTipoEquipo() {
    const movil = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (window.screen && window.screen.width <= 600);
    return movil ? 'mo' : 'pc';
}

function usoCalcularRol(usuario) {
    const porUrl = new URLSearchParams(window.location.search).get('acceso') === 'panel';
    return (usuario || porUrl) ? 'ad' : 'op';
}

// ---------- Registro ----------
function usoSumarUno(ruta) {
    try {
        const r = firebase.database().ref(ruta).transaction(v => (v || 0) + 1);
        if (r && typeof r.catch === 'function') r.catch(e => console.warn('Contador de uso:', e && e.message));
    } catch (e) {
        console.warn('Contador de uso:', e && e.message);
    }
}

function usoContar(tipo) {
    usoSumarUno(`uso/${usoDia()}/c/${tipo}_${usoRol}`);
}

function usoRegistrarVisita() {
    try {
        const ahora = Date.now();
        const ultima = parseInt(localStorage.getItem(USO.CLAVE_ULTIMA_VISITA) || '0', 10);
        const dia = usoDia();

        // Dispositivo distinto del día (una sola vez por día y equipo)
        const id = usoDispositivoId();
        if (id && localStorage.getItem(USO.CLAVE_DIA_DISPOSITIVO) !== dia) {
            const r = firebase.database().ref(`uso/${dia}/d/${id}`).set(usoRol);
            if (r && typeof r.then === 'function') {
                r.then(() => localStorage.setItem(USO.CLAVE_DIA_DISPOSITIVO, dia)).catch(e => console.warn('Contador de uso:', e && e.message));
            }
        }

        // Apertura (se ignoran las recargas seguidas)
        if (ahora - ultima < USO.MINUTOS_ENTRE_VISITAS * 60 * 1000) return;
        localStorage.setItem(USO.CLAVE_ULTIMA_VISITA, String(ahora));
        const hora = String(new Date().getHours()).padStart(2, '0');
        usoSumarUno(`uso/${dia}/v/${hora}-${usoRol}-${usoTipoEquipo()}`);
    } catch (e) {
        console.warn('Contador de uso:', e && e.message);
    }
}

// Se espera a conocer la sesión (administrador u operador) antes de contar
(function () {
    let primera = true;
    firebase.auth().onAuthStateChanged((usuario) => {
        usoRol = usoCalcularRol(usuario);
        if (primera) {
            primera = false;
            usoRegistrarVisita();
        }
    });
})();

// Consultas: búsquedas completas de PP, detalle de ubicaciones, mapa y gráficos
document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'busqueda' && String(e.target.value).length === 8) usoContar('busqueda');
}, true);

document.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.closest && (t.closest('.card-ubi') || t.closest('#tabla-stock tbody tr'))) usoContar('detalle');
}, true);

['abrirModalMapa', 'abrirModalGraficos'].forEach(nombre => {
    const original = window[nombre];
    if (typeof original !== 'function') return;
    const tipo = nombre === 'abrirModalMapa' ? 'mapa' : 'graficos';
    window[nombre] = function () { usoContar(tipo); return original.apply(this, arguments); };
});

// ====================================================================
// Ventana "Uso del sistema" (solo administrador)
// ====================================================================

function usoProcesar(raw, dias) {
    const hoy = new Date();
    const fechas = [];
    for (let i = dias - 1; i >= 0; i--) fechas.push(usoDia(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i)));

    const horas = Array(24).fill(0);
    const equipo = { mo: 0, pc: 0 };
    const consultas = { busqueda: 0, detalle: 0, mapa: 0, graficos: 0 };
    const unicos = new Set();
    let aperturasOp = 0, aperturasAd = 0, consultasOp = 0, diasConUso = 0;

    const porDia = fechas.map(dia => {
        const d = raw[dia] || {};
        let op = 0, ad = 0, cons = 0;
        for (const clave in (d.v || {})) {
            const m = /^(\d\d)-(op|ad)-(mo|pc)$/.exec(clave);
            if (!m) continue;
            const n = Number(d.v[clave]) || 0;
            if (m[2] === 'op') { op += n; horas[+m[1]] += n; equipo[m[3]] += n; } else ad += n;
        }
        let disp = 0;
        for (const id in (d.d || {})) {
            if (d.d[id] === 'op') { disp++; unicos.add(id); }
        }
        for (const clave in (d.c || {})) {
            const m = /^(busqueda|detalle|mapa|graficos)_(op|ad)$/.exec(clave);
            if (!m || m[2] !== 'op') continue;
            const n = Number(d.c[clave]) || 0;
            cons += n; consultas[m[1]] += n;
        }
        aperturasOp += op; aperturasAd += ad; consultasOp += cons;
        if (op + ad + disp + cons > 0) diasConUso++;
        return { dia, op, ad, disp, cons };
    });

    return { fechas, porDia, horas, equipo, consultas, dispositivosUnicos: unicos.size, aperturasOp, aperturasAd, consultasOp, diasConUso };
}

const usoNum = (n) => new Intl.NumberFormat('de-DE').format(n);
const usoFechaCorta = (d) => d.split('-').reverse().join('-');

function usoColumnas(valores, color, etiqueta, alto) {
    const max = Math.max(1, ...valores);
    return `<div style="display: flex; align-items: flex-end; gap: 2px; height: ${alto}px; border-bottom: 1px solid #e2e8f0;">
        ${valores.map((v, i) => `<div title="${etiqueta(i)}: ${usoNum(v)}" style="flex: 1; min-width: 2px; height: ${v > 0 ? Math.max(3, (v / max) * 100) : 0}%; background: ${color}; border-radius: 2px 2px 0 0;"></div>`).join('')}
    </div>`;
}

function usoBarras(items, color) {
    const max = Math.max(1, ...items.map(i => i.valor));
    const total = items.reduce((s, i) => s + i.valor, 0) || 1;
    return items.map(i => `
        <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #4a5568;">
                <span>${i.nombre}</span><span><b>${usoNum(i.valor)}</b> <span style="color: #a0aec0;">· ${Math.round(i.valor / total * 100)}%</span></span>
            </div>
            <div style="height: 8px; background: #edf2f7; border-radius: 4px; overflow: hidden;">
                <div style="width: ${(i.valor / max) * 100}%; height: 100%; background: ${i.color || color}; border-radius: 4px;"></div>
            </div>
        </div>`).join('');
}

function usoAsegurarModal() {
    if (document.getElementById('modal-uso')) return;
    const estilo = document.createElement('style');
    estilo.textContent = `@media (max-width: 600px) { #modal-uso > div { width: 100% !important; max-width: 100% !important; } }`;
    document.head.appendChild(estilo);

    const modal = document.createElement('div');
    modal.id = 'modal-uso';
    modal.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10003; justify-content: center; align-items: flex-start; padding-top: 40px; box-sizing: border-box;';
    modal.innerHTML = `
        <div style="background: white; padding: 18px; border-radius: 10px; max-width: 820px; width: 95%; max-height: 88vh; overflow-y: auto; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <h3 style="margin: 0; color: #2d3748;">📈 Uso del sistema</h3>
                <button onclick="cerrarModalUso()" style="background: #e53e3e; color: white; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-weight: bold;">✕</button>
            </div>
            <div id="uso-desde" style="font-size: 12px; color: #718096; margin-bottom: 10px;"></div>
            <div id="uso-botones" style="display: flex; gap: 6px; margin-bottom: 12px;"></div>
            <div id="uso-contenido"><div style="text-align: center; color: #a0aec0; padding: 30px;">Cargando…</div></div>
        </div>`;
    document.body.appendChild(modal);
}

function abrirModalUso() {
    usoAsegurarModal();
    document.getElementById('modal-uso').style.display = 'flex';
    usoCargar();
}

function cerrarModalUso() {
    const m = document.getElementById('modal-uso');
    if (m) m.style.display = 'none';
}

function usoCambiarPeriodo(dias) {
    usoPeriodo = dias;
    usoCargar();
}

let usoDatosRaw = {};

function usoCargar() {
    const contenido = document.getElementById('uso-contenido');
    contenido.innerHTML = '<div style="text-align: center; color: #a0aec0; padding: 30px;">Cargando…</div>';
    firebase.database().ref('uso').orderByKey().limitToLast(120).once('value')
        .then(snap => { usoDatosRaw = snap.val() || {}; usoRender(); })
        .catch(err => {
            console.error('Uso del sistema:', err);
            contenido.innerHTML = '<div style="text-align: center; color: #c53030; padding: 30px;">No se pudieron leer los datos. Revisa la conexión.</div>';
        });
}

function usoRender() {
    const r = usoProcesar(usoDatosRaw, usoPeriodo);
    const claves = Object.keys(usoDatosRaw).sort();

    document.getElementById('uso-desde').textContent = claves.length
        ? `Registrando desde el ${usoFechaCorta(claves[0])} · sin datos personales (solo un identificador anónimo por equipo)`
        : 'Todavía no hay datos registrados.';

    document.getElementById('uso-botones').innerHTML = [7, 30, 90].map(d => `
        <button onclick="usoCambiarPeriodo(${d})" style="padding: 6px 14px; border-radius: 16px; cursor: pointer; font-size: 12px; font-weight: bold; border: 1px solid ${usoPeriodo === d ? '#2b6cb0' : '#cbd5e0'}; background: ${usoPeriodo === d ? '#2b6cb0' : '#fff'}; color: ${usoPeriodo === d ? '#fff' : '#4a5568'};">${d} días</button>`).join('') +
        `<button onclick="usoExportarExcel()" style="margin-left: auto; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; border: none; background: #38a169; color: #fff;">📥 Exportar Excel</button>`;

    if (claves.length === 0) {
        document.getElementById('uso-contenido').innerHTML = '<div style="text-align: center; color: #a0aec0; padding: 30px;">Los datos comenzarán a aparecer cuando los operadores abran el sistema.</div>';
        return;
    }

    const tarjeta = (titulo, valor, sub, color = '#2d3748') => `
        <div style="flex: 1 1 150px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; background: #fff;">
            <div style="font-size: 10px; color: #718096; font-weight: bold; text-transform: uppercase;">${titulo}</div>
            <div style="font-size: 26px; font-weight: bold; color: ${color};">${valor}</div>
            <div style="font-size: 11px; color: #a0aec0;">${sub}</div>
        </div>`;
    const promedio = (n) => usoNum(Math.round((n / usoPeriodo) * 10) / 10);
    const seccion = (titulo, cuerpo) => `<div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 12px;">
        <div style="font-size: 13px; font-weight: bold; color: #2d3748; margin-bottom: 8px;">${titulo}</div>${cuerpo}</div>`;

    const tot = r.equipo.mo + r.equipo.pc;
    const nombres = { busqueda: 'Búsquedas de PP', detalle: 'Detalle de ubicaciones y materiales', mapa: 'Mapa de ocupación', graficos: 'Gráficos' };

    document.getElementById('uso-contenido').innerHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${tarjeta('Aperturas (operadores)', usoNum(r.aperturasOp), `${promedio(r.aperturasOp)} por día · +${usoNum(r.aperturasAd)} del administrador`, '#2b6cb0')}
            ${tarjeta('Equipos distintos', usoNum(r.dispositivosUnicos), 'operadores que usaron el sistema', '#276749')}
            ${tarjeta('Consultas realizadas', usoNum(r.consultasOp), `${promedio(r.consultasOp)} por día`, '#805ad5')}
            ${tarjeta('Días con uso', `${r.diasConUso}`, `de ${usoPeriodo} días (${Math.round(r.diasConUso / usoPeriodo * 100)}%)`)}
        </div>
        ${seccion('Aperturas por día', usoColumnas(r.porDia.map(d => d.op), '#2b6cb0', i => usoFechaCorta(r.porDia[i].dia), 70) +
            `<div style="display: flex; justify-content: space-between; font-size: 10px; color: #a0aec0; margin-top: 3px;"><span>${usoFechaCorta(r.fechas[0])}</span><span>${usoFechaCorta(r.fechas[r.fechas.length - 1])}</span></div>`)}
        ${seccion('Equipos distintos por día', usoColumnas(r.porDia.map(d => d.disp), '#38a169', i => usoFechaCorta(r.porDia[i].dia), 56))}
        ${seccion('Horario de uso (aperturas por hora)', usoColumnas(r.horas, '#dd6b20', i => String(i).padStart(2, '0') + ':00 h', 56) +
            `<div style="display: flex; justify-content: space-between; font-size: 10px; color: #a0aec0; margin-top: 3px;"><span>00 h</span><span>06 h</span><span>12 h</span><span>18 h</span><span>23 h</span></div>`)}
        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
            <div style="flex: 1 1 280px;">${seccion('Qué consultan', usoBarras(Object.keys(nombres).map(k => ({ nombre: nombres[k], valor: r.consultas[k] })), '#805ad5'))}</div>
            <div style="flex: 1 1 280px;">${seccion('Tipo de equipo', tot === 0 ? '<div style="color:#a0aec0; font-size:12px;">Sin datos.</div>' : usoBarras([{ nombre: '📱 Celular', valor: r.equipo.mo, color: '#3182ce' }, { nombre: '🖥️ Computador', valor: r.equipo.pc, color: '#718096' }]))}</div>
        </div>
        <details style="margin-top: 12px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px;">
            <summary style="cursor: pointer; font-weight: bold; font-size: 13px; color: #4a5568;">Detalle por día</summary>
            <div style="max-height: 260px; overflow-y: auto; margin-top: 8px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead><tr style="text-align: right; color: #718096; font-size: 10px; text-transform: uppercase;">
                        <th style="text-align: left; padding: 5px;">Fecha</th><th style="padding: 5px;">Aperturas</th><th style="padding: 5px;">Equipos</th><th style="padding: 5px;">Consultas</th></tr></thead>
                    <tbody>${r.porDia.slice().reverse().map(d => `<tr style="text-align: right; border-top: 1px solid #edf2f7;">
                        <td style="text-align: left; padding: 5px;">${usoFechaCorta(d.dia)}</td><td style="padding: 5px;">${usoNum(d.op)}</td><td style="padding: 5px;">${usoNum(d.disp)}</td><td style="padding: 5px;">${usoNum(d.cons)}</td></tr>`).join('')}</tbody>
                </table>
            </div>
        </details>
        <div style="font-size: 11px; color: #a0aec0; margin-top: 10px;">Una apertura es una entrada al sistema (las recargas seguidas del mismo equipo, en menos de ${USO.MINUTOS_ENTRE_VISITAS} minutos, no se cuentan). Las cifras de operadores excluyen al administrador.</div>`;
}

function usoExportarExcel() {
    if (typeof XLSX === 'undefined') { alert('La librería de Excel no está disponible en este momento.'); return; }
    const r = usoProcesar(usoDatosRaw, usoPeriodo);
    const filas = r.porDia.map(d => ({
        'Fecha': usoFechaCorta(d.dia),
        'Aperturas (operadores)': d.op,
        'Aperturas (administrador)': d.ad,
        'Equipos distintos (operadores)': d.disp,
        'Consultas (operadores)': d.cons
    }));
    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Uso por día');
    XLSX.writeFile(libro, `Uso_del_sistema_${usoDia()}.xlsx`);
}
