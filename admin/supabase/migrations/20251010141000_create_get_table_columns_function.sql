CREATE OR REPLACE FUNCTION get_table_columns(p_table_name TEXT)
RETURNS TABLE(column_name TEXT, data_type TEXT, is_nullable TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.column_name::TEXT,
        c.data_type::TEXT,
        c.is_nullable::TEXT
    FROM
        information_schema.columns c
    WHERE
        c.table_schema = 'public' AND c.table_name = p_table_name;
END;
$$ LANGUAGE plpgsql;

-- Also, let's create the service_credentials table that we've been assuming exists.
CREATE TABLE IF NOT EXISTS service_credentials (
    connection_id UUID PRIMARY KEY,
    connection_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    credentials JSONB NOT NULL,
    column_mapping JSONB,
    is_active BOOLEAN DEFAULT FALSE,
    last_tested_at TIMESTAMPTZ,
    connection_status TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);