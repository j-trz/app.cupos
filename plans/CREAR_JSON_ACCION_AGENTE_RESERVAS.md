# Crear JSON para Acción de Agente de Reservas

Este documento explica cómo crear un JSON para una acción de agente que realiza reservas y devuelve una respuesta ordenada con los datos a nivel de usuario.

## Introducción

En el sistema de gestión de cupos, las acciones de agentes son comandos que pueden ser ejecutados por el sistema de IA para realizar tareas específicas. Las acciones de reservas permiten crear nuevas reservas a través del asistente de IA, proporcionando una interfaz natural para interactuar con el sistema.

## Estructura del JSON de una Acción de Agente para Reservas

Una acción de agente para reservas debe seguir esta estructura JSON:

```json
{
  "name": "crear_reserva",
  "description": "Crea una nueva reserva de viaje aéreo para un cliente",
  "parameters": {
    "type": "object",
    "properties": {
      "productId": {
        "type": "string",
        "description": "ID del producto de viaje"
      },
      "departureDate": {
        "type": "string",
        "format": "date",
        "description": "Fecha de salida del viaje (YYYY-MM-DD)"
      },
      "passengers": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "firstName": {
              "type": "string",
              "description": "Nombre del pasajero"
            },
            "lastName": {
              "type": "string",
              "description": "Apellido del pasajero"
            },
            "documentNumber": {
              "type": "string",
              "description": "Número de documento de identidad"
            },
            "birthDate": {
              "type": "string",
              "format": "date",
              "description": "Fecha de nacimiento (YYYY-MM-DD)"
            },
            "email": {
              "type": "string",
              "format": "email",
              "description": "Correo electrónico del pasajero"
            },
            "phone": {
              "type": "string",
              "description": "Número de teléfono del pasajero"
            },
            "passengerType": {
              "type": "string",
              "enum": ["adult", "child", "infant"],
              "description": "Tipo de pasajero (adulto, niño, infante)"
            }
          },
          "required": ["firstName", "lastName", "documentNumber", "birthDate", "passengerType"]
        }
      },
      "agencyId": {
        "type": "string",
        "description": "ID de la agencia que realiza la reserva"
      },
      "notes": {
        "type": "string",
        "description": "Notas adicionales para la reserva"
      }
    },
    "required": ["productId", "departureDate", "passengers", "agencyId"]
  },
  "handler": "reservation_handler",
  "response_format": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "description": "Indica si la operación fue exitosa"
      },
      "reservationId": {
        "type": "string",
        "description": "ID único de la reserva creada"
      },
      "status": {
        "type": "string",
        "enum": ["pending", "confirmed", "cancelled"],
        "description": "Estado actual de la reserva"
      },
      "totalPrice": {
        "type": "number",
        "description": "Precio total de la reserva"
      },
      "passengerCount": {
        "type": "number",
        "description": "Cantidad total de pasajeros"
      },
      "itinerary": {
        "type": "object",
        "properties": {
          "origin": {
            "type": "string",
            "description": "Ciudad de origen"
          },
          "destination": {
            "type": "string",
            "description": "Ciudad de destino"
          },
          "departureDate": {
            "type": "string",
            "format": "date",
            "description": "Fecha de salida"
          },
          "returnDate": {
            "type": "string",
            "format": "date",
            "description": "Fecha de regreso (si aplica)"
          }
        }
      },
      "passengerDetails": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "description": "ID único del pasajero en la reserva"
            },
            "fullName": {
              "type": "string",
              "description": "Nombre completo del pasajero"
            },
            "documentNumber": {
              "type": "string",
              "description": "Número de documento de identidad"
            },
            "passengerType": {
              "type": "string",
              "description": "Tipo de pasajero (adulto, niño, infante)"
            }
          }
        }
      },
      "bookingReference": {
        "type": "string",
        "description": "Referencia de la reserva para seguimiento"
      },
      "confirmationDate": {
        "type": "string",
        "format": "date-time",
        "description": "Fecha y hora de confirmación de la reserva"
      },
      "agencyInfo": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "Nombre de la agencia"
          },
          "contact": {
            "type": "string",
            "description": "Información de contacto de la agencia"
          }
        }
      }
    }
  }
}
```

## Ejemplo de Uso

Cuando el asistente de IA recibe una solicitud como "Haz una reserva para Juan Pérez en el viaje a Cancún del 15 de agosto", puede convertir esta solicitud en una llamada con este formato:

```json
{
  "action": "crear_reserva",
  "params": {
    "productId": "prod_cancun_agosto_2026",
    "departureDate": "2026-08-15",
    "agencyId": "agency_12345",
    "passengers": [
      {
        "firstName": "Juan",
        "lastName": "Pérez",
        "documentNumber": "12345678",
        "birthDate": "1985-06-15",
        "email": "juan.perez@example.com",
        "phone": "+521234567890",
        "passengerType": "adult"
      }
    ],
    "notes": "Cliente solicitó asiento junto a la ventana"
  }
}
```

## Respuesta Esperada

La acción debe devolver una respuesta estructurada con todos los detalles relevantes:

```json
{
  "success": true,
  "reservationId": "res_abc123def456",
  "status": "pending",
  "totalPrice": 1250.00,
  "passengerCount": 1,
  "itinerary": {
    "origin": "CDMX",
    "destination": "CANCÚN",
    "departureDate": "2026-08-15",
    "returnDate": "2026-08-22"
  },
  "passengerDetails": [
    {
      "id": "pass_789xyz",
      "fullName": "Juan Pérez",
      "documentNumber": "12345678",
      "passengerType": "adult"
    }
  ],
  "bookingReference": "JP85XQ",
  "confirmationDate": "2026-07-08T03:25:02Z",
  "agencyInfo": {
    "name": "Viajes ABC",
    "contact": "contacto@viajesabc.com"
  }
}
```

## Consideraciones Importantes

1. **Validación de Datos**: Asegúrate de validar todos los campos requeridos antes de procesar la reserva.
2. **Disponibilidad**: Verifica la disponibilidad del producto antes de crear la reserva.
3. **Precios**: Calcula correctamente los precios según el tipo de pasajero (adulto, niño, infante).
4. **Errores**: Devuelve mensajes de error claros si falla alguna validación.
5. **Seguridad**: Asegúrate de que el agente tenga permisos para crear reservas en la agencia especificada.

## Integración con el Sistema

Las acciones de agentes están integradas con el sistema de IA del backend y pueden ser utilizadas en conversaciones naturales para automatizar procesos como la creación de reservas.