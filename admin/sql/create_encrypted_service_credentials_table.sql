-- Tabla para almacenar credenciales de servicio encriptadas para uso del backend.
-- Esta tabla está altamente restringida y solo se puede acceder a través de funciones de SECURITY DEFINER.
CREATE TABLE
  public.encrypted_service_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    connection_id UUID NOT NULL REFERENCES public.data_connections (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    encrypted_credentials TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

-- Habilitar la seguridad a nivel de fila (RLS)
ALTER TABLE public.encrypted_service_credentials ENABLE ROW LEVEL SECURITY;

-- Comentarios para la tabla y las columnas
COMMENT ON TABLE public.encrypted_service_credentials IS 'Almacena credenciales encriptadas para que las usen las tareas del servidor (cron jobs). El acceso está muy restringido.';
COMMENT ON COLUMN public.encrypted_service_credentials.connection_id IS 'FK a la tabla data_connections.';
COMMENT ON COLUMN public.encrypted_service_credentials.encrypted_credentials IS 'El blob de credenciales, encriptado con la MASTER_ENCRYPTION_KEY.';

-- Políticas de RLS: Denegar todo el acceso directo.
-- El acceso solo se concederá a través de funciones con privilegios elevados (SECURITY DEFINER).
-- Las funciones que se ejecutan con el rol de servicio (service_role) omitirán estas políticas.

CREATE POLICY "Deny all access to everyone"
ON public.encrypted_service_credentials
FOR ALL
USING (false)
WITH CHECK (false);

-- Trigger para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_encrypted_service_credentials_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_encrypted_service_credentials_update
BEFORE UPDATE ON public.encrypted_service_credentials
FOR EACH ROW
EXECUTE PROCEDURE public.handle_encrypted_service_credentials_update();
