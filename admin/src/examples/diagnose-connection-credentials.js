// Diagnóstico de credenciales guardadas para una conexión específica
import ConnectionService from "../services/connectionService";

(async () => {
  const connectionId = "45984b74-dd53-49e8-8abc-5d04654a7480"; // Cambia por el ID que necesites probar
  const result = await ConnectionService.diagnoseConnectionCredentials(
    connectionId
  );
  console.log("Resultado diagnóstico:", result);

  // También puedes guardar el resultado en un archivo si lo necesitas
  // import fs from 'fs';
  // fs.writeFileSync('diagnosis_result.json', JSON.stringify(result, null, 2));
})();
