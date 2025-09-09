import { useState, useEffect } from "react";
import { FaQrcode, FaKey, FaShieldAlt, FaCopy, FaCheck, FaDownload, FaExclamationTriangle, FaArrowLeft } from "react-icons/fa";
import TwoFactorService from "../services/twoFactorService";

/**
 * Componente para configurar autenticación de doble factor
 */
export default function TwoFactorSetup({ onComplete, onCancel }) {
  const [step, setStep] = useState(1); // 1: QR, 2: Verify, 3: Backup Codes
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrCodeData, setQrCodeData] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [savedBackupCodes, setSavedBackupCodes] = useState(false);

  useEffect(() => {
    initializeSetup();
  }, []);

  /**
   * Inicializar configuración 2FA
   */
  const initializeSetup = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await TwoFactorService.setup2FA();
      
      if (result.success) {
        setQrCodeData({
          factorId: result.factorId,
          qrCodeURI: result.qrCodeURI,
          secret: result.secret,
          qrImageURL: await TwoFactorService.generateQRCodeDataURL(result.qrCodeURI),
        });
      } else {
        setError(result.error || "Error al inicializar configuración 2FA");
      }
    } catch (error) {
      console.error("Error initializing 2FA setup:", error);
      setError("Error inesperado al configurar 2FA");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verificar código 2FA
   */
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    if (!TwoFactorService.validateCodeFormat(verificationCode)) {
      setError("El código debe tener 6 dígitos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await TwoFactorService.verify2FASetup(
        qrCodeData.factorId,
        verificationCode
      );

      if (result.success) {
        setBackupCodes(result.backupCodes);
        setStep(3); // Mostrar códigos de backup
      } else {
        setError(result.error || "Código incorrecto");
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      setError("Error al verificar código");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Copiar secreto al portapapeles
   */
  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch (error) {
      console.error("Error copying secret:", error);
    }
  };

  /**
   * Descargar códigos de backup
   */
  const downloadBackupCodes = () => {
    const content = [
      "CÓDIGOS DE BACKUP - AUTENTICACIÓN DE DOBLE FACTOR",
      "==========================================",
      "",
      "IMPORTANTE: Guarde estos códigos en un lugar seguro.",
      "Cada código solo puede usarse una vez.",
      "",
      "Códigos:",
      ...backupCodes.map((code, index) => `${index + 1}. ${code}`),
      "",
      `Generado: ${new Date().toLocaleString("es-ES")}`,
      "",
      "⚠️  ADVERTENCIA:",
      "• No comparta estos códigos con nadie",
      "• Guárdelos en un lugar seguro y accesible",
      "• Úselos solo si no tiene acceso a su app autenticadora",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-codes-2fa-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSavedBackupCodes(true);
  };

  /**
   * Completar configuración
   */
  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  /**
   * Renderizar paso 1: Escanear QR
   */
  const renderQRStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <FaQrcode className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Escanear Código QR
        </h3>
        <p className="text-gray-600">
          Use su aplicación autenticadora para escanear el código QR
        </p>
      </div>

      {qrCodeData?.qrImageURL && (
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
            <img
              src={qrCodeData.qrImageURL}
              alt="Código QR para 2FA"
              className="w-48 h-48"
            />
          </div>
        </div>
      )}

      {/* Configuración manual */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <FaKey className="text-gray-600" />
          Configuración Manual
        </h4>
        <p className="text-sm text-gray-600 mb-3">
          Si no puede escanear el QR, use esta clave secreta:
        </p>
        
        <div className="flex items-center gap-2 p-3 bg-white rounded border font-mono text-sm">
          <code className="flex-1 break-all">{qrCodeData?.secret}</code>
          <button
            onClick={copySecret}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Copiar clave"
          >
            {copiedSecret ? <FaCheck className="text-green-600" /> : <FaCopy />}
          </button>
        </div>

        <div className="mt-3 text-xs text-gray-500 space-y-1">
          <p><strong>Cuenta:</strong> {TwoFactorService.CONFIG.APP_NAME}</p>
          <p><strong>Tipo:</strong> Basado en tiempo (TOTP)</p>
        </div>
      </div>

      {/* Apps recomendadas */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Apps Recomendadas:</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• Google Authenticator</p>
          <p>• Microsoft Authenticator</p>
          <p>• Authy</p>
          <p>• 1Password</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={() => setStep(2)}
          disabled={!qrCodeData}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continuar
        </button>
      </div>
    </div>
  );

  /**
   * Renderizar paso 2: Verificar código
   */
  const renderVerifyStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <FaShieldAlt className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Verificar Configuración
        </h3>
        <p className="text-gray-600">
          Ingrese el código de 6 dígitos de su aplicación autenticadora
        </p>
      </div>

      <form onSubmit={handleVerifyCode} className="space-y-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
            Código de verificación
          </label>
          <input
            id="code"
            type="text"
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setVerificationCode(value);
              setError("");
            }}
            placeholder="000000"
            className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={6}
            autoComplete="off"
          />
          <p className="text-xs text-gray-500 mt-1">
            El código cambia cada 30 segundos
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <FaArrowLeft />
            Volver
          </button>
          <button
            type="submit"
            disabled={loading || verificationCode.length !== 6}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Verificando...
              </div>
            ) : (
              "Verificar"
            )}
          </button>
        </div>
      </form>
    </div>
  );

  /**
   * Renderizar paso 3: Códigos de backup
   */
  const renderBackupCodesStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
          <FaKey className="h-8 w-8 text-yellow-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Códigos de Backup
        </h3>
        <p className="text-gray-600">
          Guarde estos códigos en un lugar seguro. Puede usarlos si pierde acceso a su aplicación.
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FaExclamationTriangle className="text-yellow-600 mt-1 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Importante:</p>
            <ul className="space-y-1 text-xs">
              <li>• Cada código solo puede usarse una vez</li>
              <li>• Guárdelos en un lugar seguro y accesible</li>
              <li>• No los comparta con nadie</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
          {backupCodes.map((code, index) => (
            <div
              key={index}
              className="bg-white p-2 rounded border text-center"
            >
              {code}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={downloadBackupCodes}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <FaDownload />
          Descargar
        </button>
        <button
          onClick={handleComplete}
          disabled={!savedBackupCodes}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {savedBackupCodes ? "Completar" : "Primero descargue los códigos"}
        </button>
      </div>

      {savedBackupCodes && (
        <div className="text-center text-sm text-green-600">
          ✅ Códigos guardados. Puede completar la configuración.
        </div>
      )}
    </div>
  );

  if (loading && !qrCodeData) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span className={step >= 1 ? "text-blue-600 font-medium" : ""}>QR Code</span>
          <span className={step >= 2 ? "text-blue-600 font-medium" : ""}>Verificar</span>
          <span className={step >= 3 ? "text-blue-600 font-medium" : ""}>Backup</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Step content */}
      {step === 1 && renderQRStep()}
      {step === 2 && renderVerifyStep()}
      {step === 3 && renderBackupCodesStep()}
    </div>
  );
}