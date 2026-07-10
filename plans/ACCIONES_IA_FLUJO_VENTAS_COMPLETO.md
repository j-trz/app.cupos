# Acciones de IA para Flujo de Ventas Completo

Este documento describe todas las acciones necesarias que deben estar disponibles para que la IA pueda gestionar un flujo de ventas completo en el sistema de gestión de cupos de viajes aéreos.

## 1. Acciones de Búsqueda y Consulta

### Buscar Productos Disponibles
```json
{
  "name": "buscar_productos_disponibles",
  "description": "Busca productos de viaje disponibles según criterios especificados",
  "parameters": {
    "type": "object",
    "properties": {
      "destino": {
        "type": "string",
        "description": "Destino del viaje (ciudad o país)"
      },
      "fecha_salida_desde": {
        "type": "string",
        "format": "date",
        "description": "Fecha mínima de salida (YYYY-MM-DD)"
      },
      "fecha_salida_hasta": {
        "type": "string",
        "format": "date",
        "description": "Fecha máxima de salida (YYYY-MM-DD)"
      },
      "numero_pasajeros": {
        "type": "integer",
        "minimum": 1,
        "description": "Número total de pasajeros"
      },
      "tipo_viaje": {
        "type": "string",
        "enum": ["ida_vuelta", "solo_ida", "multi_destino"],
        "description": "Tipo de trayecto"
      },
      "categoria_producto": {
        "type": "string",
        "enum": ["economico", "premium", "vip"],
        "description": "Categoría del producto"
      }
    },
    "required": ["destino", "fecha_salida_desde", "fecha_salida_hasta"]
  },
  "response_format": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "description": "Indica si la operación fue exitosa"
      },
      "productos": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "description": "ID único del producto"
            },
            "nombre": {
              "type": "string",
              "description": "Nombre del producto"
            },
            "destino": {
              "type": "string",
              "description": "Destino del viaje"
            },
            "origen": {
              "type": "string",
              "description": "Origen del viaje"
            },
            "fecha_salida": {
              "type": "string",
              "format": "date",
              "description": "Fecha de salida"
            },
            "fecha_regreso": {
              "type": "string",
              "format": "date",
              "description": "Fecha de regreso"
            },
            "precio_unitario": {
              "type": "number",
              "description": "Precio por persona"
            },
            "disponibilidad": {
              "type": "integer",
              "description": "Número de cupos disponibles"
            },
            "descripcion": {
              "type": "string",
              "description": "Descripción detallada del producto"
            },
            "categoria": {
              "type": "string",
              "description": "Categoría del producto"
            }
          }
        }
      },
      "total_resultados": {
        "type": "integer",
        "description": "Número total de productos encontrados"
      }
    }
  }
}
```

### Consultar Detalles de Producto
```json
{
  "name": "consultar_detalles_producto",
  "description": "Obtiene información detallada de un producto específico",
  "parameters": {
    "type": "object",
    "properties": {
      "producto_id": {
        "type": "string",
        "description": "ID del producto a consultar"
      }
    },
    "required": ["producto_id"]
  },
  "response_format": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "description": "Indica si la operación fue exitosa"
      },
      "producto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "ID del producto"
          },
          "nombre": {
            "type": "string",
            "description": "Nombre del producto"
          },
          "descripcion": {
            "type": "string",
            "description": "Descripción detallada"
          },
          "destino": {
            "type": "string",
            "description": "Destino del viaje"
          },
          "origen": {
            "type": "string",
            "description": "Origen del viaje"
          },
          "fecha_salida": {
            "type": "string",
            "format": "date",
            "description": "Fecha de salida"
          },
          "fecha_regreso": {
            "type": "string",
            "format": "date",
            "description": "Fecha de regreso"
          },
          "hora_salida": {
            "type": "string",
            "format": "time",
            "description": "Hora de salida"
          },
          "hora_regreso": {
            "type": "string",
            "format": "time",
            "description": "Hora de regreso"
          },
          "precio_adulto": {
            "type": "number",
            "description": "Precio por adulto"
          },
          "precio_nino": {
            "type": "number",
            "description": "Precio por niño"
          },
          "precio_infante": {
            "type": "number",
            "description": "Precio por infante"
          },
          "incluye": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Qué está incluido en el producto"
          },
          "no_incluye": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Qué no está incluido en el producto"
          },
          "disponibilidad": {
            "type": "integer",
            "description": "Número de cupos disponibles"
          },
          "politicas_cancelacion": {
            "type": "string",
            "description": "Políticas de cancelación"
          }
        }
      }
    }
  }
}
```

## 2. Acciones de Gestión de Clientes

### Registrar Cliente Nuevo
```json
{
  "name": "registrar_cliente",
  "description": "Registra un nuevo cliente en el sistema",
  "parameters": {
    "type": "object",
    "properties": {
      "nombre": {
        "type": "string",
        "description": "Nombre del cliente"
      },
      "apellido": {
        "type": "string",
        "description": "Apellido del cliente"
      },
      "documento_tipo": {
        "type": "string",
        "enum": ["dni", "pasaporte", "cedula"],
        "description": "Tipo de documento"
      },
      "documento_numero": {
        "type": "string",
        "description": "Número de documento"
      },
      "email": {
        "type": "string",
        "format": "email",
        "description": "Correo electrónico"
      },
      "telefono": {
        "type": "string",
        "description": "Número de teléfono"
      },
      "direccion": {
        "type": "string",
        "description": "Dirección del cliente"
      },
      "fecha_nacimiento": {
        "type": "string",
        "format": "date",
        "description": "Fecha de nacimiento (YYYY-MM-DD)"
      },
      "preferencias_viaje": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Preferencias de viaje del cliente"
      }
    },
    "required": ["nombre", "apellido", "documento_tipo", "documento_numero", "email"]
  },
  "response_format": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "description": "Indica si la operación fue exitosa"
      },
      "cliente_id": {
        "type": "string",
        "description": "ID único del cliente registrado"
      },
      "mensaje": {
        "type": "string",
        "description": "Mensaje de confirmación"
      }
    }
  }
}
```

### Buscar Cliente Existente
```json
{
  "name": "buscar_cliente",
  "description": "Busca un cliente existente en el sistema",
  "parameters": {
    "type": "object",
    "properties": {
      "documento_numero": {
        "type": "string",
        "description": "Número de documento para buscar"
      },
      "email": {
        "type": "string",
        "format": "email",
        "description": "Correo electrónico para buscar"
      }
    },
    "oneOf": [
      {"required": ["documento_numero"]},
      {"required": ["email"]}
    ]
  },
  "response_format": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "description": "Indica si la operación fue exitosa"
      },
      "cliente": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "ID del cliente"
          },
          "nombre": {
            "type": "string",
            "description": "Nombre del cliente"
          },
          "apellido": {
            "type": "string",
            "description": "Apellido del cliente"
          },
          "documento_tipo": {
            "type": "string",
            "description": "Tipo de documento"
          },
          "documento_numero": {
            "type": "string",
            "description": "Número de documento"
          },
          "email": {
            "type": "string",
            "format": "email",
            "description": "Correo electrónico"
          },
          "telefono": {
            "type": "string",
            "description": "Teléfono del cliente"
          },
          "historial_reservas": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "description": "ID de la reserva"
                },
                "producto": {
                  "type": "string",
                  "description": "Nombre del producto"
                },
                "fecha_viaje": {
                  "type": "string",
                  "format": "date",
                  "description": "Fecha del viaje"
                },
                "estado": {
                  "type": "string",
                  "description": "Estado de la reserva"
                }
              }
            }
          },
          "preferencias_viaje": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Preferencias de viaje"
          }
        }
      }
    }
  }
}
```

## 3. Acciones de Gestión de Reservas

### Crear Reserva
```json
{
  "name": "crear_reserva",
  "description": "Crea una nueva reserva de viaje",
  "parameters": {
    "type": "object",
    "properties": {
      "producto_id": {
        "type": "string",
        "description": "ID del producto seleccionado"
      },
      "cliente_id": {
        "type": "string",
        "description": "ID del cliente que hace la reserva"
      },
      "pasajeros": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "nombre": {
              "type": "string",
              "description": "Nombre del pasajero"
            },
            "apellido": {
              "type": "string",
              "description": "Apellido del pasajero"
            },
            "documento_numero": {
              "type": "string",
              "description": "Número de documento del pasajero"
            },
            "fecha_nacimiento": {
              "type": "string",
              "format": "date",
              "description": "Fecha de nacimiento del pasajero"
            },
            "tipo_pasajero": {
              "type": "string",
              "enum": ["adult", "child", "infant"],
              "description": "Tipo de pasajero"
            },
            "email": {
              "type": "string",
              "format": "email",
              "description": "Correo electrónico del pasajero"
            },
            "telefono": {
              "type": "string",
              "description": "Teléfono del pasajero"
            }
          },
          "required": ["nombre", "apellido", "documento_numero", "fecha_nacimiento", "tipo_pasajero"]
        }
      },
      "metodo_pago": {
        "type": "string",
        "enum": ["tarjeta_credito", "tarjeta_debito", "transferencia", "efectivo"],
        "description": "Método de pago elegido"
      },
      "comentarios": {
        "type": "string",
        "description": "Comentarios adicionales para la reserva"
      }
    },
    "required": ["producto_id", "cliente_id", "pasajeros"]
  },
  "response_format": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "description": "Indica si la operación fue exitosa"
      },
      "reserva_id": {
        "type": "string",
        "description": "ID único de la reserva creada"
      },
      "referencia_pago": {
        "type": "string",
        "description": "Referencia del pago generado"
      },
      "estado": {
        "type": "string",
        "enum": ["pendiente_pago", "confirmada", "en_proceso"],
        "description": "Estado actual de la reserva"
      },
      "monto_total": {
        "type": "number",
        "description": "Monto total de la reserva"
      },
      "detalles_reserva": {
        "type": "object",
        "properties": {
          "producto": {
            "type": "string",
            "description": "Nombre del producto"
          },
          "fecha_salida": {
            "type": "string",
            "format": "date",
            "description": "Fecha de salida"
          },
          "fecha_regreso": {
            "type": "string",
            "format": "date",
            "description": "Fecha de regreso"
          },
          "cantidad_pasajeros": {
            "type": "integer",
            "description": "Número total de pasajeros"
          },
          "monto_detalle": {
            "type": "object",
            "properties": {
              "subtotal": {
                "type": "number"
              },
              "impuestos": {
                "type": "number"
              },
              "descuentos": {
                "type": "number"
              },
              "total": {
                "type": "number"
              }
            }
          }
        }
      }
    }
  }
}
```

### Confirmar Reserva
```json
{
  "name": "confirmar_reserva",
  "description": "Confirma una reserva pendiente",
  "parameters": {
    "type": "object",
    "properties": {
      "reserva_id": {
        "type": "string",
        "description": "ID de la reserva a confirmar"
      }
    },
    "required": ["reserva_id"]
  },
  "response_format": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "description": "Indica si la operación fue exitosa"
      },
      "reserva_id": {
        "type": "string",
        "description": "ID de la reserva confirmada"
      },
      "estado": {
        "type": "string",
        "description": "Nuevo estado de la reserva"
      },
      "fecha_confirmacion": {
        "type": "string",
        "format": "date-time",
        "description": "Fecha y hora de confirmación"
      },
      "codigo_confirmacion": {
        "type": "string",
        "description": "Código de confirmación generado"
      },
      "mensaje_cliente": {
        "type": "string",
        "description": "Mensaje para informar al cliente"
      }
    }
  }
}
```

### Consultar Detalles de Reserva
```json
{
  "name": "consultar_detalles_reserva",
  "description": "Consulta los detalles completos de una reserva",
  "parameters": {
    "type": "object",
    "properties": {
      "reserva_id": {
        "type": "string",
        "description": "ID de la reserva a consultar"
      }
    },
    "required": ["reserva_id"]
  },
  "response_format": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "description": "Indica si la operación fue exitosa"
      },
      "reserva": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "ID de la reserva"
          },
          "estado": {
            "type": "string",
            "enum": ["pendiente_pago", "confirmada", "cancelada", "finalizada"],
            "description": "Estado actual de la reserva"
          },
          "producto": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "description": "ID del producto"
              },
              "nombre": {
                "type": "string",
                "description": "Nombre del producto"
              },
              "descripcion": {
                "type": "string",
                "description": "Descripción del producto"
              },
              "destino": {
                "type": "string",
                "description": "Destino del viaje"
              },
              "origen": {
                "type": "string",
                "description": "Origen del viaje"
              },
              "fecha_salida": {
                "type": "string",
                "format": "date",
                "description": "Fecha de salida"
              },
              "fecha_regreso": {
                "type": "string",
                "format": "date",
                "description": "Fecha de regreso"
              }
            }
          },
          "cliente": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "description": "ID del cliente"
              },
              "nombre_completo": {
                "type": "string",
                "description": "Nombre completo del cliente"
              },
              "email": {
                "type": "string",
                "format": "email",
                "description": "Correo electrónico del cliente"
              },
              "telefono": {
                "type": "string",
                "description": "Teléfono del cliente"
              }
            }
          },
          "pasajeros": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "description": "ID del pasajero en la reserva"
                },
                "nombre_completo": {
                  "type": "string",
                  "description": "Nombre completo del pasajero"
                },
                "documento_numero": {
                  "type": "string",
                  "description": "Número de documento"
                },
                "tipo_pasajero": {
                  "type": "string",
                  "enum": ["adult", "child", "infant"],
                  "description": "Tipo de pasajero"
                },
                "edad": {
                  "type": "integer",
                  "description": "Edad del pasajero"
                }
              }
            }
          },
          "monto_total": {
            "type": "number",
            "description": "Monto total de la reserva"
          },
          "fecha_creacion": {
            "type": "string",
            "format": "date-time",
            "description": "Fecha de creación de la reserva"
          },
          "fecha_confirmacion": {
            "type": "string",
            "format": "date-time",
            "description": "Fecha de confirmación (si aplica)"
          },
          "referencia_pago": {
            "type": "string",
            "description": "Referencia del pago"
          },
          "comentarios": {
            "type": "string",
            "description": "Comentarios adicionales"
          }
        }
      }
    }
  }
}
```

## 4. Acciones de Seguimiento y Notificaciones

### Enviar Confirmación por Email
```json
{
  "name": "enviar_confirmacion_email",
  "description": "Envía la confirmación de la reserva por correo electrónico",
  "parameters": {
    "type": "object",
    "properties": {
      "reserva_id": {
        "type": "string",
        "description": "ID de la reserva a confirmar"
      },
      "destinatarios": {
        "type": "array",
        "items": {
          "type": "string",
          "format": "email"
        },
        "description": "Lista de correos electrónicos destinatarios"
      },
      "mensaje_personalizado": {
        "type": "string",
        "description": "Mensaje adicional opcional"
      }
    },
    "required": ["reserva_id", "destinatarios"]
  },
  "response_format": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "description": "Indica si la operación fue exitosa"
      },
      "emails_enviados": {
        "type": "integer",
        "description": "Número de correos enviados"
      },
      "mensaje": {
        "type": "string",
        "description": "Mensaje de confirmación"
      }
    }
  }
}
```

### Registrar Seguimiento de Venta
```json
{
  "name": "registrar_seguimiento_venta",
  "description": "Registra una actividad de seguimiento para una venta",
  "parameters": {
    "type": "object",
    "properties": {
      "reserva_id": {
        "type": "string",
        "description": "ID de la reserva relacionada"
      },
      "tipo_actividad": {
        "type": "string",
        "enum": ["contacto_inicial", "presentacion_producto", "negociacion", "venta_realizada", "venta_perdida", "seguimiento_postventa"],
        "description": "Tipo de actividad de seguimiento"
      },
      "descripcion": {
        "type": "string",
        "description": "Descripción detallada de la actividad"
      },
      "resultado": {
        "type": "string",
        "enum": ["exitoso", "pendiente", "fallido", "en_progreso"],
        "description": "Resultado de la actividad"
      },
      "proximos_pasos": {
        "type": "string",
        "description": "Acciones recomendadas para el futuro"
      }
    },
    "required": ["reserva_id", "tipo_actividad", "descripcion"]
  },
  "response_format": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "description": "Indica si la operación fue exitosa"
      },
      "registro_id": {
        "type": "string",
        "description": "ID del registro de seguimiento"
      },
      "mensaje": {
        "type": "string",
        "description": "Mensaje de confirmación"
      }
    }
  }
}
```

## 5. Acciones de Análisis y Reportes

### Obtener Métricas de Venta
```json
{
  "name": "obtener_metricas_venta",
  "description": "Obtiene métricas clave de ventas para un período",
  "parameters": {
    "type": "object",
    "properties": {
      "fecha_inicio": {
        "type": "string",
        "format": "date",
        "description": "Fecha de inicio del período (YYYY-MM-DD)"
      },
      "fecha_fin": {
        "type": "string",
        "format": "date",
        "description": "Fecha final del período (YYYY-MM-DD)"
      },
      "agencia_id": {
        "type": "string",
        "description": "ID de la agencia (opcional)"
      }
    },
    "required": ["fecha_inicio", "fecha_fin"]
  },
  "response_format": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "description": "Indica si la operación fue exitosa"
      },
      "metricas": {
        "type": "object",
        "properties": {
          "ventas_totales": {
            "type": "number",
            "description": "Total de ventas realizadas"
          },
          "ingresos_totales": {
            "type": "number",
            "description": "Ingresos totales generados"
          },
          "conversion_rate": {
            "type": "number",
            "description": "Tasa de conversión (porcentaje)"
          },
          "venta_promedio": {
            "type": "number",
            "description": "Valor promedio de venta"
          },
          "destinos_mas_populares": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "destino": {
                  "type": "string",
                  "description": "Nombre del destino"
                },
                "ventas": {
                  "type": "integer",
                  "description": "Número de ventas"
                }
              }
            }
          },
          "tendencia_mensual": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "mes": {
                  "type": "string",
                  "description": "Mes y año (MM/YYYY)"
                },
                "ventas": {
                  "type": "integer",
                  "description": "Número de ventas"
                },
                "ingresos": {
                  "type": "number",
                  "description": "Ingresos del mes"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## Implementación del Flujo de Ventas

Con estas acciones, la IA puede manejar un flujo de ventas completo:

1. **Captación de clientes**: Buscar productos disponibles según intereses
2. **Gestión de clientes**: Registrar nuevos clientes o recuperar datos de existentes
3. **Creación de reservas**: Procesar la compra de productos
4. **Confirmación**: Validar y confirmar las reservas
5. **Comunicación**: Enviar confirmaciones y mantener informados a los clientes
6. **Seguimiento**: Registrar actividades de venta y próximos pasos
7. **Análisis**: Obtener métricas para mejorar el proceso de ventas

Estas acciones permiten que la IA actúe como un asistente de ventas completo, manejando desde la primera interacción hasta la entrega del servicio y el análisis posterior.