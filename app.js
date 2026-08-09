// ====================================================================
// 🔍 1. CONTROLADORES DE INTERFAZ E INTERACTIVOS
// ====================================================================

/**
 * Borra el contenido del buscador principal, devuelve el foco al input
 * y refresca el listado de elementos en pantalla.
 */
function limpiarBuscador() {
    const inputBusq = document.getElementById('busqueda');
    if (inputBusq) {
        inputBusq.value = ""; 
        if (typeof buscar === 'function') buscar();            
        inputBusq.focus();   
    }
}

// ====================================================================
// 🎙️ 2. SISTEMA NATIVO DE VOZ (COMPATIBLE E INTEGRAL)
// ====================================================================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let reconocimientoVoz = null;
let estaEscuchando = false;
let fuePorVoz = false; 

if (SpeechRecognition) {
    reconocimientoVoz = new SpeechRecognition();
    reconocimientoVoz.lang = 'es-ES'; 
    reconocimientoVoz.continuous = false; 
    reconocimientoVoz.interimResults = false;

    // Se ejecuta al activar la escucha (Modo visual activo)
    reconocimientoVoz.onstart = () => {
        estaEscuchando = true;
        fuePorVoz = true; 
        
        const btnMic = document.getElementById('btnMicrofono');
        if (btnMic) {
            btnMic.style.background = "#ffe3e3"; 
            btnMic.style.color = "#e53e3e";      
            btnMic.innerHTML = "<i class='bx bx-microphone-off'></i>"; 
        }

        const campoInput = document.getElementById('input-mensaje-chat');
        if (campoInput) campoInput.placeholder = "Escuchando... habla ahora";
    };

    // Manejo robusto de errores de permisos y hardware de audio
    reconocimientoVoz.onerror = (event) => {
        console.error("Error en reconocimiento de voz:", event.error);
        estaEscuchando = false; 

        if (event.error === 'not-allowed') {
            if (typeof notificar === 'function') {
                notificar("Permiso de micrófono denegado. Actívalo en los ajustes de tu navegador.", "error");
            } else {
                alert("Permiso de micrófono denegado.");
            }
        } else if (event.error === 'no-speech') {
            console.log("No se detectó voz (silencio).");
        } else {
            if (typeof notificar === 'function') {
                notificar("Error de audio: " + event.error, "warning");
            }
        }
        
        try { reconocimientoVoz.stop(); } catch(e) { console.warn(e); }
    };

    // Se ejecuta al finalizar la escucha (Retorno al estado neutro)
    reconocimientoVoz.onend = () => {
        estaEscuchando = false;
        
        const btnMic = document.getElementById('btnMicrofono');
        if (btnMic) {
            btnMic.style.background = "#f0f2f5"; 
            btnMic.style.color = "#54656f";      
            btnMic.innerHTML = "<i class='bx bx-microphone'></i>"; 
        }

        const campoInput = document.getElementById('input-mensaje-chat');
        if (campoInput) campoInput.placeholder = "Escribe tu consulta aquí o habla...";
    };

    // Procesamiento del texto interpretado por el micrófono
    reconocimientoVoz.onresult = (event) => {
        if (!event.results || event.results.length === 0) return;
        
        const textoEscuchado = event.results[0][0].transcript;
        const campoInput = document.getElementById('input-mensaje-chat');
        if (campoInput) {
            campoInput.value = textoEscuchado;
            
            const btnEnviar = document.getElementById('btn-enviar-chat') || document.querySelector('[onclick*="enviar"]');
            if (btnEnviar) {
                btnEnviar.click();
            } else {
                const eventoEnter = new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, bubbles: true });
                campoInput.dispatchEvent(eventoEnter);
            }
        }
    };
}

/**
 * Alterna el estado del micrófono. Incluye optimizaciones para despertar 
 * de forma nativa la síntesis de voz en entornos iOS (Safari).
 */
function alternarMicrofono() {
    if (!reconocimientoVoz) {
        alert("Tu navegador o celular no soporta el reconocimiento de voz integrado.");
        return;
    }
    
    // Despierta canales de audio en iOS mediante interacción física
    if (window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(u);
    }

    if (estaEscuchando) {
        reconocimientoVoz.stop();
        return; 
    }

    const campoInput = document.getElementById('input-mensaje-chat');
    if (campoInput) campoInput.value = "";
    
    try {
        reconocimientoVoz.continuous = false;
        reconocimientoVoz.abort(); 
        setTimeout(() => {
            reconocimientoVoz.start();
        }, 50);
    } catch (e) {
        console.warn("Reintento de inicio controlado:", e);
    }
}

/**
 * Convierte un texto a voz sintetizada, limpiando caracteres especiales de Markdown.
 * @param {string} textoAI - El texto que el asistente leerá en voz alta.
 */
function asistenteHablar(textoAI) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 

        let textoLimpio = textoAI
            .replace(/\*\*/g, '') 
            .replace(/📍/g, 'Ubicación ')
            .replace(/➔/g, ' contiene ')
            .replace(/•/g, ' ')
            .replace(/<br>/g, ' ')
            .replace(/[📊🔍]/g, '');

        const configuracionLectura = new SpeechSynthesisUtterance(textoLimpio);
        configuracionLectura.lang = 'es-ES';
        configuracionLectura.rate = 1.1; 
        configuracionLectura.pitch = 1.0; 

        window.speechSynthesis.speak(configuracionLectura);
    }
}

// ====================================================================
// ☁️ 3. CONFIGURACIÓN Y SINCRONIZACIÓN DE FIREBASE
// ====================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBbOwLETmyMK18eMewiQ3oy7AZA-P3zECU",
    authDomain: "bodega-pt.firebaseapp.com",
    databaseURL: "https://bodega-pt-default-rtdb.firebaseio.com",
    projectId: "bodega-pt",
    storageBucket: "bodega-pt.firebasestorage.app",
    messagingSenderId: "758347970477",
    appId: "1:758347970477:web:b7449710b36ad126499324",
    measurementId: "G-CWEKBMBG1K"
};

// Inicialización de la Base de Datos Firebase
firebase.initializeApp(firebaseConfig);
const dbRef = firebase.database().ref('bodega_pt');
const maestroRef = firebase.database().ref('maestro_productos');

// Escuchador en tiempo real para las tareas diarias
dbRef.child('tareas_del_dia').on('value', (snapshot) => {
    const tarea = snapshot.val();
    const modalOp = document.getElementById('modal-tarea-operador');
    const txtPantalla = document.getElementById('texto-tarea-pantalla');
    const txtAdminActiva = document.getElementById('txt-admin-activa');
    const areaAdminActiva = document.getElementById('area-tarea-activa');

    if (tarea && tarea.trim() !== "") {
        if (txtPantalla) txtPantalla.innerText = tarea;
        if (modalOp) modalOp.style.display = 'flex';
        
        if (txtAdminActiva) txtAdminActiva.innerText = tarea;
        if (areaAdminActiva) areaAdminActiva.style.display = 'block';
    } else {
        if (modalOp) modalOp.style.display = 'none';
        if (areaAdminActiva) areaAdminActiva.style.display = 'none';
    }
});

// Escuchador en tiempo real para cambios en el inventario principal
dbRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        db = data.inventario || {};
        logs = data.historial || [];
        if (typeof render === 'function') render();
        verificarAcceso();
    }
});

// Escuchador en tiempo real para sincronizar el maestro global de productos
maestroRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        maestroProductos = data; 
        if (typeof render === 'function') render(); 
    }
});

// ====================================================================
// 🔐 4. CONTROL DE ACCESOS Y ROLES (ADMIN / OPERADOR)
// ====================================================================
function verificarAcceso() {
    const urlParams = new URLSearchParams(window.location.search);
    const rol = urlParams.get('rol');

    const contenedorGrid = document.querySelector('.top-grid');
    const tarjetaIngreso = document.getElementById('tarjeta-ingreso');
    const tarjetaSalida = document.getElementById('tarjeta-salida');
    const panelHistorial = document.getElementById('panel-historial-contenedor');
    const menuOpciones = document.querySelectorAll('.menu-opciones');
    const btnMov = document.getElementById('btn-movimiento-interno');
    const btnTareaMenu = document.getElementById('btn-tarea-admin-menu'); 

    if (rol === 'admin') {
        if (contenedorGrid) contenedorGrid.style.setProperty('display', 'grid', 'important');
        if (tarjetaIngreso) tarjetaIngreso.style.setProperty('display', 'block', 'important');
        if (tarjetaSalida) tarjetaSalida.style.setProperty('display', 'block', 'important');
        if (panelHistorial) panelHistorial.style.setProperty('display', 'block', 'important');
        
        menuOpciones.forEach(el => el.style.setProperty('display', 'block', 'important'));
        
        if (btnMov) btnMov.style.setProperty('display', 'flex', 'important'); 
        if (btnTareaMenu) btnTareaMenu.style.setProperty('display', 'flex', 'important');
        console.log("Acceso: ADMINISTRADOR");
    } else {
        // Modo Operador: Oculta selectivamente funcionalidades críticas
        if (contenedorGrid) {
            contenedorGrid.style.setProperty('display', 'grid', 'important');
            contenedorGrid.style.setProperty('grid-template-columns', '1fr 1fr', 'important');
        }
        if (tarjetaIngreso) tarjetaIngreso.style.setProperty('display', 'none', 'important');
        if (tarjetaSalida) tarjetaSalida.style.setProperty('display', 'none', 'important');
        if (panelHistorial) panelHistorial.style.setProperty('display', 'none', 'important');
        
        menuOpciones.forEach(el => el.style.setProperty('display', 'none', 'important'));
        
        if (btnMov) btnMov.style.setProperty('display', 'none', 'important'); 
        if (btnTareaMenu) btnTareaMenu.style.setProperty('display', 'none', 'important'); 
        
        document.querySelectorAll('.btn-nav').forEach(btn => {
            const texto = btn.innerText.toUpperCase();
            if (!texto.includes('PRINCIPAL') && !texto.includes('ADOQUINES')) {
                btn.style.display = 'none';
            }
        });
        console.log("Acceso: OPERADOR (Con Buscador y Stock PP)");
    }
}

// ====================================================================
// 📋 5. ADMINISTRACIÓN DE TAREAS DIARIAS
// ====================================================================
function abrirConfigTareaAdmin() {
    const inputTarea = document.getElementById('txt-nueva-tarea');
    const modalTarea = document.getElementById('modal-admin-tarea');
    if (inputTarea) inputTarea.value = '';
    if (modalTarea) modalTarea.style.display = 'flex';
}

function guardarTareaAdmin() {
    const inputTarea = document.getElementById('txt-nueva-tarea');
    if (!inputTarea) return;

    const texto = inputTarea.value.trim();
    if (!texto) {
        alert("Por favor, escribe una instrucción antes de guardar.");
        return;
    }

    dbRef.child('tareas_del_dia').set(texto)
        .then(() => {
            alert("🚀 Instrucción publicada con éxito en todas las pantallas.");
            const modalTarea = document.getElementById('modal-admin-tarea');
            if (modalTarea) modalTarea.style.display = 'none';
        })
        .catch(err => console.error("Error guardando tarea:", err));
}

function completarTareaAdmin() {
    if (confirm("¿Estás seguro de marcar esta tarea como Completada? Se borrará de las pantallas de todos los operadores.")) {
        dbRef.child('tareas_del_dia').set(null)
            .then(() => {
                alert("✅ Tarea finalizada. Pantallas despejadas.");
                const modalTarea = document.getElementById('modal-admin-tarea');
                if (modalTarea) modalTarea.style.display = 'none';
            })
            .catch(err => console.error("Error borrando tarea:", err));
    }
}

// ====================================================================
// 📦 6. VARIABLES GLOBALES DE DISEÑO DE ALMACÉN
// ====================================================================
const pesosValidos = [1350, 1100, 1200, 1000, 1088.6, 907.2, 1224.72, 875];
let bultoSeleccionado = {
    ingreso: null,
    salida: null
};

const layoutPrin = [
    "PASILLO 1", 
    ["A4", 160], ["A3", 160], ["A2", 155], ["A1", 91], 
    ["A8", 115], ["A7", 115], ["A6", 155], ["A5", 140], 
    
    "PASILLO 2", 
    ["B4", 115], ["B3", 120], ["B2", 155], ["B1", 140], 
    ["B8", 200], ["B7", 160], ["B6", 160], ["B5", 115],    
    "PATIO", 
    ["C2", 350], ["C4", 350], ["C1", 350], ["C3", 350],

    "EXCEPCIÓN",
    ["EX-01", 250]
];

const layoutAdo = [
    "SECTORES",
    ["D1", 350], ["D2", 350], ["D3", 350], ["D4", 350], ["D5", 350], ["D6", 350], 
    ["D7", 300],

    "GALPÓN",
    ["E1", 80], ["E2", 80], ["E3", 250], ["E4", 250],

    "EXCEPCIÓN",
    ["EX-02", 250]
];

// Estructura de datos interna en memoria
let maestroProductos = {};
let bodegaActual = "principal";
let db = {};
let logs = [];

// ====================================================================
// 🔄 7. GESTIÓN Y TRASPASO DE BODEGAS
// ====================================================================
function cambiarBodega(tipo) {
    if (bodegaActual === tipo) return; 

    bodegaActual = tipo;
    
    const btnPrin = document.getElementById('btnPrin');
    const btnAdo = document.getElementById('btnAdo');
    if (btnPrin) btnPrin.classList.toggle('active', tipo === 'principal');
    if (btnAdo) btnAdo.classList.toggle('active', tipo === 'adoquines');
    
    const inputBusq = document.getElementById('busqueda');
    if (inputBusq) inputBusq.value = ""; 
    if (typeof buscar === 'function') buscar();

    bultoSeleccionado.ingreso = null;
    bultoSeleccionado.salida = null;
    if (typeof bultoSeleccionadoMovimiento !== 'undefined') {
        bultoSeleccionadoMovimiento = null;
    }

    if (typeof renderBultos === 'function') {
        renderBultos();
    }

    const selectIngreso = document.getElementById('bultos_ingreso');
    const selectSalida = document.getElementById('bultos_salida');
    const selectMovimiento = document.getElementById('mov_bulto'); 

    if (selectIngreso) selectIngreso.selectedIndex = 0;
    if (selectSalida) selectSalida.selectedIndex = 0;
    if (selectMovimiento) selectMovimiento.selectedIndex = 0;

    if (typeof render === 'function') render();
}

// ====================================================================
// ⚡ 8. PROCESO DE REGISTRO E INGRESO (ACCIÓN)
// ====================================================================
function accion(tipo) {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('rol') !== 'admin') {
        const pass = prompt("Introduce la clave de autorización para modificar stock:");
        if (pass !== "Qb2049Qb") { 
            alert("Clave incorrecta. No tienes permiso para esta acción.");
            return;
        }
    }

    const ppInput = document.getElementById(tipo === 'ingreso' ? 'pp_in' : 'pp_out');
    if (!ppInput) return;

    const pp = ppInput.value.trim();
    const kgInput = document.getElementById(tipo === 'ingreso' ? 'kg_in' : 'kg_out');
    const kg = kgInput ? parseFloat(kgInput.value) : NaN;
    const ubiInput = document.getElementById(tipo === 'ingreso' ? 'ubi_in' : 'ubi_out');
    const ubi = ubiInput ? ubiInput.value : '';

    if (!ubi || ubi === "") {
        if (typeof notificar === 'function') notificar("Por favor, seleccione una ubicación válida", "warning");
        return;
    }

    const formatoPP = /^\d{2}-\d{2}-\d{2}$/;
    if (!formatoPP.test(pp)) {
        if (typeof notificar === 'function') notificar("Formato de PP incorrecto (00-00-00)", "error");
        ppInput.focus();
        return;
    }

    if (!pp || isNaN(kg) || kg <= 0) {
        if (typeof notificar === 'function') notificar("Datos incompletos", "error");
        return;
    }

    // Modal interactivo para PP nuevo de material inexistente
    if (tipo === 'ingreso' && pp && !maestroProductos[pp]) {
        const txtAviso = document.getElementById('txt-pp-nuevo-aviso');
        if (txtAviso) txtAviso.innerText = `PP [${pp}] es nueva. Asigne el producto correspondiente:`;
        
        const productosUnicos = {};
        for (let clave in maestroProductos) {
            const prod = maestroProductos[clave];
            if (prod.codigo && prod.nombre) {
                productosUnicos[prod.codigo] = prod.nombre;
            }
        }

        const selProducto = document.getElementById('sel-maestro-producto');
        if (selProducto) {
            selProducto.innerHTML = '<option value="">Seleccione Código Contable</option>';

            for (let cod in productosUnicos) {
                selProducto.innerHTML += `<option value="${cod}|${productosUnicos[cod]}">[${cod}] ${productosUnicos[cod]}</option>`;
            }
            selProducto.innerHTML += '<option value="OTRO">✏️ REGISTRAR UN NUEVO MATERIAL TOTALMENTE DESCONOCIDO</option>';
        }

        const modalMaestro = document.getElementById('modal-nuevo-maestro');
        if (modalMaestro) modalMaestro.style.display = 'flex';

        // Manejador Cancelar
        const btnCancelar = document.getElementById('btn-cancelar-maestro');
        if (btnCancelar) {
            btnCancelar.onclick = function() {
                if (modalMaestro) modalMaestro.style.display = 'none';
                if (typeof notificar === 'function') notificar("Ingreso cancelado por el administrador", "warning");
            };
        }

        // Manejador Guardar
        const btnGuardar = document.getElementById('btn-guardar-maestro');
        if (btnGuardar) {
            btnGuardar.onclick = function() {
                if (!selProducto) return;
                const seleccion = selProducto.value;

                if (!seleccion) {
                    alert("Por favor, seleccione una opción válida de la lista.");
                    return;
                }

                let finalCodigo = "";
                let finalNombre = "";

                if (seleccion === "OTRO") {
                    finalNombre = prompt("Escriba el NUEVO Nombre Comercial:").toUpperCase().trim();
                    if (!finalNombre) return;

                    finalCodigo = prompt("Escriba el NUEVO Código Contable:").toUpperCase().trim();
                    if (!finalCodigo) return;
                } else {
                    const partes = seleccion.split('|');
                    finalCodigo = partes[0];
                    finalNombre = partes[1];
                }

                maestroProductos[pp] = { 
                    codigo: finalCodigo, 
                    nombre: finalNombre 
                };
                localStorage.setItem('bodega_maestro', JSON.stringify(maestroProductos));
                
                if (typeof firebase !== 'undefined' && firebase.database) {
                    firebase.database().ref('maestro_productos').set(maestroProductos)
                        .then(() => console.log("Maestro de productos sincronizado globalmente."))
                        .catch((err) => console.error("Error sincronizando el maestro en Firebase:", err));
                }
                
                if (modalMaestro) modalMaestro.style.display = 'none';
                if (typeof notificar === 'function') notificar(`✅ PP [${pp}] mapeado a ${finalCodigo}`, "success");

                if (typeof continuarProcesarAccion === 'function') {
                    continuarProcesarAccion(tipo, pp, kg, ubi, ppInput);
                }
            };
        }
        return; 
    }

    if (typeof continuarProcesarAccion === 'function') {
        continuarProcesarAccion(tipo, pp, kg, ubi, ppInput);
    }
}

// ====================================================================
// 🔄 9. PROCESAMIENTO SINCRONIZADO DE STOCK Y MOVIMIENTOS
// ====================================================================

/**
 * Sub-función auxiliar aislada para procesar el stock tras la selección segura.
 * Realiza validaciones de capacidad, calcula bultos, actualiza la base de datos local,
 * guarda un respaldo local y sincroniza en tiempo real con Firebase.
 * 
 * @param {string} tipo - Tipo de acción: 'ingreso' o 'salida'.
 * @param {string} pp - Código identificador del lote de producto (formato 00-00-00).
 * @param {number} kg - Cantidad de kilogramos a procesar.
 * @param {string} ubi - Código de ubicación en la bodega (ej. A1, D1, etc.).
 * @param {HTMLElement} ppInput - Elemento input del DOM correspondiente al código PP.
 */
function continuarProcesarAccion(tipo, pp, kg, ubi, ppInput) {
    let pesoBulto = bultoSeleccionado[tipo];
    if (!pesoBulto) {
        if (typeof notificar === 'function') {
            notificar("Selecciona un tipo de bulto", "warning");
        } else {
            alert("Selecciona un tipo de bulto");
        }
        return;
    }

    let bultosNuevos = kg / pesoBulto;

    // Validación preventiva de capacidad máxima en ubicaciones (solo para Ingresos)
    if (tipo === 'ingreso') {
        let layout = bodegaActual === "principal" ? layoutPrin : layoutAdo;
        let ubiData = layout.find(item => Array.isArray(item) && item[0] === ubi);
        let capMax = ubiData ? ubiData[1] : 0;

        let bultosActuales = 0;
        if (db[ubi]) {
            for (let p in db[ubi]) {
                bultosActuales += db[ubi][p].bultos;
            }
        }

        if (bultosActuales + bultosNuevos > capMax) {
            alert(`¡ERROR! Espacio insuficiente en ${ubi}.\nCapacidad máxima: ${capMax}\nEspacio ocupado: ${Math.round(bultosActuales)}\nIntenta ingresar: ${Math.round(bultosNuevos)}`);
            return;
        }
    }

    // Procesamiento matemático de las existencias (Kilogramos y Bultos)
    if (tipo === 'ingreso') {
        if (!db[ubi]) db[ubi] = {};
        if (!db[ubi][pp]) db[ubi][pp] = { kg: 0, bultos: 0 };
        db[ubi][pp].kg += kg;
        db[ubi][pp].bultos += bultosNuevos;
    } else {
        if (!db[ubi] || !db[ubi][pp] || db[ubi][pp].kg < kg) {
            if (typeof notificar === 'function') {
                notificar("No hay stock suficiente", "error");
            } else {
                alert("No hay stock suficiente");
            }
            return;
        }
        let ratio = db[ubi][pp].bultos / db[ubi][pp].kg;
        db[ubi][pp].kg -= kg;
        db[ubi][pp].bultos -= (kg * ratio);
        
        // Limpieza de nodos vacíos para mantener limpia la estructura JSON
        if (db[ubi][pp].kg <= 0) delete db[ubi][pp];
        if (db[ubi] && Object.keys(db[ubi]).length === 0) delete db[ubi];
    }

    // Añadimos el nuevo registro al historial global preservando integridad
    logs.unshift({ tipo, pp, kg, ubi, fecha: new Date().toLocaleString() });

    // Limpieza e interactividad en la interfaz de usuario
    if (ppInput) {
        ppInput.value = "";
        ppInput.focus();
    }
    
    const kgInputId = tipo === 'ingreso' ? 'kg_in' : 'kg_out';
    const ubiSelectId = tipo === 'ingreso' ? 'ubi_in' : 'ubi_out';
    
    const elKg = document.getElementById(kgInputId);
    const elUbi = document.getElementById(ubiSelectId);
    
    if (elKg) elKg.value = "";
    if (elUbi) elUbi.selectedIndex = 0;

    // Ejecución del respaldo de contingencia en almacenamiento local
    if (typeof autoBackup === 'function') {
        autoBackup();
    }

    // Sincronización en la nube con Firebase Database
    if (typeof dbRef !== 'undefined' && dbRef.set) {
        dbRef.set({ 
            inventario: db, 
            historial: logs 
        }).then(() => {
            console.log("Sincronizado exitosamente.");
            if (typeof notificar === 'function') {
                notificar(`${tipo.toUpperCase()} OK: ${pp} - ${kg}kg en ${ubi}`, "success");
            }
            render();
        }).catch((e) => {
            console.error("Error al sincronizar acción con Firebase:", e);
            if (typeof notificar === 'function') {
                notificar("Error de red: Guardado localmente en memoria", "warning");
            }
            render();
        });
    } else {
        if (typeof notificar === 'function') {
            notificar(`${tipo.toUpperCase()} LOCAL OK (Sin conexión): ${pp} - ${kg}kg en ${ubi}`, "warning");
        }
        render();
    }
}

// ====================================================================
// 📦 10. GESTIÓN DE CONFIGURACIÓN DE BULTOS
// ====================================================================

/**
 * Inicializa y dibuja dinámicamente los listados de selección de bultos
 * correspondientes a los pesos estándar configurados en el sistema.
 */
function renderBultos() {
    const pesos = pesosValidos;

    ["ingreso", "salida"].forEach(tipo => {
        const selectContainer = document.getElementById(`bultos_${tipo}`);
        if (!selectContainer) return;

        // Limpieza y reseteo del elemento selector
        selectContainer.innerHTML = "";
        bultoSeleccionado[tipo] = null;

        // Opción por defecto no seleccionable
        const defaultOpt = document.createElement('option');
        defaultOpt.value = "";
        defaultOpt.textContent = "Seleccione bulto";
        selectContainer.appendChild(defaultOpt);

        // Generación dinámica de opciones de pesos
        pesos.forEach(p => {
            let opt = document.createElement("option");
            opt.value = p;
            opt.textContent = `${p} kg`;
            
            if (bultoSeleccionado[tipo] === p) {
                opt.selected = true;
            }

            selectContainer.appendChild(opt);
        });

        // Evento de escucha para capturar la selección del operador
        selectContainer.onchange = function() {
            if (this.value) {
                const pesoElegido = parseFloat(this.value);
                bultoSeleccionado[tipo] = pesoElegido;
                if (typeof notificar === 'function') {
                    notificar(`Bulto seleccionado para ${tipo}: ${pesoElegido} kg`, "info");
                }
            } else {
                bultoSeleccionado[tipo] = null;
            }
        };
    });
}

/**
 * Determina el formato de bulto de forma inteligente de acuerdo con el pesaje ingresado,
 * buscando un divisor exacto (con tolerancia < 0.01) de entre la lista de pesos válidos.
 * 
 * @param {string} tipo - Tipo de acción: 'ingreso' o 'salida'.
 */
function autoSeleccionarBulto(tipo) {
    let kgInput = document.getElementById(tipo === "ingreso" ? "kg_in" : "kg_out");
    if (!kgInput) return;
    
    let kg = parseFloat(kgInput.value);
    if (!kg || kg <= 0) return;

    // Búsqueda del peso óptimo divisible
    let encontrado = pesosValidos.find(p => 
        Math.abs((kg / p) - Math.round(kg / p)) < 0.01
    );

    if (!encontrado) return;

    const select = document.getElementById(`bultos_${tipo}`);
    if (select) {
        select.value = encontrado; 
        
        // Disparo artificial del evento de cambio para forzar el flujo de datos
        select.dispatchEvent(new Event('change'));
    }
}

// ====================================================================
// 📊 11. MOTOR DE RENDERIZADO VISUAL DEL LAYOUT Y KPI
// ====================================================================

/**
 * Renderiza en pantalla el mapa interactivo del almacén, calcula la ocupación
 * por pasillos/patio/galpón, actualiza los KPIs numéricos y los selectores de ubicación.
 */
function render() {
    let layout = bodegaActual === "principal" ? layoutPrin : layoutAdo;
    if (!db) db = {}; 

    // Título de cabecera dinámico de acuerdo al tipo de bodega activa
    let titulo = bodegaActual === "principal" 
        ? "LAYOUT BODEGA PRINCIPAL" 
        : "LAYOUT BODEGA ADOQUINES";

    const elTitulo = document.getElementById("mapa-titulo");
    if (elTitulo) elTitulo.innerText = titulo;
    
    let container = document.getElementById('dibujo-bodega');
    let selIn = document.getElementById('ubi_in');
    let selOut = document.getElementById('ubi_out');
    
    if (!container || !selIn || !selOut) return; // Salvaguarda si la interfaz no ha terminado de cargar
    
    container.innerHTML = ""; 
    selIn.innerHTML = ""; 
    selOut.innerHTML = "";

    // Construcción y ordenación de la lista de ubicaciones para el operador
    let todasLasUbis = [];
    layout.forEach(item => {
        if (Array.isArray(item)) todasLasUbis.push(item[0]);
    });
    
    selIn.add(new Option("Seleccione ubicación", ""));
    selOut.add(new Option("Seleccione ubicación", ""));

    todasLasUbis.sort().forEach(id => {
        selIn.add(new Option(id, id));
        selOut.add(new Option(id, id));
    });

    // Inicializadores de estadísticas de ocupación
    let tB = 0, tC = 0, pB = 0, pC = 0, eB = 0, eC = 0;
    let globalStock = {};
    let currentGrid = null;
    let currentSectionName = "";

    layout.forEach(item => {
        if (typeof item === 'string') {
            currentSectionName = item;
            let h = document.createElement('h5'); 
            h.style.margin = "15px 0 5px 0";
            h.innerText = item; 
            container.appendChild(h);
            
            currentGrid = document.createElement('div');
            
            // Asignación estructurada de clases grid del CSS
            if (item === 'GALPÓN') {
                currentGrid.className = 'galpon-grid';
            } else if (item === 'PATIO') {
                currentGrid.className = 'patio-grid';
            } else if (item === 'SECTORES') {
                currentGrid.className = 'grid-sectores-d';
            } else {
                currentGrid.className = 'grid-pasillos';
            }
            container.appendChild(currentGrid);
        } else {
            let [id, cap] = item;
            let usados = 0;
            let detallePP = ""; 

            if (db[id]) {
                for (let pp in db[id]) {
                    usados += db[id][pp].bultos;
                    globalStock[pp] = (globalStock[pp] || 0) + db[id][pp].kg;
                    
                    // Formateo del pesaje detallado de cada PP en la tarjeta
                    let kgFormateado = typeof fmt === 'function' ? fmt(db[id][pp].kg) : db[id][pp].kg;
                    detallePP += `<div style="border-top: 1px dotted #ccc; margin-top: 2px; padding-top: 2px;">
                                    ${pp}: <b>${kgFormateado}kg</b>
                                  </div>`;
                }
            }

            tB += usados; 
            tC += cap;
            
            // Separación lógica para estadísticas sectoriales (Principal vs Adoquines)
            if (bodegaActual === "principal") {
                if (id.startsWith('C') || id.startsWith('EX')) { 
                    eB += usados; 
                    eC += cap; 
                } else { 
                    pB += usados; 
                    pC += cap; 
                }
            } else {
                if (id.startsWith('E') && !id.startsWith('EX')) { 
                    eB += usados; 
                    eC += cap; 
                } else { 
                    pB += usados; 
                    pC += cap; 
                }
            }

            let pct = cap > 0 ? Math.round((usados / cap) * 100) : 0;
            let disponible = cap - usados;
            let color = pct > 90 ? 'ubi-red' : (pct > 70 ? 'ubi-yellow' : 'ubi-green');
            
            let card = document.createElement('div');
            card.className = `card-ubi ${color}`;
            card.dataset.id = id;
            card.title = "HAZ CLIC PARA VER EL ESTADO DE OCUPACIÓN DETALLADO";
            card.style.position = 'relative';

            if (id.startsWith('EX')) {
                card.style.border = "2px dashed #555";
                card.style.background = "#f7fafc";
            }
            
            if (currentSectionName === 'GALPÓN') {
                card.classList.add('card-galpon');
                if (id === 'E1' || id === 'E3') card.classList.add('galpon-izq');
                if (id === 'E2' || id === 'E4') card.classList.add('galpon-der');
            }

            // Inyección controlada de flechas de acceso logístico
            let flechaHTML = "";
            const estiloFlechaBase = "display: inline-block; width: 10px; height: 10px; border-top: 3px solid #e53e3e; border-right: 3px solid #e53e3e;";

            if (id === "A1" && bodegaActual === "principal") {
                flechaHTML = `<div style="position: absolute; bottom: -32px; left: 80%; transform: translateX(-50%); color: #e53e3e; font-size: 10px; font-weight: bold; font-family: sans-serif; white-space: nowrap; z-index: 100; animation: bounceX 1.5s infinite; display: flex; align-items: center; gap: 5px;"><span style="${estiloFlechaBase} transform: rotate(-135deg);"></span><span>ACCESO</span></div>`;
            } else if (id === "B1" && bodegaActual === "principal") {
                flechaHTML = `<div style="position: absolute; bottom: -32px; left: 80%; transform: translateX(-50%); color: #e53e3e; font-size: 10px; font-weight: bold; font-family: sans-serif; white-space: nowrap; z-index: 100; animation: bounceX 1.5s infinite; display: flex; align-items: center; gap: 5px;"><span style="${estiloFlechaBase} transform: rotate(-135deg);"></span><span>ACCESO</span></div>`;
            } else if (id === "C3" && bodegaActual === "principal") {
                flechaHTML = `<div style="position: absolute; left: -50px; top: 95%; transform: translateY(-50%); color: #e53e3e; font-size: 10px; font-weight: bold; font-family: sans-serif; white-space: nowrap; z-index: 100; animation: bounceY 1.5s infinite; display: flex; flex-direction: column; align-items: center; gap: 2px; line-height: 1;"><span style="${estiloFlechaBase} transform: rotate(-45deg); margin-bottom: 2px;"></span><span>ACCESO</span></div>`;
            } else if (id === "D1" && bodegaActual === "adoquines") {
                flechaHTML = `<div style="position: absolute; bottom: -32px; left: 20%; transform: translateX(-50%); color: #e53e3e; font-size: 10px; font-weight: bold; font-family: sans-serif; white-space: nowrap; z-index: 100; animation: bounceXDer 1.5s infinite; display: flex; align-items: center; gap: 5px;"><span>ACCESO</span><span style="${estiloFlechaBase} transform: rotate(45deg);"></span></div>`;
            } else if (id === "E3" && bodegaActual === "adoquines") {
                flechaHTML = `<div style="position: absolute; top: -32px; left: 10%; transform: translateX(-50%); color: #e53e3e; font-size: 10px; font-weight: bold; font-family: sans-serif; white-space: nowrap; z-index: 100; animation: bounceXDer 1.5s infinite; display: flex; align-items: center; gap: 5px;"><span>ACCESO</span><span style="${estiloFlechaBase} transform: rotate(45deg);"></span></div>`;
            }

            // Alertas visuales para el control FIFO preventivo
            let alertaEncontrada = false;
            let mesesMaximos = 0;
            
            if (detallePP && typeof detallePP === 'string') {
                let ppsEncontradas = detallePP.match(/\d{2}-\d{2}-\d{2}/g);
                if (ppsEncontradas && ppsEncontradas.length > 0 && typeof verificarAlertaFIFO === 'function') {
                    for (let pp of ppsEncontradas) {
                        try {
                            let resultadoPP = verificarAlertaFIFO(pp);
                            if (resultadoPP && resultadoPP.alerta) {
                                alertaEncontrada = true;
                                if (resultadoPP.meses > mesesMaximos) {
                                    mesesMaximos = resultadoPP.meses;
                                }
                            }
                        } catch(e) {
                            console.warn("Error evaluando FIFO para PP:", pp, e);
                        }
                    }
                }
            }

            let textoMiniFIFO = alertaEncontrada 
                ? `<div style="color: #dd6b20; font-size: 12px; font-weight: bold; margin-top: 2px; text-align: center; animation: pulsoAlertaFIFO 2s infinite ease-in-out;">⚠️ FIFO ${mesesMaximos}M</div>` 
                : "";

            // Renderizado de la tarjeta con estructura de texto limpia
            card.innerHTML = `
                ${flechaHTML}
                <div style="font-weight: bold; font-size: 20px; margin-bottom: 4px;">${id}</div>
                <div style="font-size: 12px; line-height: 1.2;">
                    <div>${Math.round(usados)}/${cap} bultos</div>
                    <div style="color: #555;">Disp: <b>${Math.round(disponible)}</b></div>
                    <div style="font-weight: bold; margin: 2px 0;">% ${pct}</div>
                    <div style="background: rgba(255,255,255,0.8); border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px; margin-top: 4px; font-size: 10px; text-align: left;">
                        ${detallePP || "Vacío"}
                    </div>
                    ${textoMiniFIFO}
                </div>`;
            
            if (currentGrid) {
                currentGrid.appendChild(card);
            }
        }
    });

    // Helper para determinar el color del semáforo visual de los KPI
    const getSemaforo = (p) => {
        if (p > 90) return '🔴';
        if (p > 70) return '🟡';
        return '🟢';
    };

    let pctTotalVal = tC > 0 ? Math.round((tB/tC)*100) : 0;
    let pctPVal = pC > 0 ? Math.round((pB/pC)*100) : 0;
    let pctExtVal = eC > 0 ? Math.round((eB/eC)*100) : 0;

    // Generador de etiquetas HTML de barras de progreso de ocupación
    function barra(pct) {
        let gradient = pct > 90 ? "linear-gradient(90deg, #f56565, #e53e3e)" : (pct > 70 ? "linear-gradient(90deg, #ecc94b, #dd6b20)" : "linear-gradient(90deg, #48bb78, #38a169)");
        let shadowColor = pct > 90 ? "rgba(229,62,62,0.4)" : (pct > 70 ? "rgba(221,107,32,0.3)" : "rgba(56,161,105,0.3)");
        return `<div style="display:flex; align-items:center; gap:10px; width:160px;"><div style="flex:1; height:14px; background:#edf2f7; border-radius:20px; overflow:hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;"><div style="height:100%; width:0%; background:${gradient}; border-radius:20px; box-shadow: 0 2px 6px ${shadowColor}; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);" class="barra-fill" data-pct="${pct}"></div></div><span style="font-size:12px; font-weight:700; width:38px; text-align:right; color:#2d3748;">${pct}%</span></div>`;
    }

    let nombre1 = bodegaActual === "principal" ? "PASILLOS" : "SECTORES";
    let nombre2 = bodegaActual === "principal" ? "PATIO" : "GALPÓN";

    const elMiniGrafico = document.getElementById('mini-grafico');
    if (elMiniGrafico) {
        elMiniGrafico.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;"><span style="font-weight:600; font-size:12px; color:#4a5568;">${nombre1}</span><span>${barra(pctPVal)}</span></div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;"><span style="font-weight:600; font-size:12px; color:#4a5568;">${nombre2}</span><span>${barra(pctExtVal)}</span></div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e2e8f0; padding-top:6px; font-weight:bold;"><span style="font-size:12px; color:#1a202c;">TOTAL</span><span>${barra(pctTotalVal)}</span></div>`;
    }

    // Efecto de transición para el llenado de las barras
    setTimeout(() => {
        document.querySelectorAll('.barra-fill').forEach(el => {
            el.style.width = el.dataset.pct + "%";
        });
    }, 50);

    // Actualización de elementos KPI informativos en el panel
    const elKpiTotal = document.getElementById('kpi-total');
    const elPctTotal = document.getElementById('pct-total');
    if (elKpiTotal) elKpiTotal.innerText = `${Math.round(tB)} / ${tC}`;
    if (elPctTotal) elPctTotal.innerText = `${pctTotalVal}% ${getSemaforo(pctTotalVal)}`;
    
    const elLabelP = document.getElementById('label-p');
    const elLabelExt = document.getElementById('label-ext');
    if (bodegaActual === "principal") {
        if (elLabelP) elLabelP.innerText = "PASILLOS";
        if (elLabelExt) elLabelExt.innerText = "PATIO";
    } else {
        if (elLabelP) elLabelP.innerText = "SECTORES";
        if (elLabelExt) elLabelExt.innerText = "GALPÓN";
    }

    const elKpiP = document.getElementById('kpi-p');
    const elPctP = document.getElementById('pct-p');
    if (elKpiP) elKpiP.innerText = `${Math.round(pB)} / ${pC}`;
    if (elPctP) elPctP.innerText = `${pctPVal}% ${getSemaforo(pctPVal)}`;
    
    const elKpiExt = document.getElementById('kpi-ext');
    const elPctExt = document.getElementById('pct-ext');
    if (elKpiExt) elKpiExt.innerText = `${Math.round(eB)} / ${eC}`;
    if (elPctExt) elPctExt.innerText = `${pctExtVal}% ${getSemaforo(pctExtVal)}`;

    // Invocación a los motores independientes de visualización de datos de stock e historial
    if (typeof renderTablaStock === 'function') {
        renderTablaStock(globalStock); 
    }
    if (typeof renderHistorial === 'function') {
        renderHistorial();            
    }
}

// ====================================================================
// 📊 12. TABLA DE STOCK CON DESGLOSE CONTABLE (ORDENADA POR CÓDIGO)
// ====================================================================

/**
 * Renderiza la tabla de stock consolidada agrupando los lotes físicos (PP)
 * bajo sus respectivos códigos contables definidos en el maestro de productos,
 * ordenados de forma alfabética/alfanumérica ascendente.
 * 
 * @param {Object} globalStock - Objeto con el stock acumulado por PP { "PP": kg }.
 */
function renderTablaStock(globalStock) {
    let tbody = document.querySelector('#tabla-stock tbody'); 
    if (!tbody) return; // Salvaguarda si la tabla no está presente en el DOM
    
    tbody.innerHTML = "";
    let sumaTotalKg = 0; 
    let agrupacionContable = {};

    // Agrupación de lotes (PP) bajo el código contable del maestro
    for (let pp in globalStock) {
        let kilosPP = globalStock[pp];
        sumaTotalKg += kilosPP; 

        // Consulta segura al maestro de productos con respaldo por defecto
        let infoProd = (typeof maestroProductos !== 'undefined' && maestroProductos[pp]) 
            ? maestroProductos[pp] 
            : { codigo: "SIN-CODIGO", nombre: "Producto No Registrado" };
            
        let codContable = infoProd.codigo;
        let nomProd = infoProd.nombre;

        if (!agrupacionContable[codContable]) {
            agrupacionContable[codContable] = {
                nombre: nomProd,
                totalKg: 0,
                desgloses: []
            };
        }

        agrupacionContable[codContable].totalKg += kilosPP;
        agrupacionContable[codContable].desgloses.push({ pp: pp, kg: kilosPP });
    }

    // Exposición global segura para el consumo del modal de desgloses
    window.datosContablesActuales = agrupacionContable;

    // Obtener los códigos contables
    let codigosOrdenados = Object.keys(agrupacionContable);

    if (codigosOrdenados.length > 0) {
        // 🌟 MEJORA: Ordenar alfabéticamente de A a Z por código contable
        codigosOrdenados.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        // Recorrer la lista ORDENADA en lugar del objeto directo
        codigosOrdenados.forEach(cod => {
            let item = agrupacionContable[cod];
            let fila = document.createElement('tr');
            fila.style.cursor = "pointer";
            fila.style.transition = "background 0.2s";
            fila.title = "HAZ CLIC PARA VER EL DESGLOSE DE PP";
            
            // Efectos visuales interactivos al pasar el cursor
            fila.onmouseover = function() { this.style.background = "#edf2f7"; };
            fila.onmouseout = function() { this.style.background = "transparent"; };
            fila.onclick = function() { 
                if (typeof abrirModalContable === 'function') {
                    abrirModalContable(cod); 
                }
            };

            // Renderizado seguro de fila contable con formato numérico localizado
            let totalFormateado = typeof fmt === 'function' ? fmt(item.totalKg) : item.totalKg;

            fila.innerHTML = `
                <td style="padding: 8px 4px; line-height: 1.3;">
                    <span style="background: var(--primary, #2b6cb0); color: white; padding: 1px 5px; border-radius: 4px; font-family: monospace; font-size: 13px; font-weight: bold;">${cod}</span>
                    <div style="font-size: 11px; color: #4a5568; margin-top: 2px; font-weight: 500;">${item.nombre}</div>
                </td>
                <td style="text-align: right; font-weight: bold; white-space: nowrap; padding-right: 5px; color: #2d3748;">
                    ${totalFormateado} kg <i class='bx bx-chevron-right' style='vertical-align: middle; color: #a0aec0; font-size: 16px;'></i>
                </td>`;
            tbody.appendChild(fila);
        });

        // Fila de sumatoria total de bodega
        let filaTotal = document.createElement('tr');
        filaTotal.style.fontWeight = "bold";
        filaTotal.style.backgroundColor = "#f8f9fa";
        filaTotal.style.borderTop = "2px solid #333";
        
        let sumaTotalFormateada = typeof fmt === 'function' ? fmt(sumaTotalKg) : sumaTotalKg;

        filaTotal.innerHTML = `
            <td style="padding: 8px;">TOTAL BODEGA:</td>
            <td style="padding: 8px 20px 8px 8px; text-align: right; color: #d32f2f; font-size: 15px; white-space: nowrap;">${sumaTotalFormateada} kg</td>`;
        tbody.appendChild(filaTotal);
    } else {
        tbody.innerHTML = "<tr><td colspan='2' style='text-align:center; padding: 10px; color: #777;'>Sin stock</td></tr>";
    }
}

// ====================================================================
// 📜 13. HISTORIAL DE MOVIMIENTOS RECIENTES
// ====================================================================

/**
 * Muestra los 40 movimientos más recientes del almacén en la interfaz del usuario,
 * evaluando preventivamente el estado de alertas FIFO por cada lote físico.
 */
function renderHistorial() {
    const listContainer = document.getElementById('historial-lista');
    if (!listContainer) return; // Previene fallos si la interfaz aún no tiene este contenedor

    if (typeof logs === 'undefined' || !logs || logs.length === 0) {
        listContainer.innerHTML = "<div style='text-align:center; color:#777; padding:10px;'>Sin movimientos</div>";
        if (typeof renderBultos === 'function') renderBultos();
        return;
    }

    // 1. Clonación rápida en memoria para evitar mutación directa del log original
    let listaClonada = [...logs];

    // 2. Extraemos los primeros 40 logs (los más recientes añadidos al inicio del array)
    let logsRecientes = listaClonada.slice(0, 40); 

    // 3. Renderizado mapeado de elementos del historial con validaciones de estilo FIFO
    listContainer.innerHTML = logsRecientes.map(l => {
        const iconClass = l.tipo === 'ingreso' ? 'bxs-plus-circle' : l.tipo === 'salida' ? 'bxs-minus-circle' : 'bx-transfer-alt';
        const iconColor = l.tipo === 'ingreso' ? 'var(--success)' : l.tipo === 'salida' ? 'var(--danger)' : 'var(--primary, #2b6cb0)';
        
        // Evaluación segura contra fallos del motor de análisis FIFO
        let fifoLog = { alerta: false, meses: 0 };
        if (typeof verificarAlertaFIFO === 'function') {
            try {
                fifoLog = verificarAlertaFIFO(l.pp) || fifoLog;
            } catch (e) {
                console.warn("Fallo temporal en verificación FIFO del historial:", e);
            }
        }
        
        let alertarStyle = fifoLog.alerta 
            ? 'background-color: #fffaf0; border-left: 3px solid #dd6b20;' 
            : 'border-bottom:1px solid #eee;';
            
        let badgeFIFO = fifoLog.alerta 
            ? ` <span style="background:#dd6b20; color:white; font-size:9px; padding:1px 4px; border-radius:3px; font-weight:bold;">⚠️ FIFO ${fifoLog.meses}M</span>` 
            : '';

        return `<div style="${alertarStyle} padding:8px 5px; display: flex; align-items: center;">
                    <i class='bx ${iconClass}' style='color:${iconColor}; font-size: 24px; margin-right: 10px;'></i>
                    <div style="flex-grow: 1;">
                        <b class="${fifoLog.alerta ? 'pp-antigua-texto' : ''}">${l.pp}</b>${badgeFIFO} - ${l.kg}kg en <b>${l.ubi}</b> 
                        <small style="display: block; color: #777;">${l.fecha}</small>
                    </div>
                </div>`;
    }).join('');

    // Sincronización del estado de bultos tras renderizar el historial
    if (typeof renderBultos === 'function') {
        renderBultos();
    }
}

/**
 * Formateador auxiliar localizado utilizando la notación estándar alemana (de-DE)
 * que utiliza puntos para miles y comas para decimales, ideal para pesajes en kgs.
 */
// ====================================================================
// 🔢 FORMATEADOR NUMÉRICO CON SOPORTE DE DECIMALES
// ====================================================================

/**
 * Formatea un número agregando separadores de miles y hasta 2 decimales.
 * 
 * @param {number|string} n - El número o valor a formatear.
 * @returns {string} Texto formateado (ej: "1.250,75" o "500").
 */
function fmt(n) { 
    // Convertir a número por seguridad en caso de recibir un string
    let numero = parseFloat(n);

    // Si el valor no es un número válido, retornar "0"
    if (isNaN(numero)) return "0";

    // Formatear usando el estándar local (separador de miles '.' y decimal ',')
    return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 0, // Si es entero exacto, no muestra decimales (.00)
        maximumFractionDigits: 2  // Muestra hasta 2 decimales si existen
    }).format(numero); 
}


// ====================================================================================
// 📊 14. INTERFAZ RESPONSIVE: SEMÁFORO MÓVIL CON ANIMACIÓN DE PROGRESO
// ====================================================================================

/**
 * Abre y clona los datos del semáforo general hacia el modal responsivo
 * exclusivo de dispositivos móviles, ejecutando animaciones de llenado.
 */
window.abrirSemaforoMovil = function() {
    if (window.innerWidth <= 768) {
        let contenedorDestino = document.getElementById('contenido-semaforo-clonado');
        if (!contenedorDestino) return;
        
        // Obtención robusta de etiquetas y datos del dashboard principal con fallback seguro
        let labelPasillos = document.getElementById('label-p')?.innerText || "PASILLOS";
        let labelPatio = document.getElementById('label-ext')?.innerText || "PATIO";

        let totalVal = document.getElementById('kpi-total')?.innerText || "0 / 0";
        let totalPctRaw = document.getElementById('pct-total')?.innerText || "0%";
        
        let pVal = document.getElementById('kpi-p')?.innerText || "0 / 0";
        let pPctRaw = document.getElementById('pct-p')?.innerText || "0%";
        
        let extVal = document.getElementById('kpi-ext')?.innerText || "0 / 0";
        let extPctRaw = document.getElementById('pct-ext')?.innerText || "0%";

        // Helper para extraer los números enteros del string de porcentaje
        let limpiarPorcentaje = (textoRaw) => {
            let coincidencia = textoRaw.match(/\d+/);
            return coincidencia ? coincidencia[0] + "%" : "0%";
        };

        let totalPct = limpiarPorcentaje(totalPctRaw);
        let pPct = limpiarPorcentaje(pPctRaw);
        let extPct = limpiarPorcentaje(extPctRaw);

        // Helper para definir colores según el porcentaje de ocupación
        let obtenerColorBarra = (pctTexto) => {
            let num = parseInt(pctTexto) || 0;
            if (num >= 90) return "#e53e3e"; // Rojo
            if (num >= 70) return "#dd6b20"; // Naranja
            return "#38a169"; // Verde
        };

        // Inyección estructurada de barras de progreso móviles
        contenedorDestino.innerHTML = `
            <div style="margin-bottom: 20px; font-family: sans-serif;">
                <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin-bottom: 5px; color: #2d3748;">
                    <span>OCUPACIÓN TOTAL</span>
                    <span style="color: ${obtenerColorBarra(totalPct)};">${totalVal} &nbsp; | &nbsp; ${totalPctRaw}</span>
                </div>
                <div style="background: #edf2f7; width: 100%; height: 14px; border-radius: 7px; overflow: hidden;">
                    <div id="bar-movil-total" style="background: ${obtenerColorBarra(totalPct)}; width: 0%; height: 100%; transition: width 2s cubic-bezier(0.1, 1, 0.1, 1);"></div>
                </div>
            </div>

            <div style="margin-bottom: 20px; font-family: sans-serif;">
                <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin-bottom: 5px; color: #2d3748;">
                    <span>${labelPasillos}</span>
                    <span style="color: ${obtenerColorBarra(pPct)};">${pVal} &nbsp; | &nbsp; ${pPctRaw}</span>
                </div>
                <div style="background: #edf2f7; width: 100%; height: 14px; border-radius: 7px; overflow: hidden;">
                    <div id="bar-movil-p" style="background: ${obtenerColorBarra(pPct)}; width: 0%; height: 100%; transition: width 2s cubic-bezier(0.1, 1, 0.1, 1);"></div>
                </div>
            </div>

            <div style="margin-bottom: 10px; font-family: sans-serif;">
                <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin-bottom: 5px; color: #2d3748;">
                    <span>${labelPatio}</span>
                    <span style="color: ${obtenerColorBarra(extPct)};">${extVal} &nbsp; | &nbsp; ${extPctRaw}</span>
                </div>
                <div style="background: #edf2f7; width: 100%; height: 14px; border-radius: 7px; overflow: hidden;">
                    <div id="bar-movil-ext" style="background: ${obtenerColorBarra(extPct)}; width: 0%; height: 100%; transition: width 2s cubic-bezier(0.1, 1, 0.1, 1);"></div>
                </div>
            </div>
        `;
        
        const modalSemaforo = document.getElementById('modal-semaforo-movil');
        if (modalSemaforo) {
            modalSemaforo.style.display = 'flex';
        }

        // Retardo controlado para asegurar que la animación de la barra CSS se ejecute visiblemente
        setTimeout(() => {
            const barTotal = document.getElementById('bar-movil-total');
            const barP = document.getElementById('bar-movil-p');
            const barExt = document.getElementById('bar-movil-ext');
            
            if (barTotal) barTotal.style.width = totalPct;
            if (barP) barP.style.width = pPct;
            if (barExt) barExt.style.width = extPct;
        }, 10);
    }
};

/**
 * Cierra de forma segura el modal de visualización del semáforo en pantallas móviles.
 */
window.cerrarSemaforoMovil = function() {
    const modal = document.getElementById('modal-semaforo-movil');
    if (modal) {
        modal.style.display = 'none';
    }
};

// ====================================================================================
// 🗂️ 15. CONTROL DE MODALES Y NAVEGACIÓN POR PESTAÑAS (TABS)
// ====================================================================================

// Controladores globales de estado para el modal de detalle contable
window.codigoContableSeleccionado = "";
window.tabActualModal = "material";

/**
 * Abre el modal de detalles contables inicializándolo siempre en la pestaña 'material'.
 * 
 * @param {string} codigoContable - Código identificador contable a consultar.
 */
window.abrirModalContable = function(codigoContable) {
    window.codigoContableSeleccionado = codigoContable;
    window.tabActualModal = "material"; 
    
    // Configuración visual de pestañas en estado inicial
    const tMaterial = document.getElementById('tab-material');
    const tGeneral = document.getElementById('tab-general');
    const tConsolidado = document.getElementById('tab-consolidado');
    const tGrafico = document.getElementById('tab-grafico');

    if (tMaterial) {
        tMaterial.style.color = "var(--primary, #2b6cb0)";
        tMaterial.style.borderBottom = "3px solid var(--primary, #2b6cb0)";
    }
    if (tGeneral) {
        tGeneral.style.color = "#718096";
        tGeneral.style.borderBottom = "3px solid transparent";
    }
    if (tConsolidado) {
        tConsolidado.style.color = "#718096";
        tConsolidado.style.borderBottom = "3px solid transparent";
    }
    if (tGrafico) {
        tGrafico.style.color = "#718096";
        tGrafico.style.borderBottom = "3px solid transparent";
    }

    const modalContable = document.getElementById('modal-detalle-contable');
    if (modalContable) {
        modalContable.style.display = 'flex';
    }
    
    // Al abrir el modal, nos aseguramos de ocultar o mostrar el botón según corresponda
    gestionarBotonImpresionStock("material");

    if (typeof dibujarContenidoModal === 'function') {
        dibujarContenidoModal();
    }
};

/**
 * Cierra de forma segura el modal de visualización de detalles contables.
 */
window.cerrarModalContable = function() {
    const modalContable = document.getElementById('modal-detalle-contable');
    if (modalContable) {
        modalContable.style.display = 'none';
    }
};

/**
 * Alterna dinámicamente la pestaña activa dentro del modal contable,
 * refrescando inmediatamente el contenedor visual correspondiente.
 * 
 * @param {string} tab - Identificador de la pestaña ('material', 'general', 'consolidado' o 'grafico').
 */
window.cambiarTabModal = function(tab) {
    window.tabActualModal = tab;
    
    let btnMaterial = document.getElementById('tab-material');
    let btnGeneral = document.getElementById('tab-general');
    let btnConsolidado = document.getElementById('tab-consolidado');
    let btnGrafico = document.getElementById('tab-grafico');

    // Inicializamos todos los botones en estado inactivo verificando su existencia previa
    [btnMaterial, btnGeneral, btnConsolidado, btnGrafico].forEach(btn => {
        if (btn) {
            btn.style.color = "#718096";
            btn.style.borderBottom = "3px solid transparent";
        }
    });

    // Activamos visualmente solo la pestaña seleccionada por el operador
    if (tab === 'material' && btnMaterial) {
        btnMaterial.style.color = "var(--primary, #2b6cb0)";
        btnMaterial.style.borderBottom = "3px solid var(--primary, #2b6cb0)";
    } else if (tab === 'general' && btnGeneral) {
        btnGeneral.style.color = "var(--primary, #2b6cb0)";
        btnGeneral.style.borderBottom = "3px solid var(--primary, #2b6cb0)";
    } else if (tab === 'consolidado' && btnConsolidado) {
        btnConsolidado.style.color = "var(--primary, #2b6cb0)";
        btnConsolidado.style.borderBottom = "3px solid var(--primary, #2b6cb0)";
    } else if (tab === 'grafico' && btnGrafico) {
        btnGrafico.style.color = "var(--primary, #2b6cb0)";
        btnGrafico.style.borderBottom = "3px solid var(--primary, #2b6cb0)";
    }
    
    // Validamos el rol y la pestaña para mostrar u ocultar el botón de impresión
    gestionarBotonImpresionStock(tab);

    if (typeof dibujarContenidoModal === 'function') {
        dibujarContenidoModal();
    }
};

// ====================================================================
// 🔐 FUNCIÓN AUXILIAR: VISIBILIDAD E INYECCIÓN DINÁMICA DE IMPRESIÓN
// ====================================================================
function gestionarBotonImpresionStock(tabActiva) {
    const urlParams = new URLSearchParams(window.location.search);
    const rol = urlParams.get('rol');
    const esAdministrador = (rol === 'admin');

    // Definimos las pestañas que permiten impresión para administradores
    const permiteImpresion = (tabActiva === 'general' || tabActiva === 'consolidado') && esAdministrador;

    let btnImprimir = document.getElementById('btn-imprimir-stock-general');

    // 1. Si no existe en el DOM y se cumple la condición, lo creamos dinámicamente
    if (!btnImprimir && permiteImpresion) {
        const contenedorTitulo = document.getElementById('modal-contable-titulo')?.parentElement;
        
        if (contenedorTitulo) {
            btnImprimir = document.createElement('button');
            btnImprimir.id = 'btn-imprimir-stock-general';
            
            btnImprimir.style.backgroundColor = 'var(--primary, #2b6cb0)';
            btnImprimir.style.color = '#ffffff';
            btnImprimir.style.border = 'none';
            btnImprimir.style.padding = '8px 16px';
            btnImprimir.style.borderRadius = '6px';
            btnImprimir.style.cursor = 'pointer';
            btnImprimir.style.fontSize = '14px';
            btnImprimir.style.fontWeight = 'bold';
            btnImprimir.style.marginLeft = '15px';
            btnImprimir.style.transition = 'background-color 0.2s';

            contenedorTitulo.appendChild(btnImprimir);
        } else {
            console.error("No se encontró el contenedor del título del modal para adjuntar el botón.");
            return;
        }
    }

    // 2. Ajustamos texto y visibilidad del botón según la pestaña activa
    if (btnImprimir) {
        if (permiteImpresion) {
            // Personalizamos el texto del botón según la pestaña
            if (tabActiva === 'consolidado') {
                btnImprimir.innerText = '🖨️ Imprimir Stock Total';
            } else {
                btnImprimir.innerText = '🖨️ Imprimir Stock Bodega';
            }
            btnImprimir.style.setProperty('display', 'inline-block', 'important');
        } else {
            btnImprimir.style.setProperty('display', 'none', 'important');
        }
    }
}

// ====================================================================
// 🗂️ ALGORITMO DE IMPRESIÓN DINÁMICA (BODEGA ESPECÍFICA Y STOCK TOTAL)
// ====================================================================
function ejecutarImpresionStockGeneral() {
    const tbody = document.getElementById('modal-contable-tabla-body');
    const headersOriginales = document.getElementById('modal-contable-headers');

    if (!tbody || tbody.children.length === 0) {
        alert("No hay datos disponibles en la tabla para imprimir.");
        return;
    }

    // Detección de pestaña actual ('general' o 'consolidado')
    const esConsolidado = (window.tabActualModal === 'consolidado');
    const tituloInforme = esConsolidado ? "INFORME STOCK TOTAL" : "INFORME STOCK BODEGA";

    // 🏬 Detección de bodega activa (solo si no es consolidado)
    let bodegaDetectada = "PRINCIPAL";
    if (typeof window.bodegaActual !== 'undefined' && window.bodegaActual) {
        bodegaDetectada = String(window.bodegaActual).toUpperCase();
    } else if (typeof bodegaActual !== 'undefined' && bodegaActual) {
        bodegaDetectada = String(bodegaActual).toUpperCase();
    }

    // Configuración del encabezado según el tipo de informe
    const HTMLBodega = esConsolidado 
        ? `<div><strong>BODEGA:</strong> <span class="bodega-tag">🌎 TODAS LAS BODEGAS</span></div>`
        : `<div><strong>BODEGA:</strong> <span class="bodega-tag">🏢 ${bodegaDetectada}</span></div>`;

    // Ventana y documento de impresión
    const ventanaImpresion = window.open('', '_blank');
    const fechaHoy = new Date().toLocaleDateString('es-ES', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit'
    });

    ventanaImpresion.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Informe - ${tituloInforme}</title>
            <style>
                body { font-family: Arial, sans-serif; color: #2d3748; padding: 15px; margin: 0; }
                .header { border-bottom: 3px solid #2b6cb0; padding-bottom: 12px; margin-bottom: 20px; }
                .title { font-size: 18px; font-weight: bold; color: #1a365d; margin: 0; }
                .meta-info { display: flex; justify-content: space-between; margin-top: 8px; font-size: 13px; color: #4a5568; }
                .bodega-tag { font-weight: bold; color: #2b6cb0; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
                th { background-color: #f7fafc; color: #2d3748; font-weight: bold; padding: 10px 8px; border: 1px solid #cbd5e0; text-align: left; }
                td { padding: 10px 8px; border: 1px solid #e2e8f0; }
                tr:nth-child(even) { background-color: #fcfcfc; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">🌐 ${tituloInforme}</div>
                <div class="meta-info">
                    ${HTMLBodega}
                    <div><strong>Fecha de emisión:</strong> ${fechaHoy}</div>
                </div>
            </div>
            <table>
                <thead>
                    <tr>${headersOriginales ? headersOriginales.innerHTML : ''}</tr>
                </thead>
                <tbody>
                    ${tbody.innerHTML}
                </tbody>
            </table>
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

// Escuchador global de eventos asignado al botón de impresión
document.addEventListener('click', function(e) {
    if (e.target && (e.target.id === 'btn-imprimir-stock-general' || e.target.closest('#btn-imprimir-stock-general'))) {
        ejecutarImpresionStockGeneral();
    }
});

// ====================================================================
// 📊 DIBUJO Y CONTROL DINÁMICO DEL MODAL CONTABLE
// ====================================================================
function dibujarContenidoModal() {
    let tHeaders = document.getElementById('modal-contable-headers');
    let tBodyModal = document.getElementById('modal-contable-tabla-body');
    let contenedorTabla = document.getElementById('modal-contable-contenedor-tabla');
    let contenedorGrafico = document.getElementById('modal-contable-contenedor-grafico');

    if (!tBodyModal) return;
    tBodyModal.innerHTML = "";

    // MODO: GRÁFICO
    if (window.tabActualModal === 'grafico') {
        if (contenedorTabla) contenedorTabla.style.display = "none";
        if (contenedorGrafico) contenedorGrafico.style.display = "block";

        const elTitulo = document.getElementById('modal-contable-titulo');
        const elSubtitulo = document.getElementById('modal-contable-sub');

        if (elTitulo) elTitulo.style.display = "none"; 
        if (elSubtitulo) {
            elSubtitulo.innerText = "DISTRIBUCIÓN PORCENTUAL DEL STOCK TOTAL POR TIPO DE MATERIAL EN ESTA BODEGA";
        }

        let datos = window.datosContablesActuales ? window.datosContablesActuales[window.codigoContableSeleccionado] : null;
        if (datos && typeof dibujarGraficoModal === 'function') {
            dibujarGraficoModal(datos);
        }
        return; // Ahora este return es 100% válido porque está dentro de dibujarContenidoModal()
    }

    // Restablecemos visibilidad para vistas de tabla (material, consolidado, general)
    if (contenedorTabla) contenedorTabla.style.display = "block";
    if (contenedorGrafico) contenedorGrafico.style.display = "none";


// ====================================================================
    // 📦 MODO: DETALLE MATERIAL (SINCRONIZADO EN TIEMPO REAL CON BODEGA ACTIVA)
    // ====================================================================
    if (window.tabActualModal === 'material') {
        // 1. Obtener la bodega activa actual
        let bActual = String(window.bodegaActual || bodegaActual || 'principal').toLowerCase();

        // 2. Determinar el layout correspondiente
        let layoutActivo = (bActual === 'principal') ? layoutPrin : layoutAdo;

        // Extraer ubicaciones válidas de la bodega activa
        let ubicacionesActivas = [];
        if (Array.isArray(layoutActivo)) {
            layoutActivo.forEach(item => {
                if (Array.isArray(item) && item[0]) {
                    ubicacionesActivas.push(item[0]);
                }
            });
        }

        // 3. Obtener los datos contables recién calculados por render()
        let datos = window.datosContablesActuales ? window.datosContablesActuales[window.codigoContableSeleccionado] : null;
        if (!datos) return;

        // Configurar títulos en el modal
        const elTitulo = document.getElementById('modal-contable-titulo');
        const elSubtitulo = document.getElementById('modal-contable-sub');

        if (elTitulo) {
            elTitulo.style.display = "block";
            elTitulo.innerText = `CÓDIGO CONTABLE: ${window.codigoContableSeleccionado}`;
        }
        if (elSubtitulo) {
            let nombreBodegaTexto = (bActual === 'principal') ? 'PRINCIPAL' : 'ADOQUINES';
            elSubtitulo.innerText = `${datos.nombre} (BODEGA ${nombreBodegaTexto})`;
        }

        // Encabezados de la tabla
        if (tHeaders) {
            tHeaders.innerHTML = `
                <th style="padding: 8px 6px; border-bottom: 2px solid #ddd; text-align: left;">UBICACIÓN</th>
                <th style="padding: 8px 6px; border-bottom: 2px solid #ddd; text-align: center;">PP</th>
                <th style="padding: 8px 12px; border-bottom: 2px solid #ddd; text-align: right;">CANTIDAD (KG)</th>
            `;
        }

        tBodyModal.innerHTML = ''; // Limpiar filas anteriores

        // 4. Recorrer la base de datos 'db' filtrando estrictamente por las ubicaciones activas
        let fuenteDatos = (typeof db !== 'undefined' && db) ? db : {};
        let filasAgregadas = 0;

        if (Array.isArray(datos.desgloses)) {
            datos.desgloses.forEach(d => {
                let ppBuscada = String(d.pp || '').trim();

                ubicacionesActivas.forEach(idUbi => {
                    if (fuenteDatos[idUbi] && fuenteDatos[idUbi][ppBuscada]) {
                        let infoPP = fuenteDatos[idUbi][ppBuscada];
                        let kilosEnUbi = parseFloat(infoPP.kg || 0);

                        if (kilosEnUbi > 0) {
                            filasAgregadas++;
                            let kgTexto = typeof fmt === 'function' ? fmt(kilosEnUbi) : kilosEnUbi.toLocaleString('es-CL');

                            tBodyModal.innerHTML += `
                                <tr style="border-bottom: 1px solid #edf2f7;">
                                    <td style="padding: 8px 6px; font-weight: bold; color: #2b6cb0;">
                                        📍 ${idUbi}
                                    </td>
                                    <td style="padding: 8px 6px; text-align: center;">
                                        <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: bold;">${ppBuscada}</span>
                                    </td>
                                    <td style="padding: 8px 12px; text-align: right; font-weight: bold; color: #38a169;">
                                        ${kgTexto} kg
                                    </td>
                                </tr>`;
                        }
                    }
                });
            });
        }

        // Mensaje preventivo si no hay registros en la bodega activa
        if (filasAgregadas === 0) {
            tBodyModal.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 15px; color: #718096;">
                        No hay existencias para este material en la bodega <strong>${bActual.toUpperCase()}</strong>.
                    </td>
                </tr>`;
        }

} else if (window.tabActualModal === 'consolidado') {

        // ====================================================================
        // 🌎 MODO: STOCK TOTAL (SUMA GLOBAL DE BODEGA PRINCIPAL + ADOQUINES)
        // ====================================================================
        const elTitulo = document.getElementById('modal-contable-titulo');
        const elSubtitulo = document.getElementById('modal-contable-sub');

        if (elTitulo) {
            elTitulo.style.display = "block";
            elTitulo.innerText = `INFORME STOCK TOTAL`;
        }
        if (elSubtitulo) {
            elSubtitulo.innerText = `INFORME GLOBAL (BODEGA PRINCIPAL + ADOQUINES)`;
        }

        if (tHeaders) {
            tHeaders.innerHTML = `
                <th style="padding: 8px 10px; border-bottom: 2px solid #cbd5e0; text-align: left; background: #edf2f7;">Cód. Contable / Material</th>
                <th style="padding: 8px 20px; border-bottom: 2px solid #cbd5e0; text-align: right; background: #edf2f7; width: 120px;">Kilos</th>
            `;
        }

        tBodyModal.innerHTML = '';

        // 1. Obtener la fuente de datos (Prioridad: variable en memoria 'db', Respaldo: localStorage)
        let fuenteDatos = {};

        if (typeof db !== 'undefined' && db && Object.keys(db).length > 0) {
            fuenteDatos = db;
        } else {
            try {
                let datosRaw = localStorage.getItem('bodega_db');
                if (datosRaw) fuenteDatos = JSON.parse(datosRaw);
            } catch (e) {
                console.error("Error al obtener datos para el Stock Total:", e);
            }
        }

        // 2. Acumuladores de datos
        let consolidado = {};
        let granTotalGeneral = 0;

        // 3. Recorrer todos los casilleros de la base de datos (sin filtrar por bodega)
        for (let casilleroId in fuenteDatos) {
            let casillero = fuenteDatos[casilleroId];
            if (!casillero || typeof casillero !== 'object') continue;

            // Recorrer las PPs dentro del casillero
            for (let ppKey in casillero) {
                let registro = casillero[ppKey];
                if (!registro) continue;

                // Extraer kilos asegurando que sea un valor numérico válido
                let kilos = 0;
                if (typeof registro === 'object' && registro.kg !== undefined) {
                    kilos = parseFloat(registro.kg) || 0;
                } else if (typeof registro === 'number' || typeof registro === 'string') {
                    kilos = parseFloat(registro) || 0;
                }

                if (kilos > 0) {
                    granTotalGeneral += kilos;
                    let ppLimpia = String(ppKey).trim();

                    // Buscar el producto en el maestro de productos
                    let infoProd = (typeof maestroProductos !== 'undefined' && maestroProductos[ppLimpia]) 
                        ? maestroProductos[ppLimpia] 
                        : null;

                    let codContable = infoProd ? infoProd.codigo : "SIN-CODIGO";
                    let nombreProd = infoProd ? infoProd.nombre : `PP: ${ppLimpia}`;

                    // Crear el grupo por Código Contable si no existe
                    if (!consolidado[codContable]) {
                        consolidado[codContable] = {
                            nombre: nombreProd,
                            totalKg: 0,
                            pps: {}
                        };
                    }

                    // Acumular total por Código Contable
                    consolidado[codContable].totalKg += kilos;

                    // Acumular kilos por PP individual
                    if (!consolidado[codContable].pps[ppLimpia]) {
                        consolidado[codContable].pps[ppLimpia] = 0;
                    }
                    consolidado[codContable].pps[ppLimpia] += kilos;
                }
            }
        }

        // 4. Renderizar los resultados en la tabla con la estética de "Stock Bodega"
        let codigosOrdenados = Object.keys(consolidado);

        if (codigosOrdenados.length > 0) {
            // Ordenar alfabéticamente por Código Contable
            codigosOrdenados.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

            codigosOrdenados.forEach(cod => {
                let grupo = consolidado[cod];

                // --- FILA 1: Encabezado del Material (Igual a Stock Bodega) ---
                tBodyModal.innerHTML += `
                    <tr style="background: #e6f2ff; border-top: 2px solid #bee3f8; border-bottom: 1px solid #bee3f8;">
                        <td colspan="2" style="padding: 12px 10px; font-weight: bold; color: #1a365d; font-size: 13px; line-height: 1.5; vertical-align: middle;">
                            <span style="display: inline-block; font-family: monospace; background: #2b6cb0; color: #ffffff; padding: 3px 7px; border-radius: 4px; font-weight: 800; margin-right: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-size: 13px; vertical-align: middle; line-height: 1;">${cod}</span>
                            <span style="vertical-align: middle;">${grupo.nombre}</span>
                        </td>
                    </tr>`;

                // --- FILA 2: Desglose por PP ---
                for (let pp in grupo.pps) {
                    let kgPP = grupo.pps[pp];
                    let kgPPFormateado = typeof fmt === 'function' ? fmt(kgPP) : kgPP.toLocaleString('es-CL');

                    tBodyModal.innerHTML += `
                        <tr style="border-bottom: 1px solid #edf2f7;">
                            <td style="padding: 6px 10px 6px 35px; color: #4a5568; font-size: 11px;">
                                🔹PP <span style="font-family: monospace; background: #e2e8f0; padding: 1px 5px; border-radius: 4px; font-weight: bold; font-size: 13px; margin-left: 5px;">${pp}</span>
                            </td>
                            <td style="padding: 6px 20px; text-align: right; font-family: monospace; color: #2d3748; font-size: 13px;">
                                ${kgPPFormateado} kg
                            </td>
                        </tr>`;
                }

                // --- FILA 3: Fila de Subtotal por Código Contable (Igual a Stock Bodega) ---
                let subtotalFormateado = typeof fmt === 'function' ? fmt(grupo.totalKg) : grupo.totalKg.toLocaleString('es-CL');

                tBodyModal.innerHTML += `
                    <tr style="border-bottom: 2px solid #cbd5e0;">
                        <td style="padding: 6px 10px 6px 35px; font-weight: bold; color: #4a5568; font-size: 14px; text-align: right;">
                            SUBTOTAL ${cod}:
                        </td>
                        <td style="padding: 6px 20px; text-align: right; font-weight: bold; color: #2b6cb0; font-family: monospace; font-size: 14px; background: #fbfbfb;">
                            ${subtotalFormateado} kg
                        </td>
                    </tr>`;
            });

// --- FILA FINAL: Gran Total de Stock Consolidado ---
            let granTotalFormateado = typeof fmt === 'function' ? fmt(granTotalGeneral) : granTotalGeneral.toLocaleString('es-CL');
            tBodyModal.innerHTML += `
            <tr style="background: #ebf8ff; border-top: 3px double #3182ce; font-weight: bold;">
                <td style="padding: 12px 10px; color: #2c5282; font-size: 14px; text-align: right;">
                        🌎 STOCK TOTAL:
                    </td>
                <td style="padding: 12px 10px; text-align: right; color: #2b6cb0; font-size: 15px; font-family: monospace; font-weight: bold;">
                        ${granTotalFormateado} kg
                    </td>
                </tr>`;

        } else {
            tBodyModal.innerHTML = `
                <tr>
                    <td colspan="2" style="padding: 15px; text-align: center; color: #718096;">
                        No hay registros de stock acumulado en ninguna bodega.
                    </td>
                </tr>`;
        }

} else if (window.tabActualModal === 'general') {

        // ====================================================================
        // 🌐 MODO: STOCK BODEGA (DETALLE DE LA BODEGA SELECCIONADA)
        // ====================================================================
        const elTitulo = document.getElementById('modal-contable-titulo');
        const elSubtitulo = document.getElementById('modal-contable-sub');

        // 1. Hacemos visible el título principal y actualizamos su texto
        if (elTitulo) {
            elTitulo.style.display = "block";
            elTitulo.innerText = `INFORME STOCK BODEGA`;
        }

        // 2. Detectamos la bodega activa para mostrarla en el subtítulo
        if (elSubtitulo) {
            let nombreBodegaTexto = (typeof bodegaActual !== 'undefined' && bodegaActual === 'principal') 
                ? 'PRINCIPAL' 
                : (typeof bodegaActual !== 'undefined' ? bodegaActual.toUpperCase() : 'ACTUAL');
            
            elSubtitulo.innerText = `DETALLE DE STOCK EN BODEGA ${nombreBodegaTexto}`;
        }

        // 3. Encabezados de la tabla
        if (tHeaders) {
            tHeaders.innerHTML = `
                <th style="padding: 8px 10px; border-bottom: 2px solid #cbd5e0; text-align: left; background: #edf2f7;">Cód. Contable / Material</th>
                <th style="padding: 8px 20px; border-bottom: 2px solid #cbd5e0; text-align: right; background: #edf2f7; width: 120px;">Kilos</th>
            `;
        }

        let granSumatoriaKg = 0;

        // 4. Recorrido y renderizado de materiales en la bodega activa
        if (window.datosContablesActuales) {
            let codigosOrdenados = Object.keys(window.datosContablesActuales);
            codigosOrdenados.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

            codigosOrdenados.forEach(cod => {
                let item = window.datosContablesActuales[cod];
                let subtotalCodigo = 0;

                tBodyModal.innerHTML += `
                    <tr style="background: #e6f2ff; border-top: 2px solid #bee3f8; border-bottom: 1px solid #bee3f8;">
                        <td colspan="2" style="padding: 12px 10px; font-weight: bold; color: #1a365d; font-size: 13px; line-height: 1.5; vertical-align: middle;">
                            <span style="display: inline-block; font-family: monospace; background: #2b6cb0; color: #ffffff; padding: 3px 7px; border-radius: 4px; font-weight: 800; margin-right: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-size: 13px; vertical-align: middle; line-height: 1;">${cod}</span>
                            <span style="vertical-align: middle;">${item.nombre}</span>
                        </td>
                    </tr>`;

                if (Array.isArray(item.desgloses)) {
                    item.desgloses.forEach(d => {
                        subtotalCodigo += d.kg;
                        granSumatoriaKg += d.kg;

                        let kgFormateado = typeof fmt === 'function' ? fmt(d.kg) : d.kg;

                        tBodyModal.innerHTML += `
                            <tr style="border-bottom: 1px solid #edf2f7;">
                                <td style="padding: 6px 10px 6px 35px; color: #4a5568; font-size: 11px;">
                                    🔹PP <span style="font-family: monospace; background: #e2e8f0; padding: 1px 5px; border-radius: 4px; font-weight: bold; font-size: 13px; margin-left: 5px;">${d.pp}</span>
                                </td>
                                <td style="padding: 6px 20px; text-align: right; font-family: monospace; color: #2d3748; font-size: 13px;">
                                    ${kgFormateado} kg
                                </td>
                            </tr>`;
                    });
                }

                let subtotalFormateado = typeof fmt === 'function' ? fmt(subtotalCodigo) : subtotalCodigo;

                tBodyModal.innerHTML += `
                    <tr style="border-bottom: 2px solid #cbd5e0;">
                        <td style="padding: 6px 10px 6px 35px; font-weight: bold; color: #4a5568; font-size: 14px; text-align: right;">
                            SUBTOTAL ${cod}:
                        </td>
                        <td style="padding: 6px 20px; text-align: right; font-weight: bold; color: #2b6cb0; font-family: monospace; font-size: 14px; background: #fbfbfb;">
                            ${subtotalFormateado} kg
                        </td>
                    </tr>`;
            });
        }

        // 5. Totalizador general para la bodega activa
        let nombreBodegaFinal = (typeof bodegaActual !== 'undefined' && bodegaActual === 'principal') 
            ? 'BODEGA PRINCIPAL' 
            : `BODEGA ${(typeof bodegaActual !== 'undefined' ? bodegaActual : 'ACTUAL').toUpperCase()}`;

        let granSumatoriaFormateada = typeof fmt === 'function' ? fmt(granSumatoriaKg) : granSumatoriaKg;

        tBodyModal.innerHTML += `
            <tr style="background: #ebf8ff; border-top: 3px double #3182ce; font-weight: bold;">
                <td style="padding: 12px 10px; color: #2c5282; font-size: 14px; text-align: right;">
                    🔵 STOCK TOTAL ${nombreBodegaFinal}:
                </td>
                <td style="padding: 12px 10px; text-align: right; color: #2b6cb0; font-size: 15px; font-family: monospace; font-weight: bold;">
                    ${granSumatoriaFormateada} kg
                </td>
            </tr>`;
    }
}

// ====================================================================
// 📊 16. MOTOR DE RENDERIZADO: GRÁFICO DE ANILLO (CANVAS HTML5)
// ====================================================================

/**
 * Procesa la información contable acumulada y dibuja dinámicamente
 * un gráfico de dona en un lienzo 2D para ilustrar la ocupación por categorías.
 */
function dibujarGraficoModal() {
    const canvas = document.getElementById('canvas-grafico-modal');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 1. Limpieza total del lienzo
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 2. Inicialización de los acumuladores de categorías operativas del WMS
    const categorias = {
        "ÁCIDO BÓRICO": 0,
        "RECHAZO": 0,
        "CALCINADO": 0,
        "GRANULEX": 0,
        "ULEXITA": 0,
        "OTROS": 0
    };

    let stockTotalGeneral = 0;

    // 3. Clasificación e indexación inteligente del stock mediante coincidencias semánticas
    if (window.datosContablesActuales) {
        for (let cod in window.datosContablesActuales) {
            let item = window.datosContablesActuales[cod];
            let nombreMinuscula = (item.nombre || "").toLowerCase();
            let kilos = item.totalKg || 0;

            if (kilos === 0 && Array.isArray(item.desgloses)) {
                item.desgloses.forEach(d => kilos += d.kg);
            }

            if (nombreMinuscula.includes("acido") || nombreMinuscula.includes("ácido")) {
                categorias["ÁCIDO BÓRICO"] += kilos;
            } else if (nombreMinuscula.includes("rechazo") || nombreMinuscula.includes("manga") || nombreMinuscula.includes("mangas")) {
                categorias["RECHAZO"] += kilos;
            } else if (nombreMinuscula.includes("calcinado")) {
                categorias["CALCINADO"] += kilos;
            } else if (nombreMinuscula.includes("granulex")) {
                categorias["GRANULEX"] += kilos;
            } else if (nombreMinuscula.includes("ulexita")) {
                categorias["ULEXITA"] += kilos;
            } else {
                categorias["OTROS"] += kilos;
            }

            stockTotalGeneral += kilos;
        }
    }

    // Salvaguarda visual si no hay existencias físicas para graficar
    if (stockTotalGeneral === 0) {
        ctx.fillStyle = "#718096";
        ctx.font = "bold 16px sans-serif"; 
        ctx.textAlign = "center";
        ctx.fillText("Sin existencias de stock para graficar", canvas.width / 2, canvas.height / 2);
        return;
    }

    // 4. Configuración de paleta de colores corporativa (contraste optimizado sobre blanco)
    const colores = {
        "ÁCIDO BÓRICO": "#3182ce", // Azul
        "RECHAZO": "#e53e3e",      // Rojo
        "CALCINADO": "#d69e2e",    // Dorado/Amarillo oscuro
        "GRANULEX": "#38a169",     // Verde
        "ULEXITA": "#805ad5",      // Morado
        "OTROS": "#718096"         // Gris
    };

    // 5. Dimensionamiento geométrico del anillo interactivo
    const centerX = 100; 
    const centerY = canvas.height / 2;
    const radius = 95;    
    const innerRadius = 45; 
    
    let startAngle = 0;

    // 6. Dibujo vectorial de los segmentos del anillo
    for (let cat in categorias) {
        let kgCat = categorias[cat];
        if (kgCat === 0) continue;

        let porcentaje = kgCat / stockTotalGeneral;
        let sliceAngle = porcentaje * (2 * Math.PI);

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle, false);
        ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
        ctx.closePath();
        
        ctx.fillStyle = colores[cat];
        ctx.fill();

        startAngle += sliceAngle;
    }

    // 7. Renderizado de leyendas y métricas al costado derecho
    let legendX = 280; 
    let legendY = 50;
    
    ctx.textAlign = "left";
    ctx.font = "bold 15px sans-serif"; 
    ctx.fillStyle = "#1a202c";        
    ctx.fillText("DISTRIBUCIÓN TOTAL:", legendX, legendY - 28);

    for (let cat in categorias) {
        let kgCat = categorias[cat];
        if (kgCat === 0) continue;

        let pct = ((kgCat / stockTotalGeneral) * 100).toFixed(1);

        // Indicador cuadrado de color de la categoría
        ctx.fillStyle = colores[cat];
        ctx.fillRect(legendX, legendY - 11, 14, 14);

        // Texto informativo de la categoría
        ctx.fillStyle = "#2d3748";
        ctx.font = "bold 15px sans-serif"; 
        ctx.fillText(`${cat} (${pct}%)`, legendX + 22, legendY);
        
        // Peso correspondiente debajo de la categoría
        ctx.fillStyle = "#4a5568";
        ctx.font = "bold 15px monospace";  
        let kgCatFormateado = typeof fmt === 'function' ? fmt(Math.round(kgCat)) : Math.round(kgCat);
        ctx.fillText(`${kgCatFormateado} kg`, legendX + 22, legendY + 15);

        legendY += 45;
    }
}

// ====================================================================
// 🔔 17. NOTIFICACIONES FLOTANTES VISUALES (TOASTS)
// ====================================================================

/**
 * Despliega notificaciones dinámicas tipo Toast no intrusivas en la pantalla.
 * 
 * @param {string} msg - Texto del mensaje.
 * @param {string} tipo - Tipo de notificación ('success', 'error', 'warning', 'info').
 */
function notificar(msg, tipo = "info") {
    const colores = {
        success: "#38a169",
        error: "#e53e3e",
        warning: "#d69e2e",
        info: "#2b6cb0"
    };

    let n = document.createElement("div");
    n.innerText = msg;

    n.style = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${colores[tipo] || colores.info};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        z-index: 9999;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
    `;

    document.body.appendChild(n);

    // Activación suave mediante transiciones CSS
    setTimeout(() => {
        n.style.opacity = "1";
        n.style.transform = "translateY(0)";
    }, 10);

    // Remoción controlada tras 3 segundos de lectura
    setTimeout(() => {
        n.style.opacity = "0";
        n.style.transform = "translateY(20px)";
        setTimeout(() => n.remove(), 300);
    }, 3000);
}

// ====================================================================
// ⏱️ 18. ALGORITMO FIFO PREVENTIVO (CÁLCULO DE DIFERENCIA DE TIEMPO)
// ====================================================================

/**
 * Analiza la vigencia logística de un lote (PP) evaluando su antigüedad.
 * Marca alerta si el lote tiene 5 o más meses de almacenamiento.
 * 
 * @param {string} codigoPP - Código de lote (ej: "PP-03-24").
 * @returns {Object} Objeto indicando el estado de alerta y la diferencia en meses { alerta, meses }.
 */
function verificarAlertaFIFO(codigoPP) {
    // Omite de manera segura strings nulos, etiquetas vacías o excepciones definidas
    if (!codigoPP || typeof codigoPP !== 'string' || codigoPP.toLowerCase().includes("vacío") || codigoPP.includes("00-00-26")) {
        return { alerta: false, meses: 0 };
    }

    // Limpieza de caracteres no numéricos
    let ppLimpia = codigoPP.replace(/[^0-9]/g, "");

    // Un lote válido de producción debe contener mes y año codificados (mínimo 6 dígitos)
    if (ppLimpia.length < 6) {
        return { alerta: false, meses: 0 };
    }

    // Extracción segura del mes (dígitos 2 y 3) y año (dígitos 4 y 5)
    let mesProd = parseInt(ppLimpia.substring(2, 4), 10);
    let anioProd = parseInt("20" + ppLimpia.substring(4, 6), 10);

    if (isNaN(mesProd) || isNaN(anioProd) || mesProd < 1 || mesProd > 12) {
        return { alerta: false, meses: 0 };
    }

    let fechaActual = new Date();
    let mesActual = fechaActual.getMonth() + 1;
    let anioActual = fechaActual.getFullYear();

    // Cálculo absoluto de meses transcurridos
    let diferenciaMeses = ((anioActual - anioProd) * 12) + (mesActual - mesProd);

    // Establecemos la advertencia si supera el umbral de los 5 meses
    if (diferenciaMeses >= 5) {
        return { alerta: true, meses: diferenciaMeses };
    }

    return { alerta: false, meses: diferenciaMeses };
}

// ====================================================================
// ✍️ 19. MÁSCARA DINÁMICA DE ENTRADA (FORMATO PP)
// ====================================================================

/**
 * Formatea en tiempo real la entrada de texto del operador aplicando
 * la estructura de máscara 00-00-00 común en los lotes.
 * 
 * @param {HTMLInputElement} input - Elemento HTML input.
 * @param {boolean} esBusqueda - Flag que determina si se dispara una búsqueda directa.
 */
function formatearMascara(input, esBusqueda = false) {
    if (!input) return;
    let valor = input.value.replace(/\D/g, '');
    
    if (valor.length > 2 && valor.length <= 4) {
        valor = valor.slice(0, 2) + '-' + valor.slice(2);
    } else if (valor.length > 4) {
        valor = valor.slice(0, 2) + '-' + valor.slice(2, 4) + '-' + valor.slice(4, 6);
    }
    
    input.value = valor;
    
    // Sugerencia proactiva si se completa el patrón del lote (8 caracteres ej. 00-00-00)
    if (input.id === 'mov_pp' && valor.length === 8) {
        if (typeof sugerirDatosPorPP === 'function') {
            sugerirDatosPorPP(valor);
        }
    }
    
    if (esBusqueda && typeof buscar === 'function') {
        buscar(); 
    }
}

// ====================================================================================
// 🔍 20. BUSCADOR INTERACTIVO Y RESALTADO DE TARJETAS (CON SOPORTE HISTÓRICO / MAESTRO)
// ====================================================================================
function buscar() {
    const inputBusqueda = document.getElementById('busqueda');
    if (!inputBusqueda) return;
    
    let q = inputBusqueda.value.trim();
    let resContenedor = document.getElementById('res_busqueda');
    let todasLasCards = document.querySelectorAll('.card-ubi'); 
    
    if (!q) { 
        if (resContenedor) resContenedor.innerText = "Esperando búsqueda..."; 
        todasLasCards.forEach(c => c.classList.remove('ubi-off', 'ubi-highlight'));
        return; 
    }
    
    let resultadosHTML = "";
    let encontrado = false;
    let totalKg = 0;

    // 1. Búsqueda proactiva en el maestro de productos para rescatar metadatos del material
    let infoMaestro = (typeof maestroProductos !== 'undefined' ? maestroProductos[q] : null) 
                   || (window.maestroProductos ? window.maestroProductos[q] : null);

    if (infoMaestro) {
        resultadosHTML += `
            <div style="background: #f7fafc; padding: 8px 12px; border-radius: 6px; border-left: 4px solid #2b6cb0; margin-bottom: 10px; font-family: sans-serif; font-size: 13px; color: #2d3748; line-height: 1.4;">
                📦 <b>Material:</b> [${infoMaestro.codigo}] ${infoMaestro.nombre}
            </div>`;
    }

    // 2. Recorrido de la base de datos de stock activo para ubicar casilleros coincidentes
    if (typeof db !== 'undefined') {
        for (let ubi in db) {
            if (db[ubi] && db[ubi][q]) {
                encontrado = true;
                let kilos = db[ubi][q].kg;
                totalKg += kilos;
                let kilosFormateados = typeof fmt === 'function' ? fmt(kilos) : kilos;
                resultadosHTML += `
                    <div style="padding: 2px 0; font-family: monospace; font-size: 13px;">
                        📍 <b>${ubi}</b>: ${kilosFormateados} kg
                    </div>`;
            }
        }
    }

    // 3. Aplicación de clases CSS de realce en el layout visual de tarjetas
    todasLasCards.forEach(card => {
        let idUbi = card.dataset.id; 

        if (typeof db !== 'undefined' && db[idUbi] && db[idUbi][q]) {
            card.classList.remove('ubi-off');
            card.classList.add('ubi-highlight'); 
        } else {
            card.classList.add('ubi-off'); 
            card.classList.remove('ubi-highlight');
        }
    });
    
    // 4. Renderización de resultados según los datos encontrados
    if (resContenedor) {
        if (encontrado) {
            // Caso A: Se encontró stock en uno o más casilleros
            if (!infoMaestro) {
                resultadosHTML = `
                    <div style="background: #fffaf0; padding: 6px 12px; border-radius: 6px; border-left: 4px solid #dd6b20; margin-bottom: 10px; font-family: sans-serif; font-size: 13px; color: #dd6b20;">
                        ⚠️ PP sin registro en el maestro de productos.
                    </div>` + resultadosHTML;
            }

            let totalFormateado = typeof fmt === 'function' ? fmt(totalKg) : totalKg;
            resultadosHTML += `
                <div style="border-top: 2px solid #333; margin-top: 8px; padding-top: 5px; font-family: monospace; font-size: 14px; font-weight: bold; color: #d32f2f;">
                    TOTAL GENERAL: ${totalFormateado} kg
                </div>`;
            resContenedor.innerHTML = resultadosHTML;

        } else if (infoMaestro) {
            // Caso B: No hay stock activo en casilleros, pero SI existe en el maestro de productos
            resultadosHTML += `
                <div style="background: #ebf8ff; padding: 6px 12px; border-radius: 6px; border-left: 4px solid #3182ce; margin-bottom: 8px; font-family: sans-serif; font-size: 12px; color: #2c5282;">
                    ℹ️ Sin stock activo en ubicaciones.
                </div>
                <div style="border-top: 2px solid #333; margin-top: 8px; padding-top: 5px; font-family: monospace; font-size: 14px; font-weight: bold; color: #d32f2f;">
                    TOTAL GENERAL: 0 kg
                </div>`;
            resContenedor.innerHTML = resultadosHTML;

        } else {
            // Caso C: No tiene stock ni tampoco existe en el maestro
            resContenedor.innerText = "No encontrado";
        }
    }
}

// ====================================================================
// 📱 21. SELECTOR MENU DROPDOWN
// ====================================================================
function toggleMenu() {
    let menu = document.getElementById("menuDropdown");
    if (menu) menu.classList.toggle("show");
}

document.addEventListener("click", function(e) {
    const menu = document.getElementById("menuDropdown");
    const btn = document.querySelector(".menu-opciones button");

    if (!menu || !btn) return;

    if (!menu.contains(e.target) && !btn.contains(e.target)) {
        menu.classList.remove("show");
    }
});

// ====================================================================
// ↩️ 22. DESHACER MOVIMIENTO (SINK AUTOMÁTICO EN CLOUD FIREBASE)
// ====================================================================
function deshacer() {
    // 1. Verificamos si existen registros en el historial
    if (typeof logs === 'undefined' || logs.length === 0) {
        return alert("No hay movimientos para deshacer");
    }

    // 2. Extraemos los datos del último movimiento para mostrárelos al usuario
    const ultimoLog = logs[0]; 
    const { tipo, pp, kg, ubi } = ultimoLog;

    // 3. Solicitamos confirmación explícita al operador antes de proceder
    const mensajeConfirmacion = `¿Estás seguro de deshacer el último movimiento?\n\n` +
                                `• Tipo: ${tipo.toUpperCase()}\n` +
                                `• Material: ${pp}\n` +
                                `• Cantidad: ${kg} kg\n` +
                                `• Ubicación: ${ubi}`;

    const usuarioConfirma = confirm(mensajeConfirmacion);

    // Si el usuario presiona "Cancelar", cancelamos la función sin alterar los datos
    if (!usuarioConfirma) {
        return; 
    }

    const pesos = typeof pesosValidos !== 'undefined' ? pesosValidos : [1000];

    // Reversión matemática de stock y bultos según tipo de acción
    if (tipo === 'ingreso') {
        if (db[ubi] && db[ubi][pp]) {
            let ratio = db[ubi][pp].bultos / db[ubi][pp].kg;
            db[ubi][pp].kg -= kg;
            db[ubi][pp].bultos -= (kg * ratio);
            
            if (db[ubi][pp].kg <= 0.1) delete db[ubi][pp];
        }
    } else if (tipo === 'salida') {
        if (!db[ubi]) db[ubi] = {};
        if (!db[ubi][pp]) db[ubi][pp] = { kg: 0, bultos: 0 };
        
        let pesoBulto = pesos.find(p => Math.abs((kg / p) - Math.round(kg / p)) < 0.01) || 1000;
        
        db[ubi][pp].kg += kg;
        db[ubi][pp].bultos += (kg / pesoBulto);
    } else if (tipo === 'transferencia') {
        let partes = ubi.split(" ➡️ ");
        let origOriginal = partes[0];
        let destOriginal = partes[1];

        if (db[destOriginal] && db[destOriginal][pp]) {
            let ratioDest = db[destOriginal][pp].bultos / db[destOriginal][pp].kg;
            let bultosRevertir = kg * ratioDest;
            db[destOriginal][pp].kg -= kg;
            db[destOriginal][pp].bultos -= bultosRevertir;
            if (db[destOriginal][pp].kg <= 0.1) delete db[destOriginal][pp];
            if (Object.keys(db[destOriginal]).length === 0) delete db[destOriginal];
        }
        if (!db[origOriginal]) db[origOriginal] = {};
        if (!db[origOriginal][pp]) db[origOriginal][pp] = { kg: 0, bultos: 0 };
        let pesoBulto = pesos.find(p => Math.abs((kg / p) - Math.round(kg / p)) < 0.01) || 1000;
        db[origOriginal][pp].kg += kg;
        db[origOriginal][pp].bultos += (kg / pesoBulto);
    }

    // 4. Quitamos del historial local en memoria
    logs.shift(); 

    // 5. Transmisión de datos actualizados directamente a la nube en Firebase
    if (typeof dbRef !== 'undefined' && dbRef.set) {
        dbRef.set({
            inventario: db,
            historial: logs
        }).then(() => {
            console.log("Nube actualizada tras deshacer movimiento.");
            if (typeof render === 'function') render(); 
            alert(`Se ha deshecho el último ${tipo}: ${pp} en ${ubi}`);
        }).catch((error) => {
            console.error("Error al synchronizar con la nube:", error);
            alert("Error al intentar deshacer en la nube de Firebase: " + error.message);
        });
    } else {
        if (typeof render === 'function') render();
        alert(`Se deshizo localmente (sin conexión): ${tipo}: ${pp} en ${ubi}`);
    }
}

// ====================================================================
// 📊 23. EXPORTACIÓN A EXCEL DATA PLANA
// ====================================================================
function exportarExcel() {
    if (typeof db === 'undefined') return alert("Error: Base de datos no inicializada.");
    let datosExcel = [];
    
    for (let ubi in db) {
        for (let pp in db[ubi]) {
            datosExcel.push({
                "Ubicación": ubi,
                "PP": pp,
                "Kilos": db[ubi][pp].kg,
                "Bultos": Math.round(db[ubi][pp].bultos),
                "Bodega": (ubi.startsWith('A') || ubi.startsWith('B') || ubi.startsWith('C')) ? 'Principal' : 'Adoquines'
            });
        }
    }

    if (datosExcel.length === 0) return alert("No hay stock para exportar");
    if (typeof XLSX === 'undefined') return alert("La librería de Excel (SheetJS) no está cargada.");

    const hoja = XLSX.utils.json_to_sheet(datosExcel);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Stock_Bodega");

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(libro, `Stock_Bodega_${fecha}.xlsx`);
    
    const inpBusqueda = document.getElementById('busqueda');
    if (inpBusqueda) inpBusqueda.value = "";
}

// ====================================================================
// 💾 24. RESPALDOS LOGÍSTICOS MANUALES Y AUTOMÁTICOS
// ====================================================================
function crearBackup() {
    if (typeof db === 'undefined' || typeof logs === 'undefined') return;
    
    const backup = {
        db: db,
        logs: logs,
        fecha: new Date().toISOString(),
        version: "0.9"
    };
    
    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Bodega_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    
    if (typeof notificar === 'function') {
        notificar("Backup descargado correctamente", "success");
    }
}

function restaurarBackup(archivo) {
    if (!archivo) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);

            if (backup.db && backup.logs) {
                if (confirm("⚠️ ¿Estás completamente seguro de sobreescribir la bodega actual con esta copia de seguridad?\n\nEsto cambiará los datos en tiempo real para todos los operarios conectados.")) {
                    
                    db = backup.db;
                    logs = backup.logs;

                    if (typeof dbRef !== 'undefined' && dbRef.set) {
                        dbRef.set({
                            inventario: db,  
                            historial: logs  
                        }).then(() => {
                            if (typeof render === 'function') render();
                            if (typeof notificar === 'function') {
                                notificar("🎉 Backup restaurado y sincronizado en la nube con éxito", "success");
                            }
                        }).catch((error) => {
                            if (typeof notificar === 'function') {
                                notificar("Error al subir el backup a Firebase: " + error.message, "error");
                            }
                        });
                    } else {
                        if (typeof render === 'function') render();
                        if (typeof notificar === 'function') {
                            notificar("Backup aplicado localmente (Sin conexión a Firebase)", "warning");
                        }
                    }
                }
            } else {
                if (typeof notificar === 'function') notificar("Backup incompleto o con formato incorrecto", "error");
            }
        } catch (err) {
            if (typeof notificar === 'function') notificar("Archivo JSON inválido o corrupto", "error");
        }
    };
    reader.readAsText(archivo);
}

function autoBackup() {
    if (typeof db === 'undefined' || typeof logs === 'undefined') return;
    
    const backup = {
        db: db,
        logs: logs,
        fecha: new Date().toISOString()
    };

    let backups = JSON.parse(localStorage.getItem("bodega_backups")) || [];
    backups.unshift(backup); 

    if (backups.length > 10) {
        backups = backups.slice(0, 10);
    }

    localStorage.setItem("bodega_backups", JSON.stringify(backups));
    console.log("💾 Auto-backup guardado");
}

// Inicialización de la pantalla
if (typeof verificarAcceso === 'function') verificarAcceso(); 
if (typeof render === 'function') render();          

// ====================================================================================
// 🚀 25. MÓDULO LOGÍSTICO INTERCONECTADO Y DETECTOR DE DATOS ASOCIADOS
// ====================================================================================
let bultoSeleccionadoMovimiento = null;

function sugerirDatosPorPP(ppABuscar) {
    let encontrado = false;
    if (window.datosContablesActuales) {
        for (let cod in window.datosContablesActuales) {
            let item = window.datosContablesActuales[cod];
            if (Array.isArray(item.desgloses)) {
                let tienePP = item.desgloses.some(d => d.pp === ppABuscar);
                if (tienePP) {
                    if (typeof notificar === 'function') {
                        notificar(`Asociado a Código: ${cod} (${item.nombre})`, "info");
                    }
                    encontrado = true;
                    break;
                }
            }
        }
    }
    if (!encontrado && typeof db !== 'undefined') {
        for (let ubi in db) {
            if (db[ubi] && db[ubi][ppABuscar]) {
                console.log(`PP detectado previamente en ubicación: ${ubi}`);
                break;
            }
        }
    }
}

function abrirModalMovimiento() {
    const elPP = document.getElementById('mov_pp');
    const elKg = document.getElementById('mov_kg');
    if (elPP) elPP.value = '';
    if (elKg) elKg.value = '';
    
    bultoSeleccionadoMovimiento = null;
    const pesos = typeof pesosValidos !== 'undefined' ? pesosValidos : [1000];
    
    const selectBulto = document.getElementById('bultos_movimiento');
    if (selectBulto) {
        selectBulto.innerHTML = '<option value="">Seleccione bulto</option>';
        pesos.forEach(p => {
            selectBulto.innerHTML += `<option value="${p}">${p} kg</option>`;
        });
        selectBulto.onchange = function() {
            bultoSeleccionadoMovimiento = this.value ? parseFloat(this.value) : null;
        };
    }

    const selectOrigen = document.getElementById('mov_origen');
    const selectDestino = document.getElementById('mov_destino');
    
    if (selectOrigen && selectDestino) {
        let ubisPrin = [];
        if (typeof layoutPrin !== 'undefined' && Array.isArray(layoutPrin)) {
            layoutPrin.forEach(item => { if (Array.isArray(item)) ubisPrin.push(item[0]); });
        }
        ubisPrin.sort();

        let ubisAdo = [];
        if (typeof layoutAdo !== 'undefined' && Array.isArray(layoutAdo)) {
            layoutAdo.forEach(item => { if (Array.isArray(item)) ubisAdo.push(item[0]); });
        }
        ubisAdo.sort();

        let opcionesHTML = `<option value="">Seleccione</option>
            <optgroup label="BOD. PRINCIPAL">`;
        ubisPrin.forEach(id => { opcionesHTML += `<option value="${id}">${id}</option>`; });
        opcionesHTML += `</optgroup><optgroup label="BOD. ADOQUINES">`;
        ubisAdo.forEach(id => { opcionesHTML += `<option value="${id}">${id}</option>`; });
        opcionesHTML += `</optgroup>`;

        selectOrigen.innerHTML = opcionesHTML;
        selectDestino.innerHTML = opcionesHTML;
    }

    const modal = document.getElementById('modal-movimiento');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalMovimiento() {
    const modal = document.getElementById('modal-movimiento');
    if (modal) modal.style.display = 'none';
}

function autoSeleccionarBultoMovimiento() {
    let kgInput = document.getElementById("mov_kg");
    if (!kgInput) return;
    let kg = parseFloat(kgInput.value);
    if (!kg || kg <= 0) return;

    const pesos = typeof pesosValidos !== 'undefined' ? pesosValidos : [1000];
    let encontrado = null;
    for (let p of pesos) {
        let division = kg / p;
        if (Math.abs(division - Math.round(division)) < 0.01) {
            encontrado = p;
            break;
        }
    }
    if (!encontrado) return;

    bultoSeleccionadoMovimiento = encontrado;
    let selectContainer = document.getElementById("bultos_movimiento");
    if (selectContainer) selectContainer.value = encontrado;
}

function ejecutarMovimientoInterno() {
    let ppInput = document.getElementById('mov_pp');
    if (!ppInput) return;
    let pp = ppInput.value.trim();
    
    let kgEl = document.getElementById('mov_kg');
    let kg = kgEl ? parseFloat(kgEl.value) : NaN;
    
    let origenEl = document.getElementById('mov_origen');
    let destinoEl = document.getElementById('mov_destino');
    let origen = origenEl ? origenEl.value : "";
    let destino = destinoEl ? destinoEl.value : "";

    const formatoPP = /^\d{2}-\d{2}-\d{2}$/;
    if (!formatoPP.test(pp)) {
        if (typeof notificar === 'function') notificar("Formato de PP incorrecto (00-00-00)", "error");
        ppInput.focus();
        return;
    }
    if (!pp || isNaN(kg) || kg <= 0 || !origen || !destino) {
        if (typeof notificar === 'function') notificar("Datos incompletos para el traspaso", "error");
        return;
    }
    if (origen === destino) {
        if (typeof notificar === 'function') notificar("El origen y el destino no pueden ser iguales", "error");
        return;
    }
    if (!bultoSeleccionadoMovimiento) {
        if (typeof notificar === 'function') notificar("Selecciona un tipo de bulto", "warning");
        return;
    }

    let bultosTraspaso = kg / bultoSeleccionadoMovimiento;

    if (!db[origen] || !db[origen][pp] || db[origen][pp].kg < kg) {
        if (typeof notificar === 'function') notificar(`No hay stock suficiente en ${origen}`, "error");
        return;
    }

    // Validación de límites de capacidad del destino
    let ubiData = null;
    if (typeof layoutPrin !== 'undefined' && Array.isArray(layoutPrin)) {
        ubiData = layoutPrin.find(item => Array.isArray(item) && item[0] === destino);
    }
    if (!ubiData && typeof layoutAdo !== 'undefined' && Array.isArray(layoutAdo)) {
        ubiData = layoutAdo.find(item => Array.isArray(item) && item[0] === destino);
    }
    let capMax = ubiData ? ubiData[1] : 0;

    let bultosActualesDestino = 0;
    if (db[destino]) {
        for (let p in db[destino]) {
            bultosActualesDestino += db[destino][p].bultos;
        }
    }

    if (bultosActualesDestino + bultosTraspaso > capMax) {
        alert(`¡ERROR! Espacio insuficiente en destino ${destino}.\nCapacidad máxima: ${capMax}\nEspacio ocupado: ${Math.round(bultosActualesDestino)}\nIntenta ingresar: ${Math.round(bultosTraspaso)}`);
        return;
    }

    // Efectuar el traspaso matemático en local
    let ratioOrigen = db[origen][pp].bultos / db[origen][pp].kg;
    db[origen][pp].kg -= kg;
    db[origen][pp].bultos -= (kg * ratioOrigen);
    if (db[origen][pp].kg <= 0) delete db[origen][pp];
    if (db[origen] && Object.keys(db[origen]).length === 0) delete db[origen];

    if (!db[destino]) db[destino] = {};
    if (!db[destino][pp]) db[destino][pp] = { kg: 0, bultos: 0 };
    db[destino][pp].kg += kg;
    db[destino][pp].bultos += bultosTraspaso;

    // Registramos en el historial
    if (typeof logs !== 'undefined') {
        logs.unshift({ 
            tipo: "transferencia", 
            pp, 
            kg, 
            ubi: `${origen} ➡️ ${destino}`, 
            fecha: new Date().toLocaleString() 
        });
    }

    // Generamos un auto-backup local preventivo
    autoBackup();

    // 🔥 FIJAR EN LA NUBE (FIREBASE): Sincronización en tiempo real
    if (typeof dbRef !== 'undefined' && dbRef.set) {
        dbRef.set({
            inventario: db,
            historial: logs
        }).then(() => {
            console.log("Nube actualizada tras movimiento interno exitoso.");
            cerrarModalMovimiento();
            if (typeof render === 'function') render();
            if (typeof notificar === 'function') {
                notificar(`Traspaso exitoso: PP ${pp} de ${origen} a ${destino}`, "success");
            }
        }).catch((error) => {
            console.error("Error al sincronizar movimiento con Firebase:", error);
            if (typeof notificar === 'function') {
                notificar("Error al guardar transferencia en la nube: " + error.message, "error");
            }
        });
    } else {
        // Fallback si no está conectada la base de datos remota
        cerrarModalMovimiento();
        if (typeof render === 'function') render();
        if (typeof notificar === 'function') {
            notificar("Traspaso aplicado (Solo localmente - sin conexión)", "warning");
        }
    }
}

// ====================================================================
// 🔥 26. SINCRONIZACIÓN EXCLUSIVA CON FIREBASE (FINAL DE MOVIMIENTO)
// ====================================================================

// Función auxiliar para procesar el término de un movimiento e interactuar con Firebase
function finalizarSincronizacionMovimiento(pp, origen, destino) {
    if (typeof dbRef !== 'undefined' && dbRef.set) {
        dbRef.set({
            inventario: db,
            historial: logs
        }).then(() => {
            console.log("Sincronización Inter-Bodegas exitosa.");
            if (typeof notificar === 'function') notificar(`TRASPASO OK: ${pp} movido de ${origen} a ${destino}`, "success");
            if (typeof render === 'function') render();
            if (typeof cerrarModalMovimiento === 'function') cerrarModalMovimiento();
        }).catch((error) => {
            console.error("Error en sincronización (Firebase reintentará en segundo plano):", error);
            if (typeof notificar === 'function') notificar("Traspaso guardado localmente (Esperando conexión para subir a la nube)", "warning");
            if (typeof render === 'function') render();
            if (typeof cerrarModalMovimiento === 'function') cerrarModalMovimiento();
        });
    } else {
        if (typeof notificar === 'function') notificar(`TRASPASO LOCAL OK: ${pp} movido de ${origen} a ${destino}`, "success");
        if (typeof render === 'function') render();
        if (typeof cerrarModalMovimiento === 'function') cerrarModalMovimiento();
    }
}

// Bucle en segundo plano para respaldar cada 5 minutos de forma segura
if (typeof autoBackup === 'function') {
    setInterval(autoBackup, 300000); 
}

// Variable de control para el uso del micrófono (Evita fallos de referencia)
if (typeof window.fuePorVoz === 'undefined') {
    window.fuePorVoz = false;
}

// ====================================================================
// 🧠 CONTROLADOR CENTRALIZADO DE INTERFAZ (CARGA ÚNICA DOM)
// ====================================================================
document.addEventListener("DOMContentLoaded", () => {
    
    // 1️⃣ Formateador de máscara para el input de PP en el modal de movimientos
    const inputMovPP = document.getElementById('mov_pp');
    if (inputMovPP) {
        inputMovPP.addEventListener('input', function() {
            if (typeof formatearMascara === 'function') {
                formatearMascara(this, false); 
            }
        });
    }

    // 2️⃣ Controlador de clics en el Layout Visual (Tarjetas de Ubicación)
    document.addEventListener("click", (e) => {
        const tarjeta = e.target.closest(".card-ubi");
        if (!tarjeta) return;

        e.stopPropagation();

        // Obtener el identificador único de la ubicación
        let id = tarjeta.id || tarjeta.getAttribute('data-id') || tarjeta.getAttribute('data-ubi');
        if (!id) {
            let matchTexto = (tarjeta.innerText || "").match(/^([A-Z]\d{1,2})/);
            id = matchTexto ? matchTexto[1] : null;
        }
        if (!id) return; 

        let cap = tarjeta.getAttribute('data-cap') || 0;

        // Capturar color real renderizado por CSS
        let colorBloque = window.getComputedStyle(tarjeta).backgroundColor || "#f4f7fc";
        let modalSemaforo = document.getElementById('modal-semaforo-movil');
        let contenidoClonado = document.getElementById('contenido-semaforo-clonado');
        
        if (modalSemaforo && contenidoClonado) {
            let infoUbicacion = (typeof db !== 'undefined') ? db[id] : null;
            let htmlDetalle = "";

            let colorTextoCabecera = "#1a202c"; 
            let colorSubtexto = "#4a5568";      

            // Clasificación de color del semáforo (Borde dinámico)
            let colorBordeFuerte = "#cbd5e0"; 
            let clasesTarjeta = tarjeta.className.toLowerCase();

            // Evaluación por clases CSS
            if (clasesTarjeta.includes('rojo') || clasesTarjeta.includes('danger') || clasesTarjeta.includes('red')) {
                colorBordeFuerte = "#dc2626"; 
            } else if (clasesTarjeta.includes('amarillo') || clasesTarjeta.includes('warning') || clasesTarjeta.includes('yellow')) {
                colorBordeFuerte = "#d97706"; 
            } else if (clasesTarjeta.includes('verde') || clasesTarjeta.includes('success') || clasesTarjeta.includes('green')) {
                colorBordeFuerte = "#16a34a"; 
            } 
            // Evaluación matemática de componentes RGB alternativo
            else {
                let rgbValores = colorBloque.match(/\d+/g);
                if (rgbValores && rgbValores.length >= 3) {
                    let r = parseInt(rgbValores[0]);
                    let g = parseInt(rgbValores[1]);
                    let b = parseInt(rgbValores[2]);

                    if (r > 180 && g > 150) {
                        colorBordeFuerte = "#d97706"; // Amarillo
                    } else if (r > 150 && g < 120) {
                        colorBordeFuerte = "#dc2626"; // Rojo
                    } else if (g > 120 && r < 150) {
                        colorBordeFuerte = "#16a34a"; // Verde
                    }
                }
            }

            // Construcción del encabezado de la ubicación
            htmlDetalle += `
                <div style="text-align: center; margin-bottom: 15px; background: ${colorBloque}; padding: 14px; border-radius: 6px; border: 3px solid ${colorBordeFuerte}; box-shadow: 0 4px 6px rgba(0,0,0,0.05); box-sizing: border-box;">
                    <span style="font-size: 18px; font-weight: 800; color: ${colorTextoCabecera}; text-shadow: 1px 1px 0px rgba(255,255,255,0.9), -1px -1px 0px rgba(255,255,255,0.9);">📍 UBICACIÓN: ${id.toUpperCase()}</span>
                    ${cap ? `<div style="font-size: 11px; color: ${colorSubtexto}; margin-top: 4px; font-weight: bold; text-shadow: 1px 1px 0px rgba(255,255,255,0.6);">Capacidad Máxima: ${cap} Bultos</div>` : ''}
                </div>`;

            // Construcción de tarjetas internas por lote almacenado
            if (infoUbicacion && Object.keys(infoUbicacion).length > 0) {
                for (let pp in infoUbicacion) {
                    let datosLote = infoUbicacion[pp];
                    let kgLote = datosLote.kg || 0;
                    let bultosLote = datosLote.bultos || 0;

                    let infoMaestro = (typeof maestroProductos !== 'undefined' ? maestroProductos[pp] : null)
                                   || (window.maestroProductos ? window.maestroProductos[pp] : null);
                    
                    let nombreMat = infoMaestro && infoMaestro.nombre ? infoMaestro.nombre : "PP sin registro en maestro";
                    let skuMat = infoMaestro && infoMaestro.codigo ? `[${infoMaestro.codigo}]` : "";

                    let kgPrint = typeof fmt === 'function' ? fmt(kgLote) : kgLote.toLocaleString();

                    htmlDetalle += `
                        <div style="background: #ffffff; border: 1px solid #edf2f7; padding: 12px; border-radius: 6px; margin-bottom: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.03); text-align: left; border-left: 3px solid ${colorBordeFuerte};">
                            <div style="font-size: 15px; font-weight: bold; color: #2d3748; margin-bottom: 4px;"> PP ${pp}</div>
                            <div style="font-size: 12px; color: #4a5568; line-height: 1.4; margin-bottom: 8px;"> ${nombreMat} <span style="font-family: monospace; font-weight: bold; color: #718096;">${skuMat}</span></div>
                            <div style="display: flex; justify-content: space-between; border-top: 1px dashed #edf2f7; padding-top: 8px; font-size: 15px;">
                                <span>Kilos: <b style="color: #2b6cb0;">${kgPrint} kg</b></span>
                                <span>Bultos: <b style="color: #38a169;">${Math.round(bultosLote)} un.</b></span>
                            </div>
                        </div>`;
                }
            } else {
                htmlDetalle += `
                    <div style="text-align: center; padding: 35px 10px; color: #a0aec0;">
                        <div style="font-size: 36px; margin-bottom: 5px;">💨</div>
                        <div style="font-size: 13px; font-weight: bold; color: #718096;">Ubicación libre</div>
                        <div style="font-size: 12px;">No registra stock.</div>
                    </div>`;
            }

            // Inyectar y activar animaciones CSS de entrada
            contenidoClonado.innerHTML = htmlDetalle;
            modalSemaforo.classList.remove('modal-fade-in');
            contenidoClonado.classList.remove('modal-slide-up');

            void modalSemaforo.offsetWidth; // Disparar reflow

            modalSemaforo.classList.add('modal-fade-in');
            contenidoClonado.classList.add('modal-slide-up');
            modalSemaforo.style.display = 'flex';
        }
    });

// 3️⃣ Controlador de la Ventana de Chat del Asistente Virtual (Corregido para voz)
    const btnChat = document.getElementById('btn-chat-asistente');
    const ventanaChat = document.getElementById('ventana-chat-asistente');
    const btnCerrar = document.getElementById('btn-cerrar-chat');
    const btnEnviar = document.getElementById('btn-enviar-chat');
    const inputChat = document.getElementById('input-mensaje-chat');
    const cuerpoMensajes = document.getElementById('cuerpo-mensajes-chat');

    if (btnChat) {
        btnChat.style.setProperty('bottom', '60px', 'important');
        btnChat.addEventListener('click', () => {
            if (ventanaChat) {
                ventanaChat.style.display = ventanaChat.style.display === 'none' ? 'flex' : 'none';
            }
        });
    }

    if (ventanaChat) {
        ventanaChat.style.setProperty('bottom', '130px', 'important');
    }

    if (btnCerrar && ventanaChat) {
        btnCerrar.addEventListener('click', () => { ventanaChat.style.display = 'none'; });
    }

    // Función de envío de mensajes procesada
    function procesarEnvioUsuario() {
        if (!inputChat || !cuerpoMensajes) return;
        let texto = inputChat.value.trim();
        if (!texto) return;

        // ✅ REGLA DE SEGURIDAD PARA VOZ:
        // Solo cambiamos fuePorVoz a false si el usuario REALMENTE escribió usando el teclado.
        // Si el estado "fuePorVoz" ya estaba en true por el micrófono, preservamos el valor.
        if (document.activeElement === inputChat && !fuePorVoz) {
            fuePorVoz = false;
        }

        agregarMensajeChat(texto, 'usuario');
        inputChat.value = "";

        setTimeout(() => {
            let respuesta = analizarConsultaBodega(texto);
            agregarMensajeChat(respuesta, 'asistente');
            
            // ✅ EJECUCIÓN DIRECTA:
            // Verificamos tanto la variable global "fuePorVoz" local como la montada en window.
            if (fuePorVoz || window.fuePorVoz) {
                if (typeof asistenteHablar === 'function') {
                    asistenteHablar(respuesta); 
                }
                // Limpiamos los flags de control tras finalizar la lectura
                fuePorVoz = false; 
                window.fuePorVoz = false;
            }
        }, 1300);
    }

    if (btnEnviar) {
        btnEnviar.addEventListener('click', procesarEnvioUsuario);
    }
    if (inputChat) {
        inputChat.addEventListener('keypress', (e) => { 
            if (e.key === 'Enter') {
                // Al presionar Enter explícitamente con teclado, anulamos bandera de voz
                fuePorVoz = false;
                window.fuePorVoz = false;
                procesarEnvioUsuario(); 
            }
        });
    }

    function agregarMensajeChat(texto, emisor) {
        if (!cuerpoMensajes) return;
        let msgDiv = document.createElement('div');
        if (emisor === 'usuario') {
            msgDiv.style.cssText = "background: #e2e8f0; color: #2d3748; padding: 8px 12px; border-radius: 8px; align-self: flex-end; max-width: 85%; word-break: break-word;";
        } else {
            msgDiv.style.cssText = "background: #ebf8ff; color: #2b6cb0; padding: 8px 12px; border-radius: 8px; align-self: flex-start; max-width: 85%; word-break: break-word;";
        }
        
        let textoProcesado = texto.replace(/\n/g, '<br>');
        textoProcesado = textoProcesado.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        msgDiv.innerHTML = textoProcesado;
        cuerpoMensajes.appendChild(msgDiv);
        cuerpoMensajes.scrollTop = cuerpoMensajes.scrollHeight; 
    }

    // Parser lógico de consulta
    function analizarConsultaBodega(consulta) {
        let q = consulta.toLowerCase();

        // 1. Stock total
        if (q.includes('stock total') || q.includes('cuanto hay en total') || q.includes('inventario total')) {
            let totalKg = 0;
            if (window.datosContablesActuales) {
                for (let cod in window.datosContablesActuales) {
                    if (Array.isArray(window.datosContablesActuales[cod].desgloses)) {
                        window.datosContablesActuales[cod].desgloses.forEach(d => totalKg += d.kg);
                    }
                }
            }
            let bodNombre = (typeof bodegaActual !== 'undefined' && bodegaActual === 'principal') ? 'BODEGA PRINCIPAL' : 'BODEGA ADOQUINES';
            return `El stock acumulado actual en la **${bodNombre}** es de **${totalKg.toLocaleString()} kg**.`;
        }

        // 2. Consulta por PP exacta
        let formatoPP = /(\d{2}-\d{2}-\d{2})/;
        let coincidenciaPP = consulta.match(formatoPP);

        if (coincidenciaPP) {
            let ppBuscado = coincidenciaPP[1];
            let infoMaestro = (typeof maestroProductos !== 'undefined' ? maestroProductos[ppBuscado] : null) 
                           || (window.maestroProductos ? window.maestroProductos[ppBuscado] : null);
                       
            let nombreProducto = infoMaestro && infoMaestro.nombre ? infoMaestro.nombre : "Producto no registrado en maestro";
            let codigoContable = infoMaestro && infoMaestro.codigo ? `[${infoMaestro.codigo}]` : "";

            let ubicacionesEncontradas = [];
            let subtotalKg = 0;
            let subtotalBultos = 0;
            let encontrado = false;

            if (typeof db !== 'undefined') {
                for (let ubi in db) {
                    if (db[ubi] && db[ubi][ppBuscado]) {
                        encontrado = true;
                        let datosLote = db[ubi][ppBuscado];
                        let kgLote = datosLote.kg || 0;
                        let bultosLote = datosLote.bultos || 0;

                        subtotalKg += kgLote;
                        subtotalBultos += bultosLote;

                        let kgFormateados = typeof fmt === 'function' ? fmt(kgLote) : kgLote.toLocaleString();
                        ubicacionesEncontradas.push(` 📍 **Ubicación ${ubi.toUpperCase()}** ➔ ${kgFormateados} kg (${Math.round(bultosLote)} bultos)`);
                    }
                }
            }

            let respuestaFinal = `📊 **Información General: PP ${ppBuscado}**\n`;
            respuestaFinal += `🏷️ **Material:** ${nombreProducto} ${codigoContable}\n`;
            
            if (encontrado) {
                respuestaFinal += `• **Total acumulado:** ${subtotalKg.toLocaleString()} kg (${Math.round(subtotalBultos)} bultos) en el inventario general.\n\n`;
                respuestaFinal += `🔍 **Ubicaciones donde se encuentra:**\n` + ubicacionesEncontradas.join('\n');
            } else {
                respuestaFinal += `💨 La **PP ${ppBuscado}** no registra stock actual en ninguna de las bodegas del sistema.`;
            }
            return respuestaFinal;
        }

        // 3. Diccionario de Alias de Materiales
        const aliasProductos = {
            "PTAB030315": ["chino", "saco chino", "sacos chinos", "borico chino"],
            "PTAB031110": ["sacas de 1200 gi", "sacas 1200 gi", "1200 gi", "sacas 1200 granular", "sacas 1200 kg gi"],
            "PTAB031010": ["sacas de 1100 gi", "sacas 1100 gi", "1100 gi", "sacas 1100 granular", "sacas 1100 kg gi"],
            "PTAB030610": ["sacas de 1000 gi", "sacas 1000 gi", "1000 gi", "sacas 1000 granular", "sacas 1000 kg gi"],
            "PTAB030310": ["saco etiquetado", "sacos verdes etiquetados", "sacos etiquetados"],
            "PTAB040310": ["saco polvo gi", "saco 25 kilos polvo", "polvo gi"],
            "PTAB158001": ["sacas de 2400 gi", "sacas 2400 gi", "2400 gi", "sacas 2400 sin logo", "sacas 2400 kilos gi sin logo"],
            "PTUL321001": ["sacas 1100 ulexita", "ulexita 1100 kilos", "saca 1100 kilos sin logo ulexita", "ulexita"],
            "PTAB101010": ["sacas 1100 rechazo polvo", "1100 polvo rechazo", "rechazo polvo", "rechazo caja manga", "caja manga rechazo", "caja manga"],
            "PTAB941010": ["sacas 1100 rechazo granular", "1100 granular rechazo", "rechazo granular", "rechazo sobremalla", "sobremalla rechazo", "sobremalla"],
            "PTAB030328": ["saco mcassab", "sacos mcassab", "mcassab", "macasa"],
            "PTGR210601": ["granulex 1000 kilos", "sacas de 1000 kilos granulex"],
            "PTGR211401": ["granulex 2000 libras", "sacas de 2000 lb granulex"],
            "PTGR210501": ["granulex 50 libras", "sacos de 50 lb granulex"],
            "PTAB150548": ["saco 50 libras borates plus", "saco borates plus", "sacos 50 libras borates plus", "sacos borates plus"],
            "PTAB170310": ["saco bajo en sulfato", "sacos bajo en sulfato"],
            "PTAB111111": ["sacas 1100 estandar", "saca 1100 estandar", "sacas 1100 kilos estandar", "saca 1100 kilos estandar"],
            "PTAB111110": ["sacas 1200 estandar", "saca 1200 estandar", "sacas 1200 kilos estandar", "saca 1200 kilos estandar"],
            "PTAB110602": ["sacas 1000 estandar", "saca 1000 estandar", "sacas 1000 kilos estandar", "saca 1000 kilos estandar"],

            "PTAB300610": ["sacas 1000 kilos calcinado", "sacas calcinado", "calcinado"]
        };

        let codigoObjetivo = null;

        for (let codigo in aliasProductos) {
            let coincide = aliasProductos[codigo].some(apodo => q.includes(apodo));
            if (coincide) {
                codigoObjetivo = codigo; 
                break;
            }
        }

        let nombreDisplay = "Material Solicitado";
        let activarBusqueda = false;

        if (codigoObjetivo) {
            activarBusqueda = true;
            if (window.datosContablesActuales && window.datosContablesActuales[codigoObjetivo]) {
                nombreDisplay = window.datosContablesActuales[codigoObjetivo].nombre;
            }
        } else if (q.includes('borico') || q.includes('acido') || q.includes('material') || q.includes('bórico')) {
            activarBusqueda = true;
            for (let cod in window.datosContablesActuales) {
                let nombreMat = window.datosContablesActuales[cod].nombre.toLowerCase();
                if (nombreMat.includes('borico') || nombreMat.includes('ácido') || nombreMat.includes('acido')) {
                    nombreDisplay = window.datosContablesActuales[cod].nombre;
                    codigoObjetivo = cod; 
                    break;
                }
            }
        }

        if (activarBusqueda) {
            let respuesta = "";
            let encontrado = false;
            let codigoDisplay = codigoObjetivo || "N/A";
            let subtotal = 0;
            let lineasUbicaciones = [];

            if (typeof db !== 'undefined') {
                for (let ubi in db) {
                    for (let p_lote in db[ubi]) {
                        let maestroPP = (typeof maestroProductos !== 'undefined' ? maestroProductos[p_lote] : null)
                                     || (window.maestroProductos ? window.maestroProductos[p_lote] : null);
                        
                        if (maestroPP && maestroPP.codigo === codigoObjetivo) {
                            encontrado = true;
                            let kilos = db[ubi][p_lote].kg || 0;
                            subtotal += kilos;

                            let kilosFormateados = typeof fmt === 'function' ? fmt(kilos) : kilos.toLocaleString();
                            lineasUbicaciones.push(` 📍 **Ubicación ${ubi.toUpperCase()}** ➔ PP ${p_lote} (${kilosFormateados} kg)`);
                        }
                    }
                }
            }

            if (encontrado) {
                respuesta += `📊 **Resultados para: ${nombreDisplay} [${codigoDisplay}]**\n`;
                respuesta += `• Total acumulado: **${subtotal.toLocaleString()} kg** en el stock total.\n\n`;
                respuesta += `🔍 **Desglose de Ubicación por PP:**\n`;
                respuesta += lineasUbicaciones.join('\n') + '\n';
                return respuesta;
            } else {
                return `💨 No detecté stock disponible para el material "${codigoObjetivo || q}" en la bodega activa actual.`;
            }
        }

        if (q.includes('hola') || q.includes('buenos dias')) {
            return "¡Hola! Estoy listo para ayudarte con los datos de inventario. Dime qué material o PP quieres consultar.";
        }

        return "No entendí tu consulta. Prueba preguntándome por: 'stock total', el número de una 'PP' o cuanto hay de chino.";
    }
});

// ====================================================================================
// 📊 27. REPORTE EJECUTIVO FIFO CON REGLAS DE SEGURIDAD
// ====================================================================================
function verReporteFIFO() {
    let seccionFIFO = document.getElementById('seccion-reporte-fifo');
    if (seccionFIFO) {
        seccionFIFO.style.display = 'flex';
    }

    let tbody = document.getElementById('tbody-reporte-fifo');
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!db || Object.keys(db).length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 25px; color: #718096; font-size: 14px;">No hay datos de stock en el sistema.</td></tr>`;
        return;
    }

    let listaCriticos = [];

    for (let ubiId in db) {
        let contenidoUbi = db[ubiId];
        if (!contenidoUbi) continue;

        for (let pp in contenidoUbi) {
            let datosLote = contenidoUbi[pp];
            if (!datosLote || (datosLote.bultos <= 0 && datosLote.kg <= 0)) continue;

            if (typeof verificarAlertaFIFO === 'function') {
                let analisis = verificarAlertaFIFO(pp);

                if (analisis && analisis.alerta) {
                    let infoProd = (typeof maestroProductos !== 'undefined' && maestroProductos[pp]) 
                        ? maestroProductos[pp] 
                        : { codigo: "SIN-COD", nombre: "Producto No Registrado" };

                    listaCriticos.push({
                        codigoContable: infoProd.codigo || "SIN-COD",
                        ubicacion: ubiId,
                        pp: pp,
                        meses: analisis.meses,
                        cantidad: datosLote.kg 
                    });
                }
            }
        }
    }

    listaCriticos.sort((a, b) => a.codigoContable.localeCompare(b.codigoContable, undefined, { numeric: true, sensitivity: 'base' }));

    let contadorBadge = document.getElementById('contador-criticos-fifo');
    if (contadorBadge) contadorBadge.innerText = `${listaCriticos.length} Ítems`;

    if (listaCriticos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 25px; color: #38a169; font-weight: bold; font-size: 14px;">🎉 ¡Bodega Óptima! No hay productos retenidos por más de 5 meses.</td></tr>`;
        return;
    }

    listaCriticos.forEach(item => {
        let fila = document.createElement('tr');
        fila.style.borderBottom = "1px solid #edf2f7";
        fila.style.transition = "background 0.2s";
        fila.onmouseover = function() { this.style.background = "#f7fafc"; };
        fila.onmouseout = function() { this.style.background = "transparent"; };

        let kgFormateado = typeof fmt === 'function' ? fmt(item.cantidad) : item.cantidad.toLocaleString();

        fila.innerHTML = `
            <td style="padding: 10px 8px; font-family: monospace; font-weight: bold; color: #2b6cb0; font-size: 14px; word-break: break-all;">${item.codigoContable}</td>
            <td style="padding: 10px 4px; text-align: center; font-weight: bold; color: #4a5568;">
                <span class="badge-ubi" style="background: #e2e8f0; color: #4a5568; padding: 3px 6px; border-radius: 4px; font-size: 14px; display: inline-block;">
                    ${item.ubicacion}
                </span>
            </td>
            <td style="padding: 10px 4px; font-weight: bold; color: #4a5568; text-align: center; font-family: monospace;">${item.pp}</td>
            <td style="padding: 10px 4px; text-align: center;">
                <span class="badge-anti" style="background: #feebc8; color: #c05621; padding: 3px 6px; border-radius: 4px; font-weight: bold; font-size: 14px; display: inline-block;">
                    ${item.meses}M
                </span>
            </td>
            <td style="padding: 10px 8px; text-align: right; font-weight: bold; color: #2d3748; white-space: nowrap;">${kgFormateado} kg</td>
        `;
        tbody.appendChild(fila);
    });
}

// ====================================================================
// 🖨️ SISTEMA DE IMPRESIÓN DEL REPORTE FIFO CON TOTALIZADOR
// ====================================================================
function imprimirReporteFIFO() {
    const tablaContenido = document.getElementById('tbody-reporte-fifo');
    
    // Verificación de seguridad básica
    if (!tablaContenido || tablaContenido.innerHTML.includes('¡Bodega Óptima!') || tablaContenido.children.length === 0) {
        if (typeof notificar === 'function') {
            notificar("No hay datos críticos en el reporte FIFO para imprimir", "warning");
        } else {
            alert("No hay datos críticos en el reporte FIFO para imprimir.");
        }
        return;
    }

    // 🧮 ALGORITMO DE CÁLCULO DE TOTALES
    let sumaTotalKg = 0;
    const filas = tablaContenido.getElementsByTagName('tr');

    for (let i = 0; i < filas.length; i++) {
        const celdas = filas[i].getElementsByTagName('td');
        if (celdas.length >= 5) {
            // Extraemos el texto de la quinta celda (índice 4: Cantidad)
            let textoCantidad = celdas[4].innerText || celdas[4].textContent;
            
            // Limpieza de caracteres: removemos "kg", espacios y puntos de miles para poder operar numéricamente
            // Reemplazamos cualquier cosa que no sea número o coma decimal
            let numeroLimpio = textoCantidad.replace(/[^0-9,-]/g, '');
            
            // Si tu sistema usa comas para los decimales, las cambiamos temporalmente a puntos para Float
            numeroLimpio = numeroLimpio.replace(',', '.');
            
            let valorNumérico = parseFloat(numeroLimpio);
            if (!isNaN(valorNumérico)) {
                sumaTotalKg += valorNumérico;
            }
        }
    }

    // Formateamos el resultado de la suma final de forma legible
    let totalFormateado = typeof fmt === 'function' ? fmt(sumaTotalKg) : sumaTotalKg.toLocaleString('es-CL');

    // CONSTRUCCIÓN DEL DOCUMENTO DE IMPRESIÓN
    const ventanaImpresion = window.open('', '_blank');
    const fechaHoy = new Date().toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    ventanaImpresion.document.write(`
        <html>
        <head>
            <title>Reporte de Rotación FIFO</title>
            <style>
                body { font-family: sans-serif; color: #2d3748; padding: 30px; margin: 0; }
                .header { border-bottom: 3px solid #dd6b20; padding-bottom: 12px; margin-bottom: 20px; }
                .title { font-size: 22px; font-weight: bold; color: #2d3748; }
                .date { font-size: 12px; color: #718096; margin-top: 5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
                th { background-color: #f4f7fc; color: #4a5568; font-weight: bold; padding: 10px 8px; border: 1px solid #cbd5e0; text-align: left; }
                td { padding: 10px 8px; border: 1px solid #e2e8f0; }
                tr:nth-child(even) { background-color: #fcfcfc; }
                .fila-total { background-color: #edf2f7 !important; font-weight: bold; border-top: 2px solid #cbd5e0; border-bottom: 2px solid #cbd5e0; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">⚠️ ALERTA DE ROTACIÓN FIFO (+5 MESES)</div>
                <div class="date">Fecha de impresión: ${fechaHoy}</div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 26%;">Cód.</th>
                        <th style="width: 18%; text-align: center;">Ubi</th>
                        <th style="width: 18%; text-align: center;">PP</th>
                        <th style="width: 20%; text-align: center;">Antigüedad</th>
                        <th style="width: 18%; text-align: right;">Cant.</th>
                    </tr>
                </thead>
                <tbody>
                    ${tablaContenido.innerHTML}
                    <!-- Inyección de la fila del totalizador matemático -->
                    <tr class="fila-total">
                        <td colspan="4" style="padding: 12px 8px; text-align: right;">TOTAL CANTIDAD:</td>
                        <td style="padding: 12px 8px; text-align: right; white-space: nowrap;">${totalFormateado} kg</td>
                    </tr>
                </tbody>
            </table>
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

// Escuchador de eventos global para detectar el clic en el botón de impresión
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'btn-imprimir-fifo') {
        imprimirReporteFIFO();
    }
});

// ====================================================================
// 🏷️ GESTIÓN DEL MAESTRO DE PRODUCTOS (EDICIÓN Y ELIMINACIÓN)
// ====================================================================

/**
 * Abre el modal de administración del maestro de productos y renderiza la lista.
 */
function abrirModalGestionMaestro() {
    let modal = document.getElementById('modal-gestion-maestro');
    if (!modal) return;
    
    renderTablaGestionMaestro();
    modal.style.display = 'flex';
}

/**
 * Cierra el modal de administración del maestro.
 */
function cerrarModalGestionMaestro() {
    let modal = document.getElementById('modal-gestion-maestro');
    if (modal) modal.style.display = 'none';
}

/**
 * Renderiza dinámicamente las filas del maestro de productos registradas.
 */
function renderTablaGestionMaestro() {
    let tbody = document.getElementById('tbody-gestion-maestro');
    if (!tbody) return;
    
    tbody.innerHTML = "";

    if (typeof maestroProductos === 'undefined' || Object.keys(maestroProductos).length === 0) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#718096;'>No hay PP registradas en el maestro.</td></tr>";
        return;
    }

    // Ordenar las PP alfabéticamente
    let listaPP = Object.keys(maestroProductos).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    listaPP.forEach(pp => {
        let item = maestroProductos[pp];
        let fila = document.createElement('tr');
        fila.style.borderBottom = "1px solid #edf2f7";

        fila.innerHTML = `
            <td style="padding: 8px; font-weight: bold; font-family: monospace; color: #2b6cb0; white-space: nowrap;">${pp}</td>
            <td style="padding: 8px; font-family: monospace; font-weight: bold; white-space: nowrap;">${item.codigo || 'SIN-CODIGO'}</td>
            <td style="padding: 8px; color: #4a5568; font-size: 12px; line-height: 1.3;">${item.nombre || ''}</td>
            <td style="padding: 8px; text-align: center; white-space: nowrap;">
                <button onclick="editarRegistroMaestro('${pp}')" title="Editar asignación" style="background: #3182ce; color: white; border: none; padding: 5px 8px; border-radius: 4px; cursor: pointer; margin-right: 3px; font-size: 12px;">
                    ✏️ Editar
                </button>
                <button onclick="eliminarRegistroMaestro('${pp}')" title="Eliminar registro" style="background: #e53e3e; color: white; border: none; padding: 5px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    🗑️
                </button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

/**
 * Filtra las filas de la tabla según el texto ingresado en el buscador.
 */
function filtrarTablaMaestro() {
    let filtro = document.getElementById('input-buscar-maestro').value.toLowerCase();
    let filas = document.querySelectorAll('#tbody-gestion-maestro tr');

    filas.forEach(fila => {
        let textoFila = fila.textContent.toLowerCase();
        fila.style.display = textoFila.includes(filtro) ? '' : 'none';
    });
}

/**
 * Permite cambiar la asignación del código contable de una PP existente.
 * @param {string} pp - La PP a editar.
 */
function editarRegistroMaestro(pp) {
    if (!maestroProductos[pp]) return;

    // Obtener lista de catálogo disponible si existe un selector base
    let selectOriginal = document.getElementById('sel-maestro-producto');
    let opcionesTexto = "";
    
    if (selectOriginal && selectOriginal.options.length > 0) {
        for (let i = 0; i < selectOriginal.options.length; i++) {
            let opt = selectOriginal.options[i];
            opcionesTexto += `\n ${i + 1}. ${opt.text}`;
        }
    }

    let nuevoCodigo = prompt(`Modificando PP: ${pp}\nCódigo actual: ${maestroProductos[pp].codigo}\n\nIngresa el nuevo CÓDIGO CONTABLE para esta PP:`, maestroProductos[pp].codigo);

    if (nuevoCodigo !== null && nuevoCodigo.trim() !== "") {
        nuevoCodigo = nuevoCodigo.trim().toUpperCase();

        let nuevoNombre = prompt(`Ingresa la DESCRIPCIÓN/NOMBRE para el código ${nuevoCodigo}:`, maestroProductos[pp].nombre || "");

        // Actualizar objeto en memoria
        maestroProductos[pp] = {
            codigo: nuevoCodigo,
            nombre: nuevoNombre ? nuevoNombre.trim() : "Producto Registrado"
        };

        // Persistir en Firebase si está configurado
        if (typeof db !== 'undefined' && db.ref) {
            db.ref('maestroProductos/' + pp.replace(/\./g, '_')).set(maestroProductos[pp]);
        }
        
        // Persistir en localStorage como respaldo
        localStorage.setItem('maestroProductos', JSON.stringify(maestroProductos));

        alert(`✅ La PP ${pp} fue actualizada correctamente.`);
        
        renderTablaGestionMaestro();

        // Actualizar tablas principales en caliente si existen
        if (typeof globalStock !== 'undefined' && typeof renderTablaStock === 'function') {
            renderTablaStock(globalStock);
        }
    }
}

/**
 * Elimina una asignación del maestro de productos tras confirmación.
 * @param {string} pp - La PP a eliminar.
 */
function eliminarRegistroMaestro(pp) {
    if (confirm(`⚠️ ¿Estás seguro de que deseas eliminar la PP ${pp} del maestro de productos?\n\nSi eliminas esta relación, la PP volverá a figurar como "SIN-CODIGO" en las consultas.`)) {
        
        delete maestroProductos[pp];

        // Eliminar en Firebase si está configurado
        if (typeof db !== 'undefined' && db.ref) {
            db.ref('maestroProductos/' + pp.replace(/\./g, '_')).remove();
        }

        // Actualizar localStorage
        localStorage.setItem('maestroProductos', JSON.stringify(maestroProductos));

        renderTablaGestionMaestro();

        // Actualizar tablas principales en caliente
        if (typeof globalStock !== 'undefined' && typeof renderTablaStock === 'function') {
            renderTablaStock(globalStock);
        }
    }
}

