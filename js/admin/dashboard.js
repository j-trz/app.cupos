// Sidebar colapsable
const sidebar = document.getElementById('sidebar');
const toggleSidebar = document.getElementById('toggleSidebar');
const sidebarBtns = document.querySelectorAll('.sidebar-btn');
const mainContent = document.getElementById('main-content');
const dashboardContent = document.getElementById('dashboard-content');

let sidebarOpen = false;

// Estado inicial: sidebar cerrado (solo iconos)
sidebar.classList.add('w-16');
sidebar.classList.remove('md:w-56');
document.querySelectorAll('.sidebar-btn span').forEach(el => el.classList.add('hidden'));
toggleSidebar.innerHTML = '<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round" class="text-xl icon icon-tabler icons-tabler-outline icon-tabler-chevron-right"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 6l6 6l-6 6" /></svg>';

toggleSidebar.addEventListener('click', () => {
    sidebarOpen = !sidebarOpen;
    if (sidebarOpen) {
        sidebar.classList.remove('w-16');
        sidebar.classList.add('md:w-56');
        document.querySelectorAll('.sidebar-btn span').forEach(el => el.classList.remove('hidden'));
        toggleSidebar.innerHTML = '<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="text-xl icon icon-tabler icons-tabler-outline icon-tabler-chevron-left"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 6l-6 6l6 6" /></svg>';
    } else {
        sidebar.classList.add('w-16');
        sidebar.classList.remove('md:w-56');
        document.querySelectorAll('.sidebar-btn span').forEach(el => el.classList.add('hidden'));
        toggleSidebar.innerHTML = '<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round" class="text-xl icon icon-tabler icons-tabler-outline icon-tabler-chevron-right"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 6l6 6l-6 6" /></svg>';
    }
});

// Navegación entre secciones
sidebarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const page = btn.getAttribute('data-page');
        cargarSeccion(page);
    });
});

// Carga dinámica de secciones (placeholder)
function cargarSeccion(page) {
    let html = '';
    switch (page) {
        case 'dashboard':
            html = '<h2 class="text-2xl font-bold text-[#2c4b8b] mb-4">Bienvenido al Dashboard</h2>';
            break;
        case 'cupos':
            html = '<h2 class="text-2xl font-bold text-[#2c4b8b] mb-4">Cargar Cupo</h2><p>Formulario para cargar cupos próximamente...</p>';
            break;
        case 'solicitudes':
            html = '<h2 class="text-2xl font-bold text-[#2c4b8b] mb-4">Solicitudes</h2><p>Listado de solicitudes próximamente...</p>';
            break;
        case 'confirmaciones':
            html = '<h2 class="text-2xl font-bold text-[#2c4b8b] mb-4">Confirmaciones</h2><p>Gestión de confirmaciones próximamente...</p>';
            break;
        case 'reportes':
            html = '<h2 class="text-2xl font-bold text-[#2c4b8b] mb-4">Reportería</h2><p>Reportes y estadísticas próximamente...</p>';
            break;
        default:
            html = '<h2 class="text-2xl font-bold text-[#2c4b8b] mb-4">Bienvenido al Dashboard</h2>';
    }
    dashboardContent.innerHTML = html;
}

// Cargar sección por defecto
cargarSeccion('dashboard');