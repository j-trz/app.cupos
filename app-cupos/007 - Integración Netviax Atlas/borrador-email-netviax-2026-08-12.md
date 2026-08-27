**Asunto:** Cupos UTG — conexión con Atlas antes de pasar a producción

Hola Ale, ¿cómo estás?

Te quería contar que desarrollé una herramienta de gestión de cupos para UTG. Ya está validada por todos y estamos por ponerla en producción — para eso tenemos que ajustar la conexión con Atlas y dejar todo prolijo.

Hoy me estoy conectando a Atlas de Jetmar con las credenciales que me dio Tecnología, y las estoy usando con el fin de desarrollar el módulo. Como la van a usar Jetmar, Tienda, Buemes y TocToc (no descartamos que más adelante se sume Hiper), quería ver con vos cuál es la mejor estrategia: ¿tener un usuario de API único que, según la agencia, traiga los datos correspondientes, o hacerlo de manera individual, con credenciales propias por agencia?

Aprovecho también para contarte cómo estamos usando la API hoy y qué nos gustaría implementar a futuro.

## Cómo la estamos usando hoy

Por ahora la integración es 100% de lectura — traemos datos de Atlas para autocompletar nuestro formulario de reserva, evitando que el vendedor tenga que tipear de nuevo un contacto o pasajero que ya está cargado del lado de ustedes. Puntualmente usamos:

- **`wscontactobuscar`**: búsqueda de contactos por documento, email, celular o nombre.
- **`wscontactodetallebuscar`**: detalle completo de un contacto, para traer sus datos (nombre, documento, nacimiento, nacionalidad, contacto) al formulario.
- **`wsfichabuscar`**: búsqueda de una ficha de venta por número, para importar de una todos los pasajeros asociados.
- **`wscontactovendedorbuscar`**: sin filtros, solo para validar que las credenciales configuradas funcionan (nuestro botón "Probar conexión").

Las credenciales (Usuario/Clave/Empresa/Sucursal) las mandamos en el body de cada request, sin token de sesión — según entendemos, así está pensada la API.

## Lo que nos gustaría implementar a futuro

Cuando un pasajero queda emitido (ticket asignado y confirmado) en nuestro sistema, queremos que Atlas se entere automáticamente — hoy esa sincronización es manual (alguien anota "BO OK" o similar del lado nuestro, sin que Atlas se actualice).

De nuestro lado ya tenemos disponibles estos datos por pasajero emitido, listos para mandar en cuanto sepamos el formato correcto: número de ticket, ficha de venta asociada, documento/pasaporte, precio de venta, compañía, ruta y fecha de salida. Lo único que nos falta confirmar es el lado de Atlas — y ahí es donde necesitamos su ayuda, porque hoy no tenemos la información de esa parte de la API.

## Lo que necesitaríamos que nos confirmen

1. **¿Qué endpoint corresponde** para reportar que un pasajero fue emitido/ticketeado — ¿es a nivel de Ficha (`wsfichaguardar`), de Contacto (`wscontactoguardar`), o existe un endpoint de boletaje/emisión dedicado que no tenemos identificado?
2. **Ejemplos reales de request y response** para ese endpoint — no contamos con ninguno guardado para los endpoints de escritura.
3. **La URL de test/sandbox** para poder probar antes de ir a producción.
4. Si el **whitelisting de IP** que tienen desde julio aplica también al ambiente de test, y qué IP deberíamos habilitar.
5. Si el campo de éxito/error de esa respuesta viene consistente, o varía de tipo (string vs. número) como notamos en algunos de los endpoints de lectura que ya usamos.
6. Si Atlas necesita el código de contacto (`ContactoCodigo`) para asociar el ticket, y qué hacer cuando un pasajero se cargó a mano en nuestro sistema sin buscarlo antes en Atlas — ¿hay que crearlo primero, o se puede reportar el ticket sin contacto asociado?

Cualquier documentación, colección de Postman actualizada, o una charla rápida para repasar esto nos vendría muy bien. Quedo atento a lo que necesiten de nuestro lado.

Una vez que validemos todo lo correspondiente a Atlas, vamos a seguir con Infra para los siguientes pasos hasta dejarla corriendo.

Saludos,
Julian Estefán
Jetmar Viajes
