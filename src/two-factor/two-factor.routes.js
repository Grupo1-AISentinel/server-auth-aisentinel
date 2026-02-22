import { Router } from 'express';
import { validateJWT } from '../../middlewares/validate-JWT.js';
import { requestLimit } from '../../middlewares/request-limit.js';
import * as twoFactorController from './two-factor.controller.js';

const router = Router();

router.post('/setup', validateJWT, twoFactorController.setup);

router.post(
  '/verify-and-enable',
  validateJWT,
  twoFactorController.verifyAndEnable
);

router.post('/disable', validateJWT, twoFactorController.disable);
router.get('/status', validateJWT, twoFactorController.getStatus);

router.post(
  '/recovery-codes',
  requestLimit,
  validateJWT,
  twoFactorController.regenerateRecoveryCodes
);

export default router;
