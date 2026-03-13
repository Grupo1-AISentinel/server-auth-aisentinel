'use strict';

import { Router } from 'express';
import { createInternalUser, deleteInternalUser } from './internal.controller.js';

const router = Router();

const validateInternalToken = (req, res, next) => {
  const token = req.headers['x-internal-token'];
  if (!token || token !== process.env.INTERNAL_API_TOKEN) {
    return res.status(401).json({
      success: false,
      message: 'Token interno inválido o ausente',
    });
  }
  next();
};

router.use(validateInternalToken);

router.post('/users', createInternalUser);
router.delete('/users/:userId', deleteInternalUser);

export default router;
