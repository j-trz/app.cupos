// Configura tus claves de Supabase aquí
const SUPABASE_URL = 'https://hdsmvuwrdwfivujjnubr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkc212dXdyZHdmaXZ1ampudWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0Njg2OTAsImV4cCI6MjA3MjA0NDY5MH0.veBjrW5g6HnOccOL6rgfF6IjArUpsAbmMzAnGNn8ktk';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Manejo de login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const loginContainer = document.getElementById('login-container');
    const loginError = document.getElementById('login-error');
    const mainContent = document.querySelector('.max-w-7xl');

    // Oculta el contenido principal hasta que el usuario esté autenticado
    if (mainContent) mainContent.style.display = 'none';

    // Verifica si hay sesión activa
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            loginContainer.style.display = 'none';
            if (mainContent) mainContent.style.display = '';
        } else {
            loginContainer.style.display = '';
            if (mainContent) mainContent.style.display = 'none';
        }
    });

    // Login submit
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            loginError.classList.add('hidden');
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                loginError.textContent = 'Credenciales incorrectas o error de autenticación';
                loginError.classList.remove('hidden');
            } else {
                loginContainer.style.display = 'none';
                if (mainContent) mainContent.style.display = '';
            }
        });
    }

    // Logout (opcional: puedes agregar un botón de logout)
    window.logoutSupabase = async function() {
        await supabase.auth.signOut();
        location.reload();
    };
});
        // Cargar datos de disponibilidad al iniciar
        document.addEventListener('DOMContentLoaded', function() {
            // Verifica sesión antes de cargar datos y permitir reservas
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                    cargarDisponibilidad();
                    // Agregar event listener al formulario
                    const form = document.getElementById('reservaForm');
                    if (form) {
                        form.addEventListener('submit', manejarEnvioFormulario);
                    }
                }
            });
        });

        // Función para cargar datos desde Power Automate
        async function cargarDisponibilidad() {
            try {
                // Reemplaza con tu URL de Power Automate que devuelve los datos
                const response = await fetch('https://prod-86.westus.logic.azure.com:443/workflows/633a65366a5c4ca18279c37130f51138/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Iqtj74C7LGRpWCibzyfUd0Vu8UyTPJsVuXyyHe5MYhw', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (response.ok) {
                    const datos = await response.json();
                    mostrarDatosEnTabla(datos);
                } else {
                    document.getElementById('tabla-disponibilidad').innerHTML = `
                        <tr>
                            <td colspan="8" class="px-6 py-4 text-center text-red-500">
                                Error al cargar los datos
                            </td>
                        </tr>
                    `;
                }
            } catch (error) {
                document.getElementById('tabla-disponibilidad').innerHTML = `
                    <tr>
                        <td colspan="8" class="px-6 py-4 text-center text-red-500">
                            Error de conexión: ${error.message}
                        </td>
                    </tr>
                `;
            }
        }

        // Mostrar datos en la tabla
        function mostrarDatosEnTabla(datos) {
            const tbody = document.getElementById('tabla-disponibilidad');
            
            if (!Array.isArray(datos) || datos.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="px-6 py-4 text-center text-gray-500">
                            No hay datos disponibles
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = datos.map((item, index) => `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${item.codigo_cupo || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.destino || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.compania || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${item.disponibilidad > 5 ? 'bg-green-100 text-green-800' : 
                              item.disponibilidad > 0 ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'}">
                            ${item.disponibilidad || 0}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatearFecha(item.salida) || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatearFecha(item.regreso) || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">$${item.precio ? parseFloat(item.precio).toFixed(2) : '0.00'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <button onclick='abrirFormulario(${JSON.stringify(item).replace(/'/g, "\\'")})' 
                                class="bg-[#2c4b8b] hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors">
                            Solicitar
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        // Formatear fecha
        function formatearFecha(fecha) {
            if (!fecha) return '';
            try {
                const date = new Date(fecha);
                return date.toLocaleDateString('es-ES');
            } catch {
                return fecha;
            }
        }

        // Abrir formulario de reserva
        function abrirFormulario(datosVuelo) {
            // Llenar información del vuelo
            const infoVuelo = document.getElementById('info-vuelo');
            infoVuelo.innerHTML = `
                <h2 class="text-xl font-semibold text-blue-800 mb-2">Vuelo Seleccionado</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <p class="text-sm text-gray-600">Código</p>
                        <p class="font-medium">${datosVuelo.codigo_cupo || ''}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Destino</p>
                        <p class="font-medium">${datosVuelo.destino || ''}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Compañía</p>
                        <p class="font-medium">${datosVuelo.compania || ''}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Salida</p>
                        <p class="font-medium">${formatearFecha(datosVuelo.salida) || ''}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Precio</p>
                        <p class="font-medium">$${datosVuelo.precio ? parseFloat(datosVuelo.precio).toFixed(2) : '0.00'}</p>
                    </div>
                </div>
            `;

            // Llenar campos ocultos
            const camposOcultos = document.getElementById('campos-ocultos');
            camposOcultos.innerHTML = `
                <input type="hidden" name="vuelo_codigo" value="${datosVuelo.codigo_cupo || ''}">
                <input type="hidden" name="vuelo_destino" value="${datosVuelo.destino || ''}">
                <input type="hidden" name="vuelo_compania" value="${datosVuelo.compania || ''}">
                <input type="hidden" name="vuelo_salida" value="${datosVuelo.salida || ''}">
                <input type="hidden" name="vuelo_precio" value="${datosVuelo.precio || ''}">
            `;

            // Generar número de pedido
            const pedidoId = `PED-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
            document.getElementById('pedido_id').value = pedidoId;

            // Reiniciar contador de pasajeros
            window.contadorPasajeros = 1;
            document.getElementById('pasajeros-container').innerHTML = `
                <div class="pasajero-item bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="text-md font-medium text-gray-700">Pasajero 1</h4>
                        <button type="button" onclick="this.parentElement.parentElement.remove()" class="text-red-500 hover:text-red-700 text-sm">Eliminar</button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                            <input type="text" name="pasajeros[0].nombre" required class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">Apellido *</label>
                            <input type="text" name="pasajeros[0].apellido" required class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">Documento *</label>
                            <input type="text" name="pasajeros[0].documento" required class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">Fecha Nacimiento *</label>
                            <input type="date" name="pasajeros[0].nacimiento" required class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">Nacionalidad *</label>
                            <input type="text" name="pasajeros[0].nacionalidad" required class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                            <select name="pasajeros[0].tipo" class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                                <option value="Adulto">Adulto</option>
                                <option value="Niño">Niño</option>
                                <option value="Bebé">Bebé</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;

            // Mostrar modal
            const modal = document.getElementById('modal-reserva');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        // Función para agregar pasajeros
        function agregarPasajero() {
            const container = document.getElementById('pasajeros-container');
            const div = document.createElement('div');
            div.className = 'pasajero-item bg-gray-50 border border-gray-200 rounded-lg p-4';
            div.innerHTML = `
                <div class="flex justify-between items-center mb-3">
                    <h4 class="text-md font-medium text-gray-700">Pasajero ${window.contadorPasajeros + 1}</h4>
                    <button type="button" onclick="this.parentElement.parentElement.remove()" class="text-red-500 hover:text-red-700 text-sm">Eliminar</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                        <input type="text" name="pasajeros[${window.contadorPasajeros}].nombre" required class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">Apellido *</label>
                        <input type="text" name="pasajeros[${window.contadorPasajeros}].apellido" required class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">Documento *</label>
                        <input type="text" name="pasajeros[${window.contadorPasajeros}].documento" required class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">Fecha Nacimiento *</label>
                        <input type="date" name="pasajeros[${window.contadorPasajeros}].nacimiento" required class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">Nacionalidad *</label>
                        <input type="text" name="pasajeros[${window.contadorPasajeros}].nacionalidad" required class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                        <select name="pasajeros[${window.contadorPasajeros}].tipo" class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="Adulto">Adulto</option>
                            <option value="Niño">Niño</option>
                            <option value="Bebé">Bebé</option>
                        </select>
                    </div>
                </div>
            `;
            container.appendChild(div);
            window.contadorPasajeros++;
        }

        // Cerrar modal
        function cerrarModal() {
            const modal = document.getElementById('modal-reserva');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        // Manejo del envío del formulario (función global)
        async function manejarEnvioFormulario(e) {
            e.preventDefault();
            
            try {
                const formData = new FormData(e.target);
                const data = {
                    pedido_id: formData.get('pedido_id'),
                    agencia: formData.get('agencia'),
                    contacto_nombre: formData.get('contacto_nombre'),
                    contacto_email: formData.get('contacto_email'),
                    contacto_telefono: formData.get('contacto_telefono'),
                    vuelo_codigo: formData.get('vuelo_codigo'),
                    vuelo_destino: formData.get('vuelo_destino'),
                    vuelo_compania: formData.get('vuelo_compania'),
                    vuelo_salida: formData.get('vuelo_salida'),
                    vuelo_precio: formData.get('vuelo_precio'),
                    pasajeros: []
                };
                // Validar pedido_id
                if (!data.pedido_id || data.pedido_id === 'null' || data.pedido_id === '') {
                    Swal.fire({
                        title: 'Error',
                        text: 'El número de pedido no está definido. Por favor, cierre y vuelva a abrir el formulario.',
                        icon: 'error',
                        confirmButtonText: 'Aceptar'
                    });
                    return;
                }

                // Recopilar datos de pasajeros
                for (let [key, value] of formData.entries()) {
                    const match = key.match(/pasajeros\[(\d+)\]\.(.+)/);
                    if (match) {
                        const index = parseInt(match[1]);
                        const field = match[2];
                        if (!data.pasajeros[index]) {
                            data.pasajeros[index] = {};
                        }
                        data.pasajeros[index][field] = value;
                    }
                }

                // Preparar datos para enviar individualmente
                const registros = data.pasajeros.map(pasajero => ({
                    pedido_id: data.pedido_id,
                    agencia: data.agencia,
                    contacto_nombre: data.contacto_nombre,
                    contacto_email: data.contacto_email,
                    contacto_telefono: data.contacto_telefono,
                    vuelo_codigo: data.vuelo_codigo,
                    vuelo_destino: data.vuelo_destino,
                    vuelo_compania: data.vuelo_compania,
                    vuelo_salida: data.vuelo_salida,
                    vuelo_precio: data.vuelo_precio,
                    nombre_pasajero: pasajero.nombre,
                    apellido_pasajero: pasajero.apellido,
                    documento_pasajero: pasajero.documento,
                    nacimiento_pasajero: pasajero.nacimiento,
                    nacionalidad_pasajero: pasajero.nacionalidad,
                    tipo_pasajero: pasajero.tipo
                }));

                // Mostrar loading
                Swal.fire({
                    title: 'Enviando reserva...',
                    text: 'Por favor espere mientras procesamos su solicitud',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                // ENVIAR CADA REGISTRO INDIVIDUALMENTE
                let exitos = 0;
                let errores = 0;

                for (const registro of registros) {
                    console.log('Registro enviado:', registro); // Depuración
                    try {
                        const response = await fetch('https://prod-130.westus.logic.azure.com:443/workflows/bf053e70a6d74d8bb047fd2024f005a0/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=dhW1_UdRvPy7brEZftVTPia-SUgv8NqttEooiJnMp08', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(registro)
                        });
                        
                        if (response.ok) {
                            exitos++;
                        } else {
                            errores++;
                        }
                    } catch (error) {
                        errores++;
                    }
                }

                // Mostrar resultado
                if (errores === 0) {
                    // Éxito - mostrar mensaje de solicitud enviada
                    Swal.fire({
                        title: '¡Solicitud de Reserva Enviada!',
                        html: `
                            <p>Su solicitud de reserva ha sido enviada correctamente.</p>
                            <p class="mt-2"><strong>Pedido ID:</strong> ${data.pedido_id}</p>
                            <p><strong>Pasajeros registrados:</strong> ${exitos}</p>
                            <p class="mt-3 text-blue-600"><i class="fas fa-info-circle"></i> Una vez confirmada su reserva, le enviaremos un correo de confirmación y se descontará el cupo disponible.</p>
                        `,
                        icon: 'success',
                        confirmButtonText: 'Aceptar',
                        confirmButtonColor: '#3085d6'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            cerrarModal();
                            // Opcional: recargar la tabla para actualizar disponibilidad
                            cargarDisponibilidad();
                        }
                    });
                } else {
                    // Error parcial
                    Swal.fire({
                        title: 'Envío Parcial',
                        html: `
                            <p>Se registraron ${exitos} pasajeros correctamente.</p>
                            <p>${errores} pasajeros tuvieron errores.</p>
                            <p class="mt-2 text-yellow-600">Por favor, contacte con soporte si el problema persiste.</p>
                        `,
                        icon: 'warning',
                        confirmButtonText: 'Aceptar',
                        confirmButtonColor: '#3085d6'
                    });
                }

            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: 'Error al procesar la reserva. Por favor, inténtelo de nuevo.',
                    icon: 'error',
                    confirmButtonText: 'Aceptar'
                });
            }
        }

        // Cerrar modal al hacer clic fuera
        document.getElementById('modal-reserva').addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModal();
            }
        });