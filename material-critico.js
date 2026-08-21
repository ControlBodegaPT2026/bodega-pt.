// ====================================================================
// ⚠️ INFORME DE MATERIAL CRÍTICO
// Depende de variables globales definidas en app.js: db, maestroProductos, layoutPrin, layoutAdo
// ====================================================================

const CONFIG_MATERIAL_CRITICO = [
    { titulo: "SACOS CHINOS GI", desglosarPorPP: true, codigos: ["PTAB030315"] },
    { titulo: "SACAS 1200 KG GI", desglosarPorPP: true, codigos: ["PTAB031110"] },
    { titulo: "BODEGA", desglosarPorPP: false, columnas: [
        { nombre: "SACAS 1100 KGS RECHAZO GRANULAR", codigo: "PTAB941010" },
        { nombre: "SACAS 1100 KGS RECHAZO POLVO",    codigo: "PTAB101010" }
    ]},
    { titulo: "BODEGA", desglosarPorPP: false, columnas: [
        { nombre: "SACAS 1100 KGS ULEXITA", codigo: "PTUL321001" }
    ]},
    { titulo: "BODEGA", desglosarPorPP: false, columnas: [
        { nombre: "GRANULEX 1000 KG.",     codigo: "PTGR210601" },
        { nombre: "GRANULEX 2000 LB.",     codigo: "PTGR211401" },
        { nombre: "GRANULEX SACO 50 LB.",  codigo: "PTGR210501" }
    ]}
];

// Referencia a la configuración editable del informe personalizado
const configInformeRef = firebase.database().ref('config_informe_personalizado');
let configInformePersonalizado = [];

// Escucha en tiempo real: si editas la configuración, se actualiza sola
configInformeRef.on('value', (snap) => {
    configInformePersonalizado = snap.val() || [];
});

function calcularInforme(config) {
    let idsPrincipal = new Set();
    let idsAdoquines = new Set();
    layoutPrin.forEach(item => { if (Array.isArray(item)) idsPrincipal.add(item[0]); });
    layoutAdo.forEach(item => { if (Array.isArray(item)) idsAdoquines.add(item[0]); });

        return config.map(bloque => {
        if (bloque.desglosarPorPP) {
            let listaPP = Object.keys(maestroProductos)
                .filter(pp => bloque.codigos.includes(maestroProductos[pp].codigo))
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

            let porPP = {};
            listaPP.forEach(pp => porPP[pp] = { principal: 0, adoquines: 0 });

            for (let locId in db) {
                for (let pp in db[locId]) {
                    if (porPP[pp]) {
                        let kg = db[locId][pp].kg || 0;
                        if (idsPrincipal.has(locId)) porPP[pp].principal += kg;
                        else if (idsAdoquines.has(locId)) porPP[pp].adoquines += kg;
                    }
                }
            }

            // 🆕 Filtrar las PP que no tienen stock en ninguna bodega
            listaPP = listaPP.filter(pp => (porPP[pp].principal + porPP[pp].adoquines) > 0);

            return { titulo: bloque.titulo, tipo: "porPP", columnas: listaPP, datos: porPP };

        } else {
            let porColumna = {};
            bloque.columnas.forEach(col => porColumna[col.codigo] = { nombre: col.nombre, principal: 0, adoquines: 0 });

            for (let locId in db) {
                for (let pp in db[locId]) {
                    let codigoPP = maestroProductos[pp] ? maestroProductos[pp].codigo : null;
                    if (codigoPP && porColumna[codigoPP]) {
                        let kg = db[locId][pp].kg || 0;
                        if (idsPrincipal.has(locId)) porColumna[codigoPP].principal += kg;
                        else if (idsAdoquines.has(locId)) porColumna[codigoPP].adoquines += kg;
                    }
                }
            }
            return { titulo: bloque.titulo, tipo: "porCodigo", datos: porColumna };
        }
    });
}

function calcularMaterialCritico() {
    return calcularInforme(CONFIG_MATERIAL_CRITICO);
}

function calcularInformePersonalizado() {
    return calcularInforme(configInformePersonalizado);
}

function renderTablaMaterialCritico(bloque) {
    let tabla = `<div style="margin-bottom: 25px; border: 1px solid #cbd5e0; border-radius: 6px; overflow-x: auto; -webkit-overflow-scrolling: touch;">
    <table style="width: 100%; min-width: 480px; border-collapse: collapse; font-size: 13px;">
            <thead>
                <tr style="background: #e2e8f0;">
                    <th style="padding: 8px; text-align: center; border: 1px solid #cbd5e0; white-space: nowrap;">${bloque.titulo}</th>`;
                    
    let nombresColumnas = bloque.tipo === "porPP"
        ? bloque.columnas
        : Object.values(bloque.datos).map(c => c.nombre);

    nombresColumnas.forEach(nombre => {
        
        tabla += `<th style="padding: 8px; text-align: center; border: 1px solid #cbd5e0; white-space: nowrap;">${nombre}</th>`;
    });
    tabla += `<th style="padding: 8px; text-align: center; border: 1px solid #cbd5e0;">TOTAL (MT)</th></tr></thead><tbody>`;

    let claves = bloque.tipo === "porPP" ? bloque.columnas : Object.keys(bloque.datos);
    let totalPrincipal = 0, totalAdoquines = 0;
    let totalPorColumna = claves.map(() => 0);

    ["principal", "adoquines"].forEach((bodegaKey, filaIdx) => {
        let etiqueta = bodegaKey === "principal" ? "BODEGA PRINCIPAL" : "BODEGA ADOQUINES";
        tabla += `<tr><td style="padding: 6px 8px; color: #2b6cb0; font-weight: bold; border: 1px solid #cbd5e0;">${etiqueta}</td>`;

        let totalFila = 0;
        claves.forEach((clave, i) => {
            let kg = bloque.datos[clave][bodegaKey] || 0;
            let mt = kg / 1000;
            totalFila += mt;
            totalPorColumna[i] += mt;
            tabla += `<td style="padding: 6px 8px; text-align: right; border: 1px solid #cbd5e0;">${fmt(mt)}</td>`;
        });
        tabla += `<td style="padding: 6px 8px; text-align: right; font-weight: bold; border: 1px solid #cbd5e0;">${fmt(totalFila)}</td></tr>`;

        if (bodegaKey === "principal") totalPrincipal = totalFila; else totalAdoquines = totalFila;
    });

    tabla += `<tr style="background: #f7fafc; font-weight: bold;"><td style="padding: 6px 8px; border: 1px solid #cbd5e0;">TOTAL (MT)</td>`;
    totalPorColumna.forEach(t => {
        tabla += `<td style="padding: 6px 8px; text-align: right; border: 1px solid #cbd5e0;">${fmt(t)}</td>`;
    });
    tabla += `<td style="padding: 6px 8px; text-align: right; border: 1px solid #cbd5e0;">${fmt(totalPrincipal + totalAdoquines)}</td></tr>`;

    tabla += `</tbody></table></div>`;
    return tabla;
}

function abrirModalMaterialCritico() {
    let modal = document.getElementById('modal-material-critico');
    let contenedor = document.getElementById('contenedor-material-critico');
    if (!modal || !contenedor) return;

    let bloques = calcularMaterialCritico();
    contenedor.innerHTML = bloques.map(renderTablaMaterialCritico).join('');
    modal.style.display = 'flex';
}

function cerrarModalMaterialCritico() {
    let modal = document.getElementById('modal-material-critico');
    if (modal) modal.style.display = 'none';
}

function abrirModalInformePersonalizado() {
    let modal = document.getElementById('modal-informe-personalizado');
    let contenedor = document.getElementById('contenedor-informe-personalizado');
    if (!modal || !contenedor) return;

    if (configInformePersonalizado.length === 0) {
        contenedor.innerHTML = "<p style='text-align:center; color:#718096;'>Aún no has configurado ningún bloque para este informe.</p>";
    } else {
        let bloques = calcularInformePersonalizado();
        contenedor.innerHTML = bloques.map(renderTablaMaterialCritico).join('');
    }
    modal.style.display = 'flex';
}

function cerrarModalInformePersonalizado() {
    document.getElementById('modal-informe-personalizado').style.display = 'none';
}

function obtenerCodigosUnicos() {
    let mapa = {};
    Object.keys(maestroProductos).forEach(pp => {
        let item = maestroProductos[pp];
        if (item.codigo && !mapa[item.codigo]) {
            mapa[item.codigo] = item.nombre || '';
        }
    });
    return Object.keys(mapa)
        .sort()
        .map(codigo => ({ codigo, nombre: mapa[codigo] }));
}

let borradorConfigInforme = [];

function abrirModalConfigInforme() {
    // Trabajamos sobre una copia, así los cambios no se guardan en Firebase hasta que le des "Guardar"
    borradorConfigInforme = JSON.parse(JSON.stringify(configInformePersonalizado || []));
    renderListaBloquesConfig();
    document.getElementById('modal-config-informe').style.display = 'flex';
}

function cerrarModalConfigInforme() {
    document.getElementById('modal-config-informe').style.display = 'none';
}

function renderListaBloquesConfig() {
    let contenedor = document.getElementById('lista-bloques-config');
    if (!contenedor) return;

    if (borradorConfigInforme.length === 0) {
        contenedor.innerHTML = "<p style='text-align:center; color:#718096; padding: 10px;'>No hay bloques todavía. Usa \"+ Agregar Bloque\" para crear el primero.</p>";
        return;
    }

    contenedor.innerHTML = borradorConfigInforme.map((bloque, i) => {
        let resumen = bloque.desglosarPorPP
            ? `Desglosado por PP · Códigos: ${bloque.codigos.join(', ')}`
            : `Agrupado por código · ${bloque.columnas.map(c => c.nombre).join(', ')}`;

        return `
            <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <div>
                    <div style="font-weight: bold; color: #2d3748; font-size: 13px;">${bloque.titulo}</div>
                    <div style="font-size: 11px; color: #718096; margin-top: 2px;">${resumen}</div>
                </div>
                <div style="display: flex; gap: 4px; flex-shrink: 0;">
                    <button onclick="moverBloqueConfig(${i}, -1)" title="Subir" style="background:#e2e8f0; border:none; width:26px; height:26px; border-radius:4px; cursor:pointer;">↑</button>
                    <button onclick="moverBloqueConfig(${i}, 1)" title="Bajar" style="background:#e2e8f0; border:none; width:26px; height:26px; border-radius:4px; cursor:pointer;">↓</button>
                    <button onclick="editarBloqueConfig(${i})" title="Editar" style="background:#3182ce; color:white; border:none; width:26px; height:26px; border-radius:4px; cursor:pointer;">✏️</button>
                    <button onclick="eliminarBloqueConfig(${i})" title="Eliminar" style="background:#e53e3e; color:white; border:none; width:26px; height:26px; border-radius:4px; cursor:pointer;">🗑️</button>
                </div>
            </div>`;
    }).join('');
}

function moverBloqueConfig(indice, direccion) {
    let nuevoIndice = indice + direccion;
    if (nuevoIndice < 0 || nuevoIndice >= borradorConfigInforme.length) return;
    [borradorConfigInforme[indice], borradorConfigInforme[nuevoIndice]] = [borradorConfigInforme[nuevoIndice], borradorConfigInforme[indice]];
    renderListaBloquesConfig();
}

function eliminarBloqueConfig(indice) {
    if (confirm(`¿Eliminar el bloque "${borradorConfigInforme[indice].titulo}"?`)) {
        borradorConfigInforme.splice(indice, 1);
        renderListaBloquesConfig();
    }
}

let indiceEdicionBloque = null;
let columnasFormulario = [];

function abrirFormularioBloque(indice = null) {
    indiceEdicionBloque = indice;
    let bloque = indice !== null ? borradorConfigInforme[indice] : null;

    document.getElementById('input-titulo-bloque').value = bloque ? bloque.titulo : '';
    document.getElementById('select-tipo-bloque').value = bloque ? (bloque.desglosarPorPP ? 'porPP' : 'porCodigo') : 'porPP';

    columnasFormulario = (bloque && !bloque.desglosarPorPP) ? bloque.columnas.map(c => ({ ...c })) : [];

    renderCamposFormularioBloque();

    // Si es edición y es tipo "porPP", marcamos los checkboxes ya seleccionados
    if (bloque && bloque.desglosarPorPP) {
        setTimeout(() => {
            document.querySelectorAll('.chk-codigo-bloque').forEach(chk => {
                chk.checked = bloque.codigos.includes(chk.value);
            });
        }, 0);
    }

    document.getElementById('modal-formulario-bloque').style.display = 'flex';
}

function editarBloqueConfig(indice) {
    abrirFormularioBloque(indice);
}

function cerrarFormularioBloque() {
    document.getElementById('modal-formulario-bloque').style.display = 'none';
}

function cambiarTipoFormularioBloque() {
    renderCamposFormularioBloque();
}

function renderCamposFormularioBloque() {
    let tipo = document.getElementById('select-tipo-bloque').value;
    let contenedor = document.getElementById('campos-especificos-bloque');
    let codigos = obtenerCodigosUnicos();

    if (tipo === 'porPP') {
        contenedor.innerHTML = `
            <label style="display:block; font-size:12px; font-weight:bold; color:#4a5568; margin-bottom:6px;">Selecciona los códigos (se desglosará por cada PP encontrada):</label>
            <div style="max-height:180px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:6px; padding:8px;">
                ${codigos.map(c => `
                    <label style="display:flex; align-items:center; gap:6px; padding:4px 0; font-size:12px; cursor:pointer;">
                        <input type="checkbox" value="${c.codigo}" class="chk-codigo-bloque">
                        <span><b>${c.codigo}</b> — ${c.nombre}</span>
                    </label>
                `).join('')}
            </div>`;
    } else {
        contenedor.innerHTML = `
            <label style="display:block; font-size:12px; font-weight:bold; color:#4a5568; margin-bottom:6px;">Columnas del bloque:</label>
            <div id="lista-columnas-form"></div>
            <button type="button" onclick="agregarColumnaFormulario()" style="margin-top:6px; background:#e2e8f0; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:12px;">+ Agregar columna</button>`;
        renderColumnasFormulario();
    }
}

function renderColumnasFormulario() {
    let contenedor = document.getElementById('lista-columnas-form');
    if (!contenedor) return;
    let codigos = obtenerCodigosUnicos();

    contenedor.innerHTML = columnasFormulario.map((col, i) => `
        <div style="display:flex; gap:6px; margin-bottom:6px; align-items:center;">
            <input type="text" placeholder="Nombre a mostrar" value="${col.nombre || ''}" oninput="columnasFormulario[${i}].nombre = this.value" style="flex:1; padding:6px; border:1px solid #cbd5e0; border-radius:4px; font-size:12px;">
            <select onchange="columnasFormulario[${i}].codigo = this.value" style="flex:1; padding:6px; border:1px solid #cbd5e0; border-radius:4px; font-size:12px;">
                <option value="">Selecciona código...</option>
                ${codigos.map(c => `<option value="${c.codigo}" ${col.codigo === c.codigo ? 'selected' : ''}>${c.codigo} — ${c.nombre}</option>`).join('')}
            </select>
            <button type="button" onclick="eliminarColumnaFormulario(${i})" style="background:#e53e3e; color:white; border:none; width:26px; height:26px; border-radius:4px; cursor:pointer;">🗑️</button>
        </div>`).join('');
}

function agregarColumnaFormulario() {
    columnasFormulario.push({ nombre: '', codigo: '' });
    renderColumnasFormulario();
}

function eliminarColumnaFormulario(i) {
    columnasFormulario.splice(i, 1);
    renderColumnasFormulario();
}

function guardarBloqueDesdeFormulario() {
    let titulo = document.getElementById('input-titulo-bloque').value.trim();
    let tipo = document.getElementById('select-tipo-bloque').value;

    if (!titulo) { alert('Ingresa un título para el bloque.'); return; }

    let nuevoBloque;
    if (tipo === 'porPP') {
        let seleccionados = Array.from(document.querySelectorAll('.chk-codigo-bloque:checked')).map(chk => chk.value);
        if (seleccionados.length === 0) { alert('Selecciona al menos un código.'); return; }
        nuevoBloque = { titulo, desglosarPorPP: true, codigos: seleccionados };
    } else {
        let columnasValidas = columnasFormulario.filter(c => c.nombre.trim() && c.codigo);
        if (columnasValidas.length === 0) { alert('Agrega al menos una columna con nombre y código.'); return; }
        nuevoBloque = { titulo, desglosarPorPP: false, columnas: columnasValidas };
    }

    if (indiceEdicionBloque !== null) {
        borradorConfigInforme[indiceEdicionBloque] = nuevoBloque;
    } else {
        borradorConfigInforme.push(nuevoBloque);
    }

    cerrarFormularioBloque();
    renderListaBloquesConfig();
}

function guardarConfigInforme() {
    if (!firebase.auth().currentUser) {
        alert("Debes iniciar sesión como administrador para guardar cambios.");
        return;
    }

    configInformeRef.set(borradorConfigInforme)
        .then(() => {
            alert("✅ Configuración guardada correctamente.");
            cerrarModalConfigInforme();
        })
        .catch((error) => {
            console.error("Error guardando configuración:", error);
            alert("❌ Ocurrió un error al guardar. Intenta de nuevo.");
        });
}

function abrirVentanaImpresionInforme(bloques, tituloInforme) {
    if (!bloques || bloques.length === 0) {
        alert("No hay datos para imprimir.");
        return;
    }

    const ventanaImpresion = window.open('', '_blank');
    const fechaHoy = new Date().toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const contenidoTablas = bloques.map(renderTablaMaterialCritico).join('');

    ventanaImpresion.document.write(`
        <html>
        <head>
            <title>${tituloInforme}</title>
            <style>
                body { font-family: sans-serif; color: #2d3748; padding: 30px; margin: 0; }
                .header { border-bottom: 3px solid #2b6cb0; padding-bottom: 12px; margin-bottom: 20px; }
                .title { font-size: 22px; font-weight: bold; color: #2d3748; }
                .date { font-size: 12px; color: #718096; margin-top: 5px; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">${tituloInforme}</div>
                <div class="date">Fecha de impresión: ${fechaHoy}</div>
            </div>
            ${contenidoTablas}
        </body>
        </html>
    `);

    ventanaImpresion.document.close();
    ventanaImpresion.focus();

    setTimeout(() => {
        ventanaImpresion.print();
        ventanaImpresion.close();
    }, 250);
}

function imprimirMaterialCritico() {
    abrirVentanaImpresionInforme(calcularMaterialCritico(), "⚠️ Informe de Material Crítico");
}

function imprimirInformePersonalizado() {
    if (configInformePersonalizado.length === 0) {
        alert("No hay bloques configurados en el informe personalizado.");
        return;
    }
    abrirVentanaImpresionInforme(calcularInformePersonalizado(), "📊 Informe Personalizado");
}


