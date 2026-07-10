import * as XLSX from 'xlsx';
/**
 * Carga los datos de los archivos Excel usando SheetJS (xlsx)
 * @returns {Promise<{cuposData: object[], pasajerosData: object[]}>}
 */

export async function loadData() {
    const FILES = [
        'Gestion de Cupos JTT.xlsx',
        'Planilla de pasajeros - Cupos JT.xlsx',
    ];
    let cuposData = [];
    let pasajerosData = [];
    for (const file of FILES) {
        const filePath = `/${file}`;
        const response = await fetch(filePath);
        if (!response.ok) {
            console.warn(`No se pudo cargar el archivo: ${filePath} - status: ${response.status}`);
            continue;
        }
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        try {
            const workbook = XLSX.read(data, { type: 'array' });
            // Buscar la primera hoja útil (ignorando Comments)
            const sheetName = workbook.SheetNames.find(name => name !== 'Comments');
            if (!sheetName) continue;
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            if (file.includes('Gestión de Cupos') || file.includes('Gestion de Cupos')) {
                cuposData.push(...json);
            } else if (file.includes('Planilla de pasajeros')) {
                pasajerosData.push(...json);
            }
        } catch (err) {
            console.warn(`Error procesando el archivo Excel: ${filePath}`, err);
        }
    }
    return { cuposData, pasajerosData };
}
/**
 * Devuelve la evolución mensual de ventas de Jetmar y Tienda Viajes.
 * @param {object} filters
 * @returns {{ labels: string[], datasets: Array<{label:string,data:number[],borderColor:string,backgroundColor:string}> }}
 */
export async function getEvolucionAgencias(filters = {}) {
    const { pasajerosData } = await loadData();
        function normalize(str) {
            return (str || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    }
    let rows = pasajerosData.filter(row => {
        return Object.entries(filters).every(([key, val]) => {
            if (!val) return true;
            if (key === 'Agencia') return true;
            if (key === 'Tipo Servicio' || key === 'Tipo de servicio') return true; // Ignorar filtro de tipo de servicio
            if (key === 'Temporada' || key === 'temporada') {
                // Usar directamente la columna Temporada de pasajeros
                const tempPax = normalize(row['Temporada'] || row['temporada']);
                if (Array.isArray(val)) {
                    return val.map(v => normalize(v)).includes(tempPax);
                } else {
                    const tempFiltro = normalize(val);
                    return tempPax === tempFiltro;
                }
            }
            if (Array.isArray(val)) return val.includes(row[key]);
            return row[key] == val;
        });
    });
    // Log de depuración para comparar con el share de ventas
    if (filters['Temporada'] || filters['temporada']) {
        console.log('[Depuración agencias][Evolución] Filtro:', filters['Temporada'] || filters['temporada']);
        console.log('[Depuración agencias][Evolución] Pasajeros filtrados para evolución:', rows.length);
        const temporadasUnicas = Array.from(new Set(pasajerosData.map(row => normalize(row['Temporada'] || row['temporada']))));
        console.log('[Depuración agencias][Evolución] Temporadas únicas normalizadas en pasajeros:', temporadasUnicas);
    }
    function cumpleEdadMenor2Anios(fechaNac, fechaRegreso) {
        if (!fechaNac || !fechaRegreso) return false;
        const parse = (f) => {
            if (f instanceof Date && !isNaN(f)) return f;
            if (!isNaN(f) && typeof f !== 'string') return new Date(Math.round((f - 25569) * 86400 * 1000));
            if (typeof f === 'string') {
                let d = new Date(f);
                if (!isNaN(d)) return d;
                let parts = f.split(/[-/]/);
                if (parts.length === 3) {
                    if (parts[0].length === 4) {
                        d = new Date(parts[0], parts[1] - 1, parts[2]);
                        if (!isNaN(d)) return d;
                    }
                    if (parts[2].length === 4) {
                        d = new Date(parts[2], parts[1] - 1, parts[0]);
                        if (!isNaN(d)) return d;
                    }
                }
            }
            return null;
        };
        const nac = parse(fechaNac);
        const regreso = parse(fechaRegreso);
        if (!nac || !regreso) return false;
        const diff = regreso.getTime() - nac.getTime();
        const edadAnios = diff / (1000 * 60 * 60 * 24 * 365.25);
        return edadAnios < 2;
    }
    const agencias = [
        { key: 'jetmar', nombres: ['jetmar', 'jetmar viajes', 'jetmar viajes srl'], color: '#2563eb' },
        { key: 'tienda', nombres: ['tienda viajes', 'tienda de viajes', 'tienda de viajes srl', 'tienda'], color: '#e11d48' }
    ];
    const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    // Map: { mesAño: {jetmar: n, tienda: n} }
    const evol = {};
    rows.forEach(row => {
        let sumar = false;
        const nro = parseInt(row['NRO']) || 0;
        if (nro === 1) {
            sumar = true;
        } else if (nro === 0) {
            if (cumpleEdadMenor2Anios(row['Fecha Nac'], row['Regreso'])) {
                sumar = true;
            }
        }
        if (!sumar) return;
        const ag = normalize(row['Agencia']);
        let cual = null;
        if (agencias[1].nombres.includes(ag)) {
            cual = 'tienda';
        } else {
            // Todo lo que no sea Tienda Viajes es Jetmar
            cual = 'jetmar';
        }
        // Fecha
        let fecha = row['Creado'];
        let d = null;
        if (fecha instanceof Date && !isNaN(fecha)) d = fecha;
        else if (!isNaN(fecha) && typeof fecha !== 'string') d = new Date(Math.round((fecha - 25569) * 86400 * 1000));
        else if (typeof fecha === 'string') {
            d = new Date(fecha);
            if (isNaN(d)) {
                let parts = fecha.split(/[-/]/);
                if (parts.length === 3) {
                    if (parts[0].length === 4) d = new Date(parts[0], parts[1] - 1, parts[2]);
                    else if (parts[2].length === 4) d = new Date(parts[2], parts[1] - 1, parts[0]);
                }
            }
        }
        if (!d || isNaN(d) || d.getFullYear() < 2000 || d.getFullYear() > 2100) return;
        const mes = meses[d.getMonth()];
        const anio = d.getFullYear();
        const clave = mes + ' ' + anio;
        if (!evol[clave]) evol[clave] = { jetmar: 0, tienda: 0 };
        evol[clave][cual] += 1;
    });
    const clavesOrdenadas = Object.keys(evol).sort((a, b) => {
        const getOrder = k => {
            const [mesStr, anioStr] = k.split(' ');
            const mesNum = meses.indexOf(mesStr);
            const anioNum = parseInt(anioStr);
            return anioNum * 12 + mesNum;
        };
        return getOrder(a) - getOrder(b);
    });
    const jetmarData = clavesOrdenadas.map(k => evol[k].jetmar);
    const tiendaData = clavesOrdenadas.map(k => evol[k].tienda);

    // --- LOG DE DEPURACIÓN: comparar claves de meses y datos crudos Jetmar Semana Santa 2025 ---
    if (filters['Temporada'] || filters['temporada']) {
        const temporadaFiltro = filters['Temporada'] || filters['temporada'];
        const normalize = (str) => (str || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
        const tempNorm = Array.isArray(temporadaFiltro) ? temporadaFiltro.map(normalize) : [normalize(temporadaFiltro)];
        // Filas Jetmar, Semana Santa 2025, marzo 2025
        const rowsJetmarMarzo = rows.filter(row => {
            const ag = normalize(row['Agencia']);
            const temp = normalize(row['Temporada'] || row['temporada']);
            let fecha = row['Creado'];
            let d = null;
            if (fecha instanceof Date && !isNaN(fecha)) d = fecha;
            else if (!isNaN(fecha) && typeof fecha !== 'string') d = new Date(Math.round((fecha - 25569) * 86400 * 1000));
            else if (typeof fecha === 'string') {
                d = new Date(fecha);
                if (isNaN(d)) {
                    let parts = fecha.split(/[-/]/);
                    if (parts.length === 3) {
                        if (parts[0].length === 4) d = new Date(parts[0], parts[1] - 1, parts[2]);
                        else if (parts[2].length === 4) d = new Date(parts[2], parts[1] - 1, parts[0]);
                    }
                }
            }
            return ag.includes('jetmar') && tempNorm.includes(temp) && d && d.getMonth() === 2 && d.getFullYear() === 2025;
        });
        console.log('[Depuración][Evolución] Claves de meses en evolución:', clavesOrdenadas);
        console.log('[Depuración][Evolución] Filas Jetmar Semana Santa 2025 en marzo 2025:', rowsJetmarMarzo.map(r => {
            let fechaExcel = r['Creado'];
            let fechaLegible = '';
            if (!isNaN(fechaExcel) && typeof fechaExcel !== 'string') {
                const d = new Date(Math.round((fechaExcel - 25569) * 86400 * 1000));
                fechaLegible = d.toISOString();
            } else if (typeof fechaExcel === 'string') {
                const d = new Date(fechaExcel);
                if (!isNaN(d)) fechaLegible = d.toISOString();
            }
            return {
                Creado: r['Creado'],
                FechaLegible: fechaLegible,
                Agencia: r['Agencia'],
                Temporada: r['Temporada'] || r['temporada'],
                NRO: r['NRO']
            };
        }));
        // Log especial: ¿MAR 2025 está en las claves? ¿Cuántos tiene Jetmar?
        const idxMar2025 = clavesOrdenadas.indexOf('MAR 2025');
        if (idxMar2025 !== -1) {
            console.log('[Depuración][Evolución] MAR 2025 SÍ está en las claves del gráfico. Jetmar:', jetmarData[idxMar2025], 'Tienda:', tiendaData[idxMar2025]);
        } else {
            console.warn('[Depuración][Evolución] MAR 2025 NO está en las claves del gráfico.');
        }
    }
    return {
        labels: clavesOrdenadas,
        datasets: [
            { label: 'Jetmar', data: jetmarData, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.15)', tension: 0.2, pointBackgroundColor: '#2563eb', pointBorderColor: '#2563eb' },
            { label: 'Tienda Viajes', data: tiendaData, borderColor: '#e11d48', backgroundColor: 'rgba(225,29,72,0.15)', tension: 0.2, pointBackgroundColor: '#e11d48', pointBorderColor: '#e11d48' }
        ]
    };
}
/**
 * Obtiene datos de ventas por agencia desde la planilla de pasajeros.
 * Cada fila con NRO=1 cuenta como venta; si NRO=0, solo cuenta si el pasajero es menor de 2 años al regreso.
 * Agrupa por agencia (normalizada) y calcula el share de ventas.
 * Aplica filtros activos (temporada, destino, etc.).
 * @param {object} filters
 * @returns {{ labels: string[], values: number[], share: number[] }}
 */
export async function getAgenciasData(filters = {}) {
    console.log('[Depuración agencias][INICIO] filters recibidos:', filters);
    const { pasajerosData } = await loadData();
    // --- Depuración: mostrar datos crudos de pasajeros ---
    console.log('[Depuración agencias][CRUDO] pasajerosData (total):', pasajerosData.length);
    if (pasajerosData.length > 0) {
        console.log('[Depuración agencias][CRUDO] Primeros 5 pasajeros:', pasajerosData.slice(0, 5));
    }
    // --- Depuración: mostrar todas las temporadas únicas normalizadas de los pasajeros ---
    function normalize(str) {
        return (str || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    }
    const temporadasUnicas = Array.from(new Set(pasajerosData.map(row => normalize(row['Temporada'] || row['temporada']))));
    if (filters['Temporada'] || filters['temporada']) {
        const filtroTemporada = filters['Temporada'] || filters['temporada'];
        const filtroNormalizado = Array.isArray(filtroTemporada)
            ? filtroTemporada.map(v => normalize(v))
            : [normalize(filtroTemporada)];
        console.log('[Depuración agencias][Filtro] Temporadas únicas normalizadas en pasajeros:', temporadasUnicas);
        console.log('[Depuración agencias][Filtro] Filtro recibido:', filtroTemporada);
        console.log('[Depuración agencias][Filtro] Filtro normalizado:', filtroNormalizado);
        // Mostrar los valores originales de Temporada que al normalizar dan exactamente el filtro
        filtroNormalizado.forEach(fn => {
            const originales = pasajerosData
                .map(row => row['Temporada'] || row['temporada'])
                .filter(orig => normalize(orig) === fn);
            console.log(`[Depuración agencias][Filtro] Valores originales de Temporada que normalizan a '${fn}':`, originales);
        });
    }
<<<<<<< HEAD

=======
 
>>>>>>> main
    // Filtro inclusivo con log de descarte detallado, ignorando 'Tipo Servicio' y 'Tipo de servicio'
    let rows = pasajerosData.filter((row, idx) => {
        let pasa = true;
        for (const [key, val] of Object.entries(filters)) {
            if (!val) continue;
            if (key === 'Agencia') continue; // No filtrar por agencia aquí
            if (key === 'Tipo Servicio' || key === 'Tipo de servicio') continue; // Ignorar filtro de tipo de servicio
            if (key === 'Temporada' || key === 'temporada') {
                const tempPax = normalize(row['Temporada'] || row['temporada']);
                let arrNorm = Array.isArray(val) ? val.map(v => normalize(v)) : [normalize(val)];
                if (!arrNorm.includes(tempPax)) {
                    console.log(`[Depuración agencias][DESCARTE][${idx}] Pasajero descartado por Temporada:`, {
                        pasajero: row,
                        tempPax,
                        arrNorm
                    });
                    pasa = false;
                    break;
                }
                continue;
            }
            if (Array.isArray(val)) {
                if (!val.includes(row[key])) {
                    console.log(`[Depuración agencias][DESCARTE][${idx}] Pasajero descartado por campo '${key}' (array):`, {
                        pasajero: row,
                        valor: row[key],
                        filtro: val
                    });
                    pasa = false;
                    break;
                }
                continue;
            }
            if (row[key] != val) {
                console.log(`[Depuración agencias][DESCARTE][${idx}] Pasajero descartado por campo '${key}':`, {
                    pasajero: row,
                    valor: row[key],
                    filtro: val
                });
                pasa = false;
                break;
            }
        }
        return pasa;
    });
    // Log de depuración: cuántos pasajeros pasan el filtro
    if (filters['Temporada'] || filters['temporada']) {
        console.log('[Depuración agencias] Temporada filtro:', filters['Temporada'] || filters['temporada']);
        console.log('[Depuración agencias] Pasajeros filtrados:', rows.length);
    }
    // Lógica de ventas: NRO=1 cuenta, NRO=0 solo si <2 años al regreso
    function cumpleEdadMenor2Anios(fechaNac, fechaRegreso) {
        if (!fechaNac || !fechaRegreso) return false;
        const parse = (f) => {
            if (f instanceof Date && !isNaN(f)) return f;
            if (!isNaN(f) && typeof f !== 'string') return new Date(Math.round((f - 25569) * 86400 * 1000));
            if (typeof f === 'string') {
                let d = new Date(f);
                if (!isNaN(d)) return d;
                let parts = f.split(/[-/]/);
                if (parts.length === 3) {
                    if (parts[0].length === 4) {
                        d = new Date(parts[0], parts[1] - 1, parts[2]);
                        if (!isNaN(d)) return d;
                    }
                    if (parts[2].length === 4) {
                        d = new Date(parts[2], parts[1] - 1, parts[0]);
                        if (!isNaN(d)) return d;
                    }
                }
            }
            return null;
        };
        const nac = parse(fechaNac);
        const regreso = parse(fechaRegreso);
        if (!nac || !regreso) return false;
        const diff = regreso.getTime() - nac.getTime();
        const edadAnios = diff / (1000 * 60 * 60 * 24 * 365.25);
        return edadAnios < 2;
    }
    // Agrupar ventas por Jetmar y Tienda Viajes
    const agencias = [
        { key: 'jetmar', nombres: ['jetmar', 'jetmar viajes', 'jetmar viajes srl'] },
        { key: 'tienda', nombres: ['tienda viajes', 'tienda de viajes', 'tienda de viajes srl', 'tienda'] }
    ];
    const ventas = { jetmar: 0, tienda: 0 };
    let totalSumar = 0;
    rows.forEach(row => {
        let sumar = false;
        const nro = parseInt(row['NRO']) || 0;
        if (nro === 1) {
            sumar = true;
        } else if (nro === 0) {
            if (cumpleEdadMenor2Anios(row['Fecha Nac'], row['Regreso'])) {
                sumar = true;
            }
        }
        if (!sumar) return;
        totalSumar++;
        const ag = normalize(row['Agencia']);
        if (agencias[1].nombres.includes(ag)) {
            ventas.tienda += 1;
        } else {
            // Todo lo que no sea Tienda Viajes es Jetmar
            ventas.jetmar += 1;
        }
    });
    if (filters['Temporada'] || filters['temporada']) {
        console.log('[Depuración agencias] Ventas válidas (NRO=1 o <2 años):', totalSumar);
        console.log('[Depuración agencias] Jetmar:', ventas.jetmar, 'Tienda:', ventas.tienda);
    }
    const total = ventas.jetmar + ventas.tienda || 1;
    return {
        labels: ['Jetmar', 'Tienda Viajes'],
        values: [ventas.jetmar, ventas.tienda],
        share: [Math.round((ventas.jetmar/total)*1000)/10, Math.round((ventas.tienda/total)*1000)/10]
    };
}


function getTipoOperacionPasajero(pax, cuposData) {
    const cupoStr = (pax['Cupo'] || '').toString().toUpperCase();
    if (cupoStr.includes('_CH-') || cupoStr.includes('_CH_')) return 'CHARTERS';
    if (cupoStr.includes('DEST_ARG') || cupoStr.includes('DEST_ARG-')|| cupoStr.includes('-DEST_ARG-')) return 'DESTINO ARG';
    // Buscar en Gestion de Cupos JTT por Codigo de Cupo
    const cupoRow = cuposData.find(c => (c['Codigo de Cupo'] || '').toString().toUpperCase() === cupoStr);
    const tipoServicio = (cupoRow ? (cupoRow['Tipo Servicio'] || cupoRow['Tipo de servicio'] || '') : '').toString().toUpperCase();
    if (tipoServicio === 'AÉREO' || tipoServicio === 'AEREO') return 'CUPOS';
    return '';
}

function getTipoOperacionCupo(cupo) {
    const info = (cupo['INFO EXTRA'] || '').toString().toUpperCase();
    if (info.includes('_CH-') || info.includes('_CH_')|| info.includes('_CH')) return 'CHARTERS';
    if (info.includes('DEST_ARG')) return 'DESTINO ARG';
    const tipoServicio = (cupo['Tipo Servicio'] || cupo['Tipo de servicio'] || '').toString().toUpperCase();
    if (tipoServicio === 'AÉREO' || tipoServicio === 'AEREO') return 'CUPOS';
    return '';
}

export async function getFields() {
    let { cuposData, pasajerosData } = await loadData();
    const allData = [...cuposData, ...pasajerosData];
    const result = {};

    allData.forEach(row => {
        for (const header in row) {
            if (!result[header]) {
                result[header] = new Set();
            }
            const value = row[header];
            if (value !== undefined && value !== null && value !== '') {
                result[header].add(value);
            }
        }
    });

    const fields = Object.entries(result).map(([field, values]) => ({
        field,
        values: Array.from(values),
    }));

    return { fields };
}

export async function getDetalleDestinos(filters = {}) {
    let { cuposData, pasajerosData } = await loadData();
    // --- Filtro por agencia: obtener cupos válidos según agencias seleccionadas ---
    let cuposPermitidosPorAgencia = null;
    if (filters['Agencia']) {
        const agencias = Array.isArray(filters['Agencia']) ? filters['Agencia'] : [filters['Agencia']];
        // Normalizar función
        function normalize(str) {
            return (str || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
        }
        const agenciasNorm = agencias.map(normalize);
        cuposPermitidosPorAgencia = new Set(
            pasajerosData.filter(pax => agenciasNorm.includes(normalize(pax['Agencia'])))
                .map(pax => normalize(pax['Cupo']))
        );
    }
    // --- Soporte comparativos múltiples campos flexibles ---
    // Detectar campos a comparar (cualquier campo con array de longitud > 1)
    const comparar = {};
    Object.entries(filters).forEach(([key, val]) => {
        if (Array.isArray(val) && val.length > 1) {
            comparar[key] = val;
        }
    });

    if (filters['Vendedor']) {
        // Si necesitas filtrar por vendedor, implementa aquí la lógica
    }
    // Filtro por agencia: filtrar cuposData si corresponde
    let cuposDataFiltrado = cuposData;
    if (cuposPermitidosPorAgencia) {
        // Normalizar función
        function normalize(str) {
            return (str || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
        }
        cuposDataFiltrado = cuposData.filter(cupo => cuposPermitidosPorAgencia.has(normalize(cupo['Codigo de Cupo'])));
    }

    // Helper para generar combinaciones
    function getCombos(obj) {
        const keys = Object.keys(obj);
        if (keys.length === 0) return [{}];
        const [first, ...rest] = keys;
        const combosRest = getCombos(Object.fromEntries(rest.map(k => [k, obj[k]])));
        return obj[first].flatMap(val => combosRest.map(c => ({ ...c, [first]: val })));
    }

    let rowsDetalle = [];
    if (Object.keys(comparar).length > 0) {
        const combos = getCombos(comparar);
        combos.forEach(combo => {
            const detalle = {};
            cuposDataFiltrado.forEach(cupo => {
                let match = true;
                Object.entries(filters).forEach(([key, val]) => {
                    if (!val || key === 'comparar' || key === 'Agencia') return;
                    // Permitir arrays para tipo de producto y tipo de operación
                    if (combo[key] !== undefined) {
                        if (key === 'Temporada' || key === 'temporada') {
                            match = match && ((cupo['Temporada'] || cupo['temporada']) == combo[key]);
                        } else if (key === 'Destino') {
                            match = match && (cupo['Destino'] == combo[key]);
                        } else if (key === 'Proveedor' || key === 'Compañia') {
                            match = match && (cupo['Proveedor'] == combo[key] || cupo['Compañia'] == combo[key]);
                        } else if (key === 'Tipo de servicio' || key === 'Tipo Servicio' || key === 'Tipo de producto' || key === 'Producto') {
                            // Inclusivo: buscar coincidencia en cualquiera de los campos relevantes y también en el valor calculado de tipo de operación
                            const valores = Array.isArray(combo[key]) ? combo[key] : [combo[key]];
                            match = match && valores.some(v => (
                                [cupo['Tipo de servicio'], cupo['Tipo Servicio'], cupo['Tipo de producto'], cupo['Producto'], getTipoOperacionCupo(cupo)].includes(v)
                            ));
                        } else if (key === 'Tipo de operación') {
                            // Permitir arrays para tipo de operación
                            const valores = Array.isArray(combo[key]) ? combo[key] : [combo[key]];
                            match = match && valores.some(v => getTipoOperacionCupo(cupo) === v);
                        } else {
                            match = match && (cupo[key] == combo[key]);
                        }
                    } else {
                        if (key === 'Tipo de servicio' || key === 'Tipo Servicio' || key === 'Tipo de producto' || key === 'Producto') {
                            // Inclusivo: buscar coincidencia en cualquiera de los campos relevantes y también en el valor calculado de tipo de operación
                            const valores = Array.isArray(val) ? val : [val];
                            match = match && valores.some(v => (
                                [cupo['Tipo de servicio'], cupo['Tipo Servicio'], cupo['Tipo de producto'], cupo['Producto'], getTipoOperacionCupo(cupo)].includes(v)
                            ));
                        } else if (key === 'Tipo de operación') {
                            // Permitir arrays para tipo de operación
                            const valores = Array.isArray(val) ? val : [val];
                            match = match && valores.some(v => getTipoOperacionCupo(cupo) === v);
                        } else {
                            match = match && (cupo[key] == val);
                        }
                    }
                });
                if (match) {
                    const destino = cupo['Destino'] || 'Sin destino';
                    const temporada = cupo['Temporada'] || cupo['temporada'] || combo['Temporada'] || '';
                    const proveedor = cupo['Proveedor'] || cupo['Compañia'] || cupo['Aerolinea'] || combo['Proveedor'] || combo['Compañia'] || combo['Aerolinea'] || '';
                    const key = destino + '|' + temporada + '|' + proveedor;
                    if (!detalle[key]) {
                        detalle[key] = {
                            Destino: destino,
                            Temporada: temporada,
                            Proveedor: proveedor,
                            'Cupos tomados': 0,
                            'Lugares vendidos': 0,
                            'Lugares cancelados': 0,
                            'Rentabilidad': 0,
                            'Costo': 0,
                            'Costo total': 0,
                            'Venta': 0,
                            'Venta total': 0,
                            'Riesgo': 0
                        };
                    }
                    const vendidos = parseInt(cupo['Vendidos'] || 0);
                    const tomados = parseInt(cupo['Cupo'] || 0);
                    const opUnit = parseFloat(cupo['OP'] || 0);
                    const neto1Unit = parseFloat(cupo['NETO 1'] || 0);
                    const netoVendUnit = parseFloat(cupo['Neto Vendedor'] || 0);
                    detalle[key]['Cupos tomados'] += tomados;
                    detalle[key]['Lugares vendidos'] += vendidos;
                    const cancelados = parseInt(cupo['Cancelados/ Devolución'] || 0);
                    detalle[key]['Lugares cancelados'] += cancelados;
                    detalle[key]['Rentabilidad'] += opUnit * vendidos;
                    detalle[key]['Costo'] += neto1Unit * vendidos;
                    detalle[key]['Venta'] += netoVendUnit * vendidos;
                    // Costo total: cupos tomados * neto1Unit (por cada línea)
                    detalle[key]['Costo total'] += tomados * neto1Unit;
                    // Venta total: cupos tomados * netoVendUnit (por cada línea)
                    detalle[key]['Venta total'] += tomados * netoVendUnit;
                    // Riesgo: (Cupos tomados - Cancelados) * NETO 1 - Costo
                    detalle[key]['Riesgo'] = ((detalle[key]['Cupos tomados'] - detalle[key]['Lugares cancelados']) * neto1Unit) - detalle[key]['Costo'];
                }
            });
            Object.values(detalle).forEach(obj => {
                obj._comparativo = Object.entries(combo).map(([k, v]) => `${k}: ${v}`).join(' | ');
            });
            rowsDetalle = rowsDetalle.concat(Object.values(detalle));
        });
    } else {
        const detalle = {};
        cuposDataFiltrado.forEach(cupo => {
            let match = true;
            Object.entries(filters).forEach(([key, val]) => {
                if (!val || key === 'Agencia') return;
                if (key === 'Tipo de servicio' || key === 'Tipo Servicio' || key === 'Tipo de producto' || key === 'Producto') {
                    // Inclusivo: buscar coincidencia en cualquiera de los campos relevantes y también en el valor calculado de tipo de operación
                    const valores = Array.isArray(val) ? val : [val];
                    match = match && valores.some(v => (
                        [cupo['Tipo de servicio'], cupo['Tipo Servicio'], cupo['Tipo de producto'], cupo['Producto'], getTipoOperacionCupo(cupo)].includes(v)
                    ));
                } else if (key === 'Temporada' || key === 'temporada') {
                    match = match && (cupo['Temporada'] == val || cupo['temporada'] == val);
                } else if (key === 'Tipo de operación') {
                    // Permitir arrays para tipo de operación
                    const valores = Array.isArray(val) ? val : [val];
                    match = match && valores.some(v => getTipoOperacionCupo(cupo) === v);
                } else {
                    match = match && (cupo[key] == val);
                }
            });
            if (match) {
                const destino = cupo['Destino'] || 'Sin destino';
                const temporada = cupo['Temporada'] || cupo['temporada'] || 'Sin temporada';
                const key = destino + '|' + temporada;
                if (!detalle[key]) {
                    detalle[key] = {
                        Destino: destino,
                        Temporada: temporada,
                        'Cupos tomados': 0,
                        'Lugares vendidos': 0,
                        'Lugares cancelados': 0,
                        'Rentabilidad': 0,
                        'Costo': 0,
                        'Costo total': 0,
                        'Venta': 0,
                        'Venta total': 0,
                        'Riesgo': 0
                    };
                }
                const vendidos = parseInt(cupo['Vendidos'] || 0);
                const tomados = parseInt(cupo['Cupo'] || 0);
                const opUnit = parseFloat(cupo['OP'] || 0);
                const neto1Unit = parseFloat(cupo['NETO 1'] || 0);
                const netoVendUnit = parseFloat(cupo['Neto Vendedor'] || 0);
                detalle[key]['Cupos tomados'] += tomados;
                detalle[key]['Lugares vendidos'] += vendidos;
                detalle[key]['Lugares cancelados'] += parseInt(cupo['Cancelados/ Devolución'] || 0);
                detalle[key]['Rentabilidad'] += opUnit * vendidos;
                detalle[key]['Costo'] += neto1Unit * vendidos;
                detalle[key]['Venta'] += netoVendUnit * vendidos;
                // Costo total: cupos tomados * neto1Unit (por cada línea)
                detalle[key]['Costo total'] += tomados * neto1Unit;
                // Venta total: cupos tomados * netoVendUnit (por cada línea)
                detalle[key]['Venta total'] += tomados * netoVendUnit;
                // Riesgo: Costo total - Costo
                detalle[key]['Riesgo'] = detalle[key]['Costo total'] - detalle[key]['Costo'];
            }
        });
        rowsDetalle = Object.values(detalle);
    }
    // Insertar la columna 'Venta total' a la derecha de 'Venta'
    let cols = ['Destino', 'Temporada', 'Cupos tomados', 'Lugares vendidos', 'Lugares cancelados', 'Rentabilidad', 'Costo', 'Costo total', 'Venta', 'Venta total', 'Riesgo'];
    return { columns: cols, data: rowsDetalle };
}

export async function getDestinos(filters = {}) {
        let { cuposData, pasajerosData } = await loadData();
        // --- Filtro por agencia: obtener cupos válidos según agencias seleccionadas ---
        let cuposPermitidosPorAgencia = null;
        if (filters['Agencia']) {
            const agencias = Array.isArray(filters['Agencia']) ? filters['Agencia'] : [filters['Agencia']];
            function normalize(str) {
                return (str || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
            }
            const agenciasNorm = agencias.map(normalize);
            cuposPermitidosPorAgencia = new Set(
                pasajerosData.filter(pax => agenciasNorm.includes(normalize(pax['Agencia'])))
                    .map(pax => normalize(pax['Cupo']))
            );
        }

        // Detectar campos comparativos de forma flexible (cualquier campo con array de longitud > 1)
        // No filtrar cuposData globalmente por agencia. El filtro se aplica por combinación más abajo.
        const comparar = {};
        Object.entries(filters).forEach(([key, val]) => {
            if (Array.isArray(val) && val.length > 1) {
                comparar[key] = val;
            }
        });
        // Si hay comparativos, generar datasets múltiples
        function getCombos(obj) {
            const keys = Object.keys(obj);
            if (keys.length === 0) return [{}];
            const [first, ...rest] = keys;
            const combosRest = getCombos(Object.fromEntries(rest.map(k => [k, obj[k]])));
            return obj[first].flatMap(val => combosRest.map(c => ({ ...c, [first]: val })));
        }
        // Helper para filtrar cupos por combinación, aplicando filtro de agencia si corresponde
        function filtrarCupos(cupos, combo) {
            // Si hay filtro de agencia, filtrar por cuposPermitidosPorAgencia
            let cuposFiltrados = cupos;
            if (cuposPermitidosPorAgencia) {
                function normalize(str) {
                    return (str || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
                }
                cuposFiltrados = cupos.filter(cupo => cuposPermitidosPorAgencia.has(normalize(cupo['Codigo de Cupo'])));
            }
            return cuposFiltrados.filter(cupo => {
                return Object.entries(combo).every(([key, val]) => {
                    if (key === 'Temporada' || key === 'temporada') {
                        return (cupo['Temporada'] || cupo['temporada']) == val;
                    }
                    if (key === 'Destino') {
                        return cupo['Destino'] == val;
                    }
                    if (key === 'Proveedor' || key === 'Compañia') {
                        return cupo['Proveedor'] == val || cupo['Compañia'] == val;
                    }
                    if (key === 'Tipo de operación') {
                        return getTipoOperacionCupo(cupo) === val;
                    }
                    if (key === 'Tipo de producto' || key === 'Producto' || key === 'Tipo de servicio' || key === 'Tipo Servicio') {
                        return (cupo['Tipo de producto'] == val || cupo['Producto'] == val || cupo['Tipo de servicio'] == val || cupo['Tipo Servicio'] == val);
                    }
                    if (key === 'Agencia') {
                        // No filtrar aquí, ya se filtró arriba
                        return true;
                    }
                    return cupo[key] == val;
                });
            });
        }
        // Si hay comparativos, devolver datasets (incluyendo por compañía)
    if (Object.keys(comparar).length > 0) {
        const combos = getCombos(comparar);
        const allDestinos = Array.from(new Set(cuposData.map(c => c['Destino'] || 'Sin destino')));
        let allCompanias = Array.from(new Set(cuposData.map(c => (c['Compañía'] || c['Compania'] || c['Proveedor'] || c['Aerolinea'] || '').toString().trim() || 'Sin compañía')));
        // Filtrar compañías con más de 2 caracteres
        allCompanias = allCompanias.filter(comp => comp.length <= 2);

        // --- DESTINOS ---
        const vendidosDatasets = combos.map(combo => {
            const cupos = filtrarCupos(cuposData, combo);
            const data = allDestinos.map(dest => {
                return cupos.filter(c => (c['Destino'] || 'Sin destino') === dest).reduce((acc, c) => acc + (parseInt(c['Vendidos']) || 0), 0);
            });
            return { label: Object.entries(combo).map(([k, v]) => `${k}: ${v}`).join(' | '), data };
        });
        const disponiblesDatasets = combos.map(combo => {
            const cupos = filtrarCupos(cuposData, combo);
            const data = allDestinos.map(dest => {
                return cupos.filter(c => (c['Destino'] || 'Sin destino') === dest).reduce((acc, c) => acc + (parseInt(c['Disponibilidad']) || 0), 0);
            });
            return { label: Object.entries(combo).map(([k, v]) => `${k}: ${v}`).join(' | '), data };
        });
        const canceladosDatasets = combos.map(combo => {
            const cupos = filtrarCupos(cuposData, combo);
            const data = allDestinos.map(dest => {
                return cupos.filter(c => (c['Destino'] || 'Sin destino') === dest).reduce((acc, c) => acc + (parseInt(c['Cancelados/ Devolución']) || 0), 0);
            });
            return { label: Object.entries(combo).map(([k, v]) => `${k}: ${v}`).join(' | '), data };
        });
        const rentabilidadDatasets = combos.map(combo => {
            const cupos = filtrarCupos(cuposData, combo);
            const data = allDestinos.map(dest => {
                return cupos.filter(c => (c['Destino'] || 'Sin destino') === dest).reduce((acc, c) => {
                    const vendidos = parseInt(c['Vendidos']) || 0;
                    const opUnit = parseFloat(c['OP']) || 0;
                    return acc + (opUnit * vendidos);
                }, 0);
            });
            return { label: Object.entries(combo).map(([k, v]) => `${k}: ${v}`).join(' | '), data };
        });
        const costoDatasets = combos.map(combo => {
            const cupos = filtrarCupos(cuposData, combo);
            const data = allDestinos.map(dest => {
                return cupos.filter(c => (c['Destino'] || 'Sin destino') === dest).reduce((acc, c) => {
                    const vendidos = parseInt(c['Vendidos']) || 0;
                    const neto1Unit = parseFloat(c['NETO 1']) || 0;
                    return acc + (neto1Unit * vendidos);
                }, 0);
            });
            return { label: Object.entries(combo).map(([k, v]) => `${k}: ${v}`).join(' | '), data };
        });
        const ventaDatasets = combos.map(combo => {
            const cupos = filtrarCupos(cuposData, combo);
            const data = allDestinos.map(dest => {
                return cupos.filter(c => (c['Destino'] || 'Sin destino') === dest).reduce((acc, c) => {
                    const vendidos = parseInt(c['Vendidos']) || 0;
                    const netoVendUnit = parseFloat(c['Neto Vendedor'] || 0);
                    return acc + (netoVendUnit * vendidos);
                }, 0);
            });
            return { label: Object.entries(combo).map(([k, v]) => `${k}: ${v}`).join(' | '), data };
        });
        // Riesgo por destino
        const riesgoDatasets = combos.map(combo => {
            const cupos = filtrarCupos(cuposData, combo);
            const data = allDestinos.map(dest => {
                return cupos.filter(c => (c['Destino'] || 'Sin destino') === dest).reduce((acc, c) => {
                    const tomados = parseInt(c['Cupo']) || 0;
                    const vendidos = parseInt(c['Vendidos']) || 0;
                    const neto1Unit = parseFloat(c['NETO 1']) || 0;
                    return acc + ((tomados * neto1Unit) - (vendidos * neto1Unit));
                }, 0);
            });
            return { label: Object.entries(combo).map(([k, v]) => `${k}: ${v}`).join(' | '), data };
        });

        // --- Filtrar etiquetas de destino con datos ---
        function filtrarEtiquetasConDatos(labels, datasets) {
            // labels: array de etiquetas (destinos o compañías)
            // datasets: array de {label, data}
            const indicesConDatos = labels.map((_, idx) => {
                // Si al menos un dataset tiene valor distinto de 0 en este índice
                return datasets.some(ds => ds.data[idx] !== 0);
            });
            const labelsFiltradas = labels.filter((_, idx) => indicesConDatos[idx]);
            const datasetsFiltrados = datasets.map(ds => ({
                ...ds,
                data: ds.data.filter((_, idx) => indicesConDatos[idx])
            }));
            return { labels: labelsFiltradas, datasets: datasetsFiltrados };
        }

        const vendidos = filtrarEtiquetasConDatos(allDestinos, vendidosDatasets);
        const disponibles = filtrarEtiquetasConDatos(allDestinos, disponiblesDatasets);
        const cancelados = filtrarEtiquetasConDatos(allDestinos, canceladosDatasets);
        const rentabilidad = filtrarEtiquetasConDatos(allDestinos, rentabilidadDatasets);
        const costo = filtrarEtiquetasConDatos(allDestinos, costoDatasets);
        const venta = filtrarEtiquetasConDatos(allDestinos, ventaDatasets);

        // --- COMPAÑÍAS ---
        const vendidosPorCompaniaDatasets = combos.map(combo => {
            const cupos = filtrarCupos(cuposData, combo);
            const data = allCompanias.map(comp => {
                return cupos.filter(c => ((c['Compañía'] || c['Compania'] || c['Proveedor'] || c['Aerolinea'] || '').toString().trim() || 'Sin compañía') === comp)
                    .reduce((acc, c) => acc + (parseInt(c['Vendidos']) || 0), 0);
            });
            return { label: Object.entries(combo).map(([k, v]) => `${k}: ${v}`).join(' | '), data };
        });
        const disponiblesPorCompaniaDatasets = combos.map(combo => {
            const cupos = filtrarCupos(cuposData, combo);
            const data = allCompanias.map(comp => {
                return cupos.filter(c => ((c['Compañía'] || c['Compania'] || c['Proveedor'] || c['Aerolinea'] || '').toString().trim() || 'Sin compañía') === comp)
                    .reduce((acc, c) => acc + (parseInt(c['Disponibilidad']) || 0), 0);
            });
            return { label: Object.entries(combo).map(([k, v]) => `${k}: ${v}`).join(' | '), data };
        });
        const canceladosPorCompaniaDatasets = combos.map(combo => {
            const cupos = filtrarCupos(cuposData, combo);
            const data = allCompanias.map(comp => {
                return cupos.filter(c => ((c['Compañía'] || c['Compania'] || c['Proveedor'] || c['Aerolinea'] || '').toString().trim() || 'Sin compañía') === comp)
                    .reduce((acc, c) => acc + (parseInt(c['Cancelados/ Devolución']) || 0), 0);
            });
            return { label: Object.entries(combo).map(([k, v]) => `${k}: ${v}`).join(' | '), data };
        });
        const rentabilidadPorCompaniaDatasets = combos.map(combo => {
            const cupos = filtrarCupos(cuposData, combo);
            const data = allCompanias.map(comp => {
                return cupos.filter(c => ((c['Compañía'] || c['Compania'] || c['Proveedor'] || c['Aerolinea'] || '').toString().trim() || 'Sin compañía') === comp)
                    .reduce((acc, c) => {
                        const vendidos = parseInt(c['Vendidos']) || 0;
                        const opUnit = parseFloat(c['OP']) || 0;
                        return acc + (opUnit * vendidos);
                    }, 0);
            });
            return { label: Object.entries(combo).map(([k, v]) => `${k}: ${v}`).join(' | '), data };
        });
        const costoPorCompaniaDatasets = combos.map(combo => {
            const cupos = filtrarCupos(cuposData, combo);
            const data = allCompanias.map(comp => {
                return cupos.filter(c => ((c['Compañía'] || c['Compania'] || c['Proveedor'] || c['Aerolinea'] || '').toString().trim() || 'Sin compañía') === comp)
                    .reduce((acc, c) => {
                        const vendidos = parseInt(c['Vendidos']) || 0;
                        const neto1Unit = parseFloat(c['NETO 1']) || 0;
                        return acc + (neto1Unit * vendidos);
                    }, 0);
            });
            return { label: Object.entries(combo).map(([k, v]) => `${k}: ${v}`).join(' | '), data };
        });
        const ventaPorCompaniaDatasets = combos.map(combo => {
            const cupos = filtrarCupos(cuposData, combo);
            const data = allCompanias.map(comp => {
                return cupos.filter(c => ((c['Compañía'] || c['Compania'] || c['Proveedor'] || c['Aerolinea'] || '').toString().trim() || 'Sin compañía') === comp)
                    .reduce((acc, c) => {
                        const vendidos = parseInt(c['Vendidos']) || 0;
                        const netoVendUnit = parseFloat(c['Neto Vendedor'] || 0);
                        return acc + (netoVendUnit * vendidos);
                    }, 0);
            });
            return { label: Object.entries(combo).map(([k, v]) => `${k}: ${v}`).join(' | '), data };
        });
        // Riesgo por compañía
        const riesgoPorCompaniaDatasets = combos.map(combo => {
            const cupos = filtrarCupos(cuposData, combo);
            const data = allCompanias.map(comp => {
                return cupos.filter(c => ((c['Compañía'] || c['Compania'] || c['Proveedor'] || c['Aerolinea'] || '').toString().trim() || 'Sin compañía') === comp)
                    .reduce((acc, c) => {
                        const tomados = parseInt(c['Cupo']) || 0;
                        const vendidos = parseInt(c['Vendidos']) || 0;
                        const neto1Unit = parseFloat(c['NETO 1']) || 0;
                        return acc + ((tomados * neto1Unit) - (vendidos * neto1Unit));
                    }, 0);
            });
            return { label: Object.entries(combo).map(([k, v]) => `${k}: ${v}`).join(' | '), data };
        });

        // --- Filtrar etiquetas de compañía con datos ---
        const vendidosCompania = filtrarEtiquetasConDatos(allCompanias, vendidosPorCompaniaDatasets);
        const disponiblesCompania = filtrarEtiquetasConDatos(allCompanias, disponiblesPorCompaniaDatasets);
        const canceladosCompania = filtrarEtiquetasConDatos(allCompanias, canceladosPorCompaniaDatasets);
        const rentabilidadCompania = filtrarEtiquetasConDatos(allCompanias, rentabilidadPorCompaniaDatasets);
        const costoCompania = filtrarEtiquetasConDatos(allCompanias, costoPorCompaniaDatasets);
        const ventaCompania = filtrarEtiquetasConDatos(allCompanias, ventaPorCompaniaDatasets);

        return {
            vendidos,
            disponibles,
            cancelados,
            rentabilidad,
            costo,
            venta,
            riesgo: filtrarEtiquetasConDatos(allDestinos, riesgoDatasets),
            vendidosPorCompania: vendidosCompania,
            disponiblesPorCompania: disponiblesCompania,
            canceladosPorCompania: canceladosCompania,
            rentabilidadPorCompania: rentabilidadCompania,
            costoPorCompania: costoCompania,
            ventaPorCompania: ventaCompania,
            riesgoPorCompania: filtrarEtiquetasConDatos(allCompanias, riesgoPorCompaniaDatasets)
        };
    }

    // --- Lógica original para el caso sin comparativos ---
    const vendedorMap = {};
    pasajerosData.forEach(pax => {
        const destino = pax['Destino'] || '';
        const temporada = pax['Temporada'] || pax['temporada'] || '';
        const producto = pax['Producto'] || pax['Tipo de servicio'] || pax['Tipo Servicio'] || '';
        const vendedor = pax['Vendedor'] || '';
        const key = `${destino}|${temporada}|${producto}`;
        if (vendedor) vendedorMap[key] = vendedor;
    });

    function getVendedorCruzado(cupo) {
        const destino = cupo['Destino'] || '';
        const temporada = cupo['Temporada'] || cupo['temporada'] || '';
        const producto = cupo['Producto'] || cupo['Tipo de servicio'] || cupo['Tipo Servicio'] || '';
        const key = `${destino}|${temporada}|${producto}`;
        return vendedorMap[key] || '';
    }

    const vendidosCupos = {};
    const disponibles = {};
    const cancelados = {};
    const rentabilidad = {};
    const costo = {};
    const venta = {};

    cuposData.forEach(cupo => {
        let match = true;
        Object.entries(filters).forEach(([key, val]) => {
            if (!val) return;
            if (key === 'Tipo de servicio' || key === 'Tipo Servicio') {
                match = match && (cupo['Tipo de servicio'] == val || cupo['Tipo Servicio'] == val);
            } else if (key === 'Temporada' || key === 'temporada') {
                match = match && (cupo['Temporada'] == val || cupo['temporada'] == val);
            } else if (key === 'Tipo de operación') {
                match = match && (getTipoOperacionCupo(cupo) === val);
            } else if (key === 'Vendedor') {
                match = match && (cupo['Vendedor'] == val || getVendedorCruzado(cupo) == val);
            } else {
                match = match && (cupo[key] == val);
            }
        });
        if (match) {
            const destino = cupo['Destino'] || 'Sin destino';
            vendidosCupos[destino] = (vendidosCupos[destino] || 0) + (parseInt(cupo['Vendidos']) || 0);
            disponibles[destino] = (disponibles[destino] || 0) + (parseInt(cupo['Disponibilidad']) || 0);
            cancelados[destino] = (cancelados[destino] || 0) + (parseInt(cupo['Cancelados/ Devolución']) || 0);
            const vendidos = parseInt(cupo['Vendidos']) || 0;
            const opUnit = parseFloat(cupo['OP']) || 0;
            const neto1Unit = parseFloat(cupo['NETO 1']) || 0;
            const netoVendUnit = parseFloat(cupo['Neto Vendedor'] || 0);
            rentabilidad[destino] = (rentabilidad[destino] || 0) + (opUnit * vendidos);
            costo[destino] = (costo[destino] || 0) + (neto1Unit * vendidos);
            venta[destino] = (venta[destino] || 0) + (netoVendUnit * vendidos);
        }
    });

<<<<<<< HEAD
    // --- Por compañía (sin comparativos): filtrar compañías con más de 2 caracteres ---
=======
    // --- Por compañía (sin comparativos): filtrar compañías con más de 2 caracteres --- 
>>>>>>> main
    const vendidosCompania = {};
    const disponiblesCompania = {};
    const canceladosCompania = {};
    const rentabilidadCompania = {};
    const costoCompania = {};
    const ventaCompania = {};
    cuposData.forEach(cupo => {
        let match = true;
        Object.entries(filters).forEach(([key, val]) => {
            if (!val) return;
            if (key === 'Compañia' || key === 'Proveedor' || key === 'Aerolinea') return;
            if (key === 'Tipo de servicio' || key === 'Tipo Servicio') {
                match = match && (cupo['Tipo de servicio'] == val || cupo['Tipo Servicio'] == val);
            } else if (key === 'Temporada' || key === 'temporada') {
                match = match && (cupo['Temporada'] == val || cupo['temporada'] == val);
            } else if (key === 'Tipo de operación') {
                match = match && (getTipoOperacionCupo(cupo) === val);
            } else {
                match = match && (cupo[key] == val);
            }
        });
        if (match) {
            let compania = (cupo['Compañía'] || cupo['Compania'] || cupo['Proveedor'] || cupo['Aerolinea'] || '').toString().trim();
            if (!compania) compania = 'Sin compañía';
            if (compania.length > 2) return; // Ocultar compañías con más de 2 caracteres
            vendidosCompania[compania] = (vendidosCompania[compania] || 0) + (parseInt(cupo['Vendidos']) || 0);
            disponiblesCompania[compania] = (disponiblesCompania[compania] || 0) + (parseInt(cupo['Disponibilidad']) || 0);
            canceladosCompania[compania] = (canceladosCompania[compania] || 0) + (parseInt(cupo['Cancelados/ Devolución']) || 0);
            const vendidos = parseInt(cupo['Vendidos']) || 0;
            const opUnit = parseFloat(cupo['OP']) || 0;
            const neto1Unit = parseFloat(cupo['NETO 1']) || 0;
            const netoVendUnit = parseFloat(cupo['Neto Vendedor'] || 0);
            rentabilidadCompania[compania] = (rentabilidadCompania[compania] || 0) + (opUnit * vendidos);
            costoCompania[compania] = (costoCompania[compania] || 0) + (neto1Unit * vendidos);
            ventaCompania[compania] = (ventaCompania[compania] || 0) + (netoVendUnit * vendidos);
        }
    });

    // --- Cupos tomados por destino ---
    const cuposTomadosPorDestino = {};
    cuposData.forEach(cupo => {
        let match = true;
        Object.entries(filters).forEach(([key, val]) => {
            if (!val) return;
            if (key === 'Tipo de servicio' || key === 'Tipo Servicio') {
                match = match && (cupo['Tipo de servicio'] == val || cupo['Tipo Servicio'] == val);
            } else if (key === 'Temporada' || key === 'temporada') {
                match = match && (cupo['Temporada'] == val || cupo['temporada'] == val);
            } else if (key === 'Tipo de operación') {
                match = match && (getTipoOperacionCupo(cupo) === val);
            } else if (key === 'Vendedor') {
                match = match && (cupo['Vendedor'] == val || getVendedorCruzado(cupo) == val);
            } else {
                match = match && (cupo[key] == val);
            }
        });
        if (match) {
            const destino = cupo['Destino'] || 'Sin destino';
            cuposTomadosPorDestino[destino] = (cuposTomadosPorDestino[destino] || 0) + (parseInt(cupo['Cupo']) || 0);
        }
    });

    // --- Cupos tomados por compañía ---
    const cuposTomadosPorCompania = {};
    cuposData.forEach(cupo => {
        let match = true;
        Object.entries(filters).forEach(([key, val]) => {
            if (!val) return;
            if (key === 'Compañia' || key === 'Proveedor' || key === 'Aerolinea') return;
            if (key === 'Tipo de servicio' || key === 'Tipo Servicio') {
                match = match && (cupo['Tipo de servicio'] == val || cupo['Tipo Servicio'] == val);
            } else if (key === 'Temporada' || key === 'temporada') {
                match = match && (cupo['Temporada'] == val || cupo['temporada'] == val);
            } else if (key === 'Tipo de operación') {
                match = match && (getTipoOperacionCupo(cupo) === val);
            } else {
                match = match && (cupo[key] == val);
            }
        });
        if (match) {
            let compania = (cupo['Compañía'] || cupo['Compania'] || cupo['Proveedor'] || cupo['Aerolinea'] || '').toString().trim();
            if (!compania) compania = 'Sin compañía';
            if (compania.length > 2) return; // Ocultar compañías con más de 2 caracteres
            cuposTomadosPorCompania[compania] = (cuposTomadosPorCompania[compania] || 0) + (parseInt(cupo['Cupo']) || 0);
        }
    });

    return {
        vendidos: { labels: Object.keys(vendidosCupos), values: Object.values(vendidosCupos) },
        disponibles: { labels: Object.keys(disponibles), values: Object.values(disponibles) },
        cancelados: { labels: Object.keys(cancelados), values: Object.values(cancelados) },
        rentabilidad: { labels: Object.keys(rentabilidad), values: Object.values(rentabilidad) },
        costo: { labels: Object.keys(costo), values: Object.values(costo) },
        venta: { labels: Object.keys(venta), values: Object.values(venta) },
        vendidosPorCompania: { labels: Object.keys(vendidosCompania), values: Object.values(vendidosCompania) },
        disponiblesPorCompania: { labels: Object.keys(disponiblesCompania), values: Object.values(disponiblesCompania) },
        canceladosPorCompania: { labels: Object.keys(canceladosCompania), values: Object.values(canceladosCompania) },
        rentabilidadPorCompania: { labels: Object.keys(rentabilidadCompania), values: Object.values(rentabilidadCompania) },
        costoPorCompania: { labels: Object.keys(costoCompania), values: Object.values(costoCompania) },
        ventaPorCompania: { labels: Object.keys(ventaCompania), values: Object.values(ventaCompania) },
        cuposTomadosPorDestino: { labels: Object.keys(cuposTomadosPorDestino), values: Object.values(cuposTomadosPorDestino) },
        cuposTomadosPorCompania: { labels: Object.keys(cuposTomadosPorCompania), values: Object.values(cuposTomadosPorCompania) }
    };
    // --- Lógica original para el caso sin comparativos ---
    // ... (aquí va el código original para el caso sin comparativos, ya existente debajo)
}

export async function getEvolucionPasajeros(filters = {}) {
    function normalize(str) {
        return (str || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    }
    let { cuposData, pasajerosData } = await loadData();
    // Permitir comparar por múltiples campos (Temporada, Destino, Proveedor)
    let comparar = filters.comparar || {};
    if (Array.isArray(comparar)) {
        // Compatibilidad: si es array, asumir temporadas
        comparar = { Temporada: comparar };
    }

    const cupoDestinoMap = {};
    cuposData.forEach(cupo => {
        if (cupo['Codigo de Cupo'] && cupo['Destino']) {
            cupoDestinoMap[cupo['Codigo de Cupo']] = cupo['Destino'];
        }
    });

    // --- Mapeo de Cupo a Agencia ---
    const cupoAgenciaMap = {};
    pasajerosData.forEach(pax => {
        if (pax['Cupo'] && pax['Agencia']) {
            cupoAgenciaMap[pax['Cupo']] = pax['Agencia'];
        }
    });

    const rows = pasajerosData.map(pax => ({
        ...pax,
        Destino: cupoDestinoMap[pax['Cupo']] || null,
        Agencia: cupoAgenciaMap[pax['Cupo']] || pax['Agencia'] || null
    }));

    // --- Filtro por agencia ---
    function cumpleEdadMenor2Anios(fechaNac, fechaRegreso) {
        if (!fechaNac || !fechaRegreso) return false;
        const parse = (f) => {
            if (f instanceof Date && !isNaN(f)) return f;
            if (!isNaN(f) && typeof f !== 'string') return new Date(Math.round((f - 25569) * 86400 * 1000));
            if (typeof f === 'string') {
                let d = new Date(f);
                if (!isNaN(d)) return d;
                let parts = f.split(/[-/]/);
                if (parts.length === 3) {
                    if (parts[0].length === 4) {
                        d = new Date(parts[0], parts[1] - 1, parts[2]);
                        if (!isNaN(d)) return d;
                    }
                    if (parts[2].length === 4) {
                        d = new Date(parts[2], parts[1] - 1, parts[0]);
                        if (!isNaN(d)) return d;
                    }
                }
            }
            return null;
        };
        const nac = parse(fechaNac);
        const regreso = parse(fechaRegreso);
        if (!nac || !regreso) return false;
        const diff = regreso.getTime() - nac.getTime();
        const edadAnios = diff / (1000 * 60 * 60 * 24 * 365.25);
        return edadAnios < 2;
    }

    const temporadasPax = Array.from(new Set(pasajerosData.map(r => normalize(r['Temporada'] || r['temporada']))));
    if (filters['Temporada'] || filters['temporada']) {
        console.log('[Depuración agencias][Share/Evolucion] Temporadas en pasajeros:', temporadasPax);
        console.log('[Depuración agencias][Share/Evolucion] Filtro recibido:', filters['Temporada'] || filters['temporada']);
    }

    if (Object.keys(comparar).length > 0) {
        const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        const datasets = [];
        function getCombos(obj) {
            const keys = Object.keys(obj);
            if (keys.length === 0) return [{}];
            const [first, ...rest] = keys;
            const combosRest = getCombos(Object.fromEntries(rest.map(k => [k, obj[k]])));
            return obj[first].flatMap(val => combosRest.map(c => ({ ...c, [first]: val })));
        }
        const combos = getCombos(comparar);
        combos.forEach(combo => {
            // Filtrar por cada combinación
            const filtered = rows.filter(row => {
                return Object.entries(combo).every(([key, val]) => {
                    if (key === 'Temporada' || key === 'temporada') {
                        const rowTemp = (row['Temporada'] || row['temporada'] || '').toString().trim().toUpperCase();
                        return rowTemp === val.toString().trim().toUpperCase();
                    }
                    if (key === 'Destino') {
                        return row['Destino'] == val;
                    }
                    if (key === 'Proveedor' || key === 'Compañia') {
                        return row['Proveedor'] == val || row['Compañia'] == val;
                    }
                    if (key === 'Agencia') {
                        return row['Agencia'] == val;
                    }
                    return row[key] == val;
                });
            });
            const evolReport = {};
            filtered.forEach(row => {
                const fecha = row['Creado'];
                const nro = parseInt(row['NRO']) || 0;
                let sumar = false;
                if (nro === 1) {
                    sumar = true;
                } else if (nro === 0) {
                    if (cumpleEdadMenor2Anios(row['Fecha Nac'], row['Regreso'])) {
                        sumar = true;
                    }
                }
                if (!sumar) return;
                const d = parseFecha(fecha);
                if (!d || isNaN(d) || d.getFullYear() < 2000 || d.getFullYear() > 2100) return;
                const mes = meses[d.getMonth()];
                const anio = d.getFullYear();
                const clave = mes + ' ' + anio;
                if (!evolReport[clave]) evolReport[clave] = 0;
                evolReport[clave] += nro;
            });
            const clavesOrdenadas = Object.keys(evolReport).sort((a, b) => {
                const getOrder = k => {
                    const [mesStr, anioStr] = k.split(' ');
                    const mesNum = meses.indexOf(mesStr);
                    const anioNum = parseInt(anioStr);
                    return anioNum * 12 + mesNum;
                };
                return getOrder(a) - getOrder(b);
            });
            const valores = clavesOrdenadas.map(f => evolReport[f]);
            // Etiqueta: concatenar valores de combo
            const label = Object.entries(combo).map(([k, v]) => `${k}: ${v}`).join(' | ');
            datasets.push({ label, labels: clavesOrdenadas, values: valores });
        });
        const allLabels = Array.from(new Set(datasets.flatMap(ds => ds.labels))).sort((a, b) => {
            const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
            const getOrder = k => {
                const [mesStr, anioStr] = k.split(' ');
                const mesNum = meses.indexOf(mesStr);
                const anioNum = parseInt(anioStr);
                return anioNum * 12 + mesNum;
            };
            return getOrder(a) - getOrder(b);
        });
        const chartDatasets = datasets.map(ds => ({
            label: ds.label,
            data: allLabels.map(l => {
                const idx = ds.labels.indexOf(l);
                return idx >= 0 ? ds.values[idx] : 0;
            })
        }));
        return { labels: allLabels, datasets: chartDatasets };
    }

    let filtered = rows.filter(row => {
        return Object.entries(filters).every(([key, val]) => {
            if (!val) return true;
            if (key === 'Tipo de servicio' || key === 'Tipo Servicio') {
                const cupo = cuposData.find(c => c['Codigo de Cupo'] == row['Cupo']);
                return (row['Tipo de servicio'] == val || row['Tipo Servicio'] == val) || (cupo && (cupo['Tipo de servicio'] == val || cupo['Tipo Servicio'] == val));
            }
            if (key === 'Tipo de operación') {
                return getTipoOperacionPasajero(row, cuposData) === val;
            }
            if (key === 'Temporada' || key === 'temporada') {
                return row['Temporada'] == val || row['temporada'] == val;
            }
            if (key === 'Agencia') {
                return row['Agencia'] == val;
            }
            return row[key] == val;
        });
    });

    if (filters['Temporada']) {
        filtered = filtered.filter(row => row['Temporada'] == filters['Temporada']);
    }
    if (filters['Destino']) {
        filtered = filtered.filter(row => row['Destino'] == filters['Destino']);
    }

    const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const evolReport = {};
    function parseFecha(fecha) {
        if (!fecha) return null;
        // Si es tipo Date
        if (fecha instanceof Date && !isNaN(fecha)) return fecha;
        // Si es número Excel (días desde 1900-01-01)
        if (!isNaN(fecha) && typeof fecha !== 'string') {
            // SheetJS: 25569 = 1970-01-01
            return new Date(Math.round((fecha - 25569) * 86400 * 1000));
        }
        // Si es string tipo yyyy-mm-dd o dd/mm/yyyy o dd-mm-yyyy
        if (typeof fecha === 'string') {
            let d = new Date(fecha);
            if (!isNaN(d)) return d;
            // dd/mm/yyyy o dd-mm-yyyy
            let parts = fecha.split(/[-/]/);
            if (parts.length === 3) {
                // Si año es primero
                if (parts[0].length === 4) {
                    d = new Date(parts[0], parts[1] - 1, parts[2]);
                    if (!isNaN(d)) return d;
                }
                // Si año es último (dd/mm/yyyy o dd-mm-yyyy)
                if (parts[2].length === 4) {
                    d = new Date(parts[2], parts[1] - 1, parts[0]);
                    if (!isNaN(d)) return d;
                }
            }
        }
        return null;
    }

    // --- Lógica para agrupar por mes y año ---
    filtered.forEach(row => {
        const fecha = row['Creado'];
        const nro = parseInt(row['NRO']) || 0;
        let sumar = false;
        if (nro === 1) {
            sumar = true;
        } else if (nro === 0) {
            if (cumpleEdadMenor2Anios(row['Fecha Nac'], row['Regreso'])) {
                sumar = true;
            }
        }
        if (!sumar) return;
        const d = parseFecha(fecha);
        if (!d || isNaN(d) || d.getFullYear() < 2000 || d.getFullYear() > 2100) return;
        const mes = meses[d.getMonth()];
        const anio = d.getFullYear();
        const clave = mes + ' ' + anio;
        if (!evolReport[clave]) evolReport[clave] = 0;
        evolReport[clave] += nro;
    });

    const clavesOrdenadas = Object.keys(evolReport).sort((a, b) => {
        const getOrder = k => {
            const [mesStr, anioStr] = k.split(' ');
            const mesNum = meses.indexOf(mesStr);
            const anioNum = parseInt(anioStr);
            return anioNum * 12 + mesNum;
        };
        return getOrder(a) - getOrder(b);
    });

    const valores = clavesOrdenadas.map(f => evolReport[f]);
    return { labels: clavesOrdenadas, values: valores };
}