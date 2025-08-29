// Configura tus claves de Supabase aquí
const SUPABASE_URL = 'https://hdsmvuwrdwfivujjnubr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkc212dXdyZHdmaXZ1ampudWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0Njg2OTAsImV4cCI6MjA3MjA0NDY5MH0.veBjrW5g6HnOccOL6rgfF6IjArUpsAbmMzAnGNn8ktk';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const loginContainer = document.getElementById('login-container');
    const loginError = document.getElementById('login-error');
    const adminContent = document.getElementById('admin-content');
    const reservasTableContainer = document.getElementById('reservas-table-container');

    // Oculta el dashboard hasta que el usuario esté autenticado
    if (adminContent) adminContent.style.display = 'none';

    // Verifica si hay sesión activa
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            loginContainer.style.display = 'none';
            if (adminContent) adminContent.style.display = '';
            cargarReservas();
        } else {
            loginContainer.style.display = '';
            if (adminContent) adminContent.style.display = 'none';
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
                if (adminContent) adminContent.style.display = '';
                cargarReservas();
            }
        });
    }

    // Logout
    window.logoutSupabase = async function() {
        await supabase.auth.signOut();
        location.reload();
    };

    // Función para cargar reservas desde Supabase
    async function cargarReservas() {
        reservasTableContainer.innerHTML = '<p class="text-gray-500">Cargando reservas...</p>';
        // Cambia 'reservas' por el nombre real de tu tabla en Supabase
        const { data, error } = await supabase
            .from('reservas')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            reservasTableContainer.innerHTML = '<p class="text-red-500">Error al cargar reservas.</p>';
            return;
        }

        if (!data || data.length === 0) {
            reservasTableContainer.innerHTML = '<p class="text-gray-500">No hay reservas registradas.</p>';
            return;
        }

        // Renderizar tabla
        let html = `
            <table class="min-w-full bg-white border border-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-2 text-xs text-[#2c4b8b]">Pedido ID</th>
                        <th class="px-4 py-2 text-xs text-[#2c4b8b]">Nombre</th>
                        <th class="px-4 py-2 text-xs text-[#2c4b8b]">Email</th>
                        <th class="px-4 py-2 text-xs text-[#2c4b8b]">Vuelo</th>
                        <th class="px-4 py-2 text-xs text-[#2c4b8b]">Pasajero</th>
                        <th class="px-4 py-2 text-xs text-[#2c4b8b]">Fecha</th>
                    </tr>
                </thead>
                <tbody>
        `;
        data.forEach(r => {
            html += `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-2">${r.pedido_id || ''}</td>
                    <td class="px-4 py-2">${r.contacto_nombre || ''}</td>
                    <td class="px-4 py-2">${r.contacto_email || ''}</td>
                    <td class="px-4 py-2">${r.vuelo_codigo || ''} - ${r.vuelo_destino || ''}</td>
                    <td class="px-4 py-2">${r.nombre_pasajero || ''} ${r.apellido_pasajero || ''}</td>
                    <td class="px-4 py-2">${r.created_at ? new Date(r.created_at).toLocaleString('es-ES') : ''}</td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        reservasTableContainer.innerHTML = html;
    }
});