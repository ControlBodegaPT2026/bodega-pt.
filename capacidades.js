// ====================================================================
// 📏 CAPACIDADES EDITABLES POR UBICACIÓN
// Depende de variables de app.js: BODEGAS (layoutPrin, layoutAdo, layoutArg), db, render()
// ====================================================================

const capacidadesRef = firebase.database().ref('config_capacidades');
const capacidadesPorDefecto = {};

Object.values(BODEGAS).flatMap(b => b.layout).forEach(item => {
    if (Array.isArray(item)) capacidadesPorDefecto[item[0]] = item[1];
});

function aplicarCapacidades(overrides) {
    Object.values(BODEGAS).flatMap(b => b.layout).forEach(item => {
        if (!Array.isArray(item)) return;
        let id = item[0];
        item[1] = (overrides && overrides[id] !== undefined) ? overrides[id] : capacidadesPorDefecto[id];
    });
}

// Si la configuración cambia en Firebase, se actualiza sola para todos
capacidadesRef.on('value', (snap) => {
    aplicarCapacidades(snap.val() || {});
    if (typeof render === 'function') render();
});

function abrirModalCapacidades() {
    let contenedor = document.getElementById('contenedor-capacidades');
    if (!contenedor) return;

    let html = '';
    Object.keys(BODEGAS).map(clave => ({ titulo: 'BODEGA ' + BODEGAS[clave].nombre, layout: BODEGAS[clave].layout })).forEach(bloque => {
        html += `<h4 style="margin: 15px 0 5px 0; color: #2b6cb0;">${bloque.titulo}</h4>`;
        bloque.layout.forEach(item => {
            if (!Array.isArray(item)) {
                html += `<div style="font-size: 11px; font-weight: bold; color: #718096; margin: 10px 0 4px 0;">${item}</div>`;
                return;
            }
            let [id, cap] = item;
            let usados = 0;
            if (db[id]) for (let pp in db[id]) usados += db[id][pp].bultos || 0;

            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; border-bottom: 1px solid #edf2f7;">
                    <div><b>${id}</b> <span style="font-size: 11px; color: #718096;">(ocupado: ${Math.round(usados)} bultos)</span></div>
                    <input type="number" min="0" step="1" value="${cap}" class="input-capacidad" data-id="${id}" data-usados="${usados}"
                        style="width: 90px; padding: 6px; border: 1px solid #cbd5e0; border-radius: 6px; text-align: right;">
                </div>`;
        });
    });

    contenedor.innerHTML = html;
    document.getElementById('modal-capacidades').style.display = 'flex';
}

function cerrarModalCapacidades() {
    document.getElementById('modal-capacidades').style.display = 'none';
}

function restaurarCapacidadesOriginales() {
    document.querySelectorAll('.input-capacidad').forEach(inp => {
        inp.value = capacidadesPorDefecto[inp.dataset.id];
    });
}

function guardarCapacidades() {
    if (!firebase.auth().currentUser) {
        alert("Debes iniciar sesión como administrador para guardar cambios.");
        return;
    }

    let overrides = {};
    let advertencias = [];

    for (const inp of document.querySelectorAll('.input-capacidad')) {
        let id = inp.dataset.id;
        let valor = parseInt(inp.value, 10);
        let usados = parseFloat(inp.dataset.usados) || 0;

        if (isNaN(valor) || valor < 0) {
            alert(`La capacidad de ${id} no es válida.`);
            return;
        }
        if (valor < usados) advertencias.push(`${id}: capacidad ${valor}, ocupación actual ${Math.round(usados)}`);
        if (valor !== capacidadesPorDefecto[id]) overrides[id] = valor;
    }

    if (advertencias.length > 0) {
        let seguir = confirm("Estas ubicaciones quedarían con menos capacidad que su ocupación actual:\n\n" + advertencias.join("\n") + "\n\n¿Guardar de todos modos?");
        if (!seguir) return;
    }

    capacidadesRef.set(Object.keys(overrides).length > 0 ? overrides : null)
        .then(() => {
            alert("✅ Capacidades guardadas correctamente.");
            cerrarModalCapacidades();
        })
        .catch((error) => {
            console.error("Error guardando capacidades:", error);
            alert("❌ Ocurrió un error al guardar. Intenta de nuevo.");
        });
}