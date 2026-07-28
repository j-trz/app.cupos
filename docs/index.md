---
title: Inicio
nav_order: 0
nav_group: Empezar
---

<div class="hero">
  <p class="kicker">Sistema de Gestión de Cupos</p>
  <h1>Documentación técnica</h1>
  <p class="hero-lede">Cómo funciona cada módulo del sistema, qué endpoints y componentes lo implementan, y los diagramas de flujo reales detrás de cada validación y estado — backend en Go, frontend en React.</p>
</div>

<ul class="manifest">
  <li class="manifest-item" style="--i: 0">
    <a class="manifest-link" href="QUICKSTART.html">
      <span class="manifest-index">01</span>
      <div class="manifest-body">
        <h2>Quickstart</h2>
        <p>Cómo conseguir un token, mandarlo en cada request y hacer tu primera reserva vía API — el punto de partida si vas a integrar contra el sistema.</p>
      </div>
      <span class="manifest-arrow">&rarr;</span>
    </a>
  </li>
  <li class="manifest-item" style="--i: 1">
    <a class="manifest-link" href="API_REFERENCE.html">
      <span class="manifest-index">02</span>
      <div class="manifest-body">
        <h2>Referencia de API</h2>
        <p>Catálogo completo de endpoints por recurso, convenciones de autenticación, errores, permisos y paginación.</p>
      </div>
      <span class="manifest-arrow">&rarr;</span>
    </a>
  </li>
  <li class="manifest-item" style="--i: 2">
    <a class="manifest-link" href="FLUJOS_FUNCIONALIDADES.html">
      <span class="manifest-index">03</span>
      <div class="manifest-body">
        <h2>Flujos de Funcionalidades</h2>
        <p>Autenticación, disponibilidad y reservas, cesión de cupos, grupos, RBAC, asistente IA, expiración automática, reportes, notificaciones y configuración — con diagramas de flujo para cada una.</p>
      </div>
      <span class="manifest-arrow">&rarr;</span>
    </a>
  </li>
  <li class="manifest-item" style="--i: 3">
    <a class="manifest-link" href="FRONTEND.html">
      <span class="manifest-index">04</span>
      <div class="manifest-body">
        <h2>Frontend</h2>
        <p>Arquitectura de la SPA en React: stack, estructura de carpetas, enrutamiento, contextos, servicios, hooks y componentes clave.</p>
      </div>
      <span class="manifest-arrow">&rarr;</span>
    </a>
  </li>
</ul>

<p class="callout">Este sitio se genera directamente desde la carpeta <code>docs/</code> de la rama <code>main</code> del repositorio — cualquier <code>.md</code> que se agregue ahí (con encabezado <code>title</code> y <code>nav_order</code>) queda publicado automáticamente en el menú de la izquierda.</p>
