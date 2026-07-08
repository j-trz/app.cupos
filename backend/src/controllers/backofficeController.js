/**
 * Controlador de Backoffice (Simulado)
 * Permite importar datos de pasajeros desde sistemas de backoffice externos
 */

/**
 * Importar pasajeros desde el backoffice basándose en la ficha de venta
 * GET /api/backoffice/importar-pasajeros
 */
export const importarPasajeros = async (req, res) => {
  try {
    const { ficha_venta } = req.query;

    if (!ficha_venta) {
      return res.status(400).json({ error: 'La ficha de venta es requerida para la importación.' });
    }

    console.log(`[Backoffice] Solicitud de importación para ficha_venta: ${ficha_venta}`);

    // Lista de pasajeros simulada según el código de ficha de venta
    let pasajeros = [];

    if (ficha_venta.includes('123')) {
      // Caso 1: 2 pasajeros (Adulto + Menor)
      pasajeros = [
        {
          nombre: 'Juan Carlos',
          apellido: 'Pérez',
          documento: '38472910',
          nacionalidad: 'Argentina',
          nacimiento: '1994-05-15',
          tipo_pasajero: 'Adulto'
        },
        {
          nombre: 'Mariana Belén',
          apellido: 'Pérez',
          documento: '51123987',
          nacionalidad: 'Argentina',
          nacimiento: '2018-09-20',
          tipo_pasajero: 'Menor'
        }
      ];
    } else if (ficha_venta.includes('456')) {
      // Caso 2: 3 pasajeros (2 Adultos + 1 Infante)
      pasajeros = [
        {
          nombre: 'Roberto Gómez',
          apellido: 'Fernández',
          documento: '28194837',
          nacionalidad: 'Uruguay',
          nacimiento: '1980-11-02',
          tipo_pasajero: 'Adulto'
        },
        {
          nombre: 'Estela Maris',
          apellido: 'López',
          documento: '30485920',
          nacionalidad: 'Argentina',
          nacimiento: '1983-04-24',
          tipo_pasajero: 'Adulto'
        },
        {
          nombre: 'Sofía',
          apellido: 'Gómez López',
          documento: '62194837',
          nacionalidad: 'Argentina',
          nacimiento: '2025-01-10',
          tipo_pasajero: 'Infante'
        }
      ];
    } else {
      // Caso por defecto: 1 pasajero Adulto
      pasajeros = [
        {
          nombre: 'Julian Alejandro',
          apellido: 'Estefan',
          documento: '35194820',
          nacionalidad: 'Argentina',
          nacimiento: '1990-08-12',
          tipo_pasajero: 'Adulto'
        }
      ];
    }

    // Simulamos un retraso de red de 800ms
    await new Promise(resolve => setTimeout(resolve, 800));

    return res.status(200).json({
      success: true,
      ficha_venta,
      pasajeros
    });
  } catch (error) {
    console.error('Error en importarPasajeros:', error);
    return res.status(500).json({ error: 'Error interno al intentar conectar con el backoffice.' });
  }
};

export default {
  importarPasajeros
};
