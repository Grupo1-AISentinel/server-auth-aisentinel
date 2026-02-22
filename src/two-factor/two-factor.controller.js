import {
  generateSetupAsync,
  verifyAndEnableAsync,
  disableAsync,
  getStatusAsync,
  regenerateRecoveryCodesAsync,
} from '../../helpers/two-factor-operations.js';
import { asyncHandler } from '../../middlewares/server-genericError-handler.js';


export const setup = asyncHandler(async (req, res) => {
  try {
    const result = await generateSetupAsync(
      req.userId,
      req.user.Email
    );

    res.status(200).json({
      success: true,
      message: 'Escanea el código QR con tu app Authenticator (Google Authenticator, Authy, etc.), luego llama a /verify-and-enable con el código generado.',
      ...result,
    });
  } catch (error) {
    console.error('Error in two-factor/setup controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al generar el setup de 2FA',
      error: error.message,
    });
  }
});


export const verifyAndEnable = asyncHandler(async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'El campo "code" es requerido.',
      });
    }

    const result = await verifyAndEnableAsync(req.userId, code.trim());

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in two-factor/verify-and-enable controller:', error);

    let statusCode = 400;
    if (error.message.includes('inválido') || error.message.includes('expirado')) {
      statusCode = 401;
    } else if (error.message.includes('no encontrado')) {
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al verificar el código',
      error: error.message,
    });
  }
});


export const disable = asyncHandler(async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'El campo "code" es requerido.',
      });
    }

    const result = await disableAsync(req.userId, code.trim());

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in two-factor/disable controller:', error);

    let statusCode = 400;
    if (error.message.includes('inválido')) {
      statusCode = 401;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al deshabilitar el 2FA',
      error: error.message,
    });
  }
});


export const getStatus = asyncHandler(async (req, res) => {
  try {
    const result = await getStatusAsync(req.userId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Error in two-factor/status controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener el estado del 2FA',
      error: error.message,
    });
  }
});


export const regenerateRecoveryCodes = asyncHandler(async (req, res) => {
  try {
    const result = await regenerateRecoveryCodesAsync(req.userId);
    res.status(200).json({
      success: true,
      message: 'Códigos de recuperación regenerados. Guárdalos en un lugar seguro.',
      ...result,
    });
  } catch (error) {
    console.error('Error in two-factor/recovery-codes controller:', error);

    let statusCode = 500;
    if (error.message.includes('no encontrado')) {
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al generar códigos de recuperación',
      error: error.message,
    });
  }
});
