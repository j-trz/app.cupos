import { useState } from "react";
import ConnectionService from "../services/connectionService";

const DiagnoseConnectionCredentials = ({ connectionId }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDiagnose = async () => {
    setLoading(true);
    try {
      const res = await ConnectionService.diagnoseConnectionCredentials(connectionId);
      setResult(res);
    } catch (error) {
      setResult({ success: false, error: error.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 24, background: "#f8fafc", borderRadius: 8 }}>
      <h2>Diagnóstico de Credenciales</h2>
      <button onClick={handleDiagnose} disabled={loading} style={{ margin: '16px 0px' , padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer'}}>
        {loading ? "Diagnóstico en progreso..." : "Ejecutar diagnóstico"}
      </button>
      {result && (
        <pre style={{ background: "#fff", padding: 12, borderRadius: 6 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default DiagnoseConnectionCredentials;