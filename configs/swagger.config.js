export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'AISentinel Core API',
    version: '1.0.0',
    description: 'Documentación oficial del Core Server para AISentinel del grupo 1, IN6BV.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Ruta base'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Ingresa tu JWT token proporcionado por el AuthService',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          surname: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string' },
          status: { type: 'boolean' },
        },
      },
      TwoFactorStatus: {
        type: 'object',
        properties: {
          isEnabled: { type: 'boolean' },
          hasRecoveryCodes: { type: 'boolean' },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    // ===============================
    // AUTH
    // ===============================
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registrar un nuevo usuario',
        description: 'Requiere ADMIN_ROLE y JWT válido. Permite registrar un usuario con perfil y foto.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['name', 'surname', 'username', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Juan' },
                  surname: { type: 'string', example: 'Pérez' },
                  username: { type: 'string', example: 'juanp' },
                  email: { type: 'string', example: 'juan@example.com' },
                  password: { type: 'string', example: '12345678' },
                  profilePicture: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Usuario registrado exitosamente' },
          '400': { description: 'Error de validación' },
          '409': { description: 'Usuario ya existe' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login de usuario',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['emailOrUsername', 'password'],
                properties: {
                  emailOrUsername: { type: 'string', example: 'juan@example.com' },
                  password: { type: 'string', example: '12345678' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Login exitoso' },
          '401': { description: 'Credenciales incorrectas o usuario bloqueado' },
        },
      },
    },
    '/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verificar correo electrónico',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } },
            },
          },
        },
        responses: {
          '200': { description: 'Email verificado exitosamente' },
          '401': { description: 'Token inválido o expirado' },
          '404': { description: 'Token no encontrado' },
        },
      },
    },
    '/auth/resend-verification': {
      post: {
        tags: ['Auth'],
        summary: 'Reenviar email de verificación',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string' } } } } },
        },
        responses: {
          '200': { description: 'Email de verificación reenviado' },
          '404': { description: 'Usuario no encontrado' },
          '400': { description: 'Usuario ya verificado' },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Solicitar reseteo de contraseña',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string' } } } } },
        },
        responses: {
          '200': { description: 'Instrucciones enviadas al correo (si existe)' },
          '503': { description: 'Error al enviar email' },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Resetear contraseña',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['token', 'newPassword'], properties: { token: { type: 'string' }, newPassword: { type: 'string' } } } } },
        },
        responses: {
          '200': { description: 'Contraseña reseteada correctamente' },
          '400': { description: 'Error de validación' },
          '401': { description: 'Token inválido o expirado' },
          '404': { description: 'Token no encontrado' },
        },
      },
    },
    '/auth/profile': {
      get: {
        tags: ['Auth'],
        summary: 'Obtener perfil del usuario actual',
        responses: {
          '200': { description: 'Perfil obtenido exitosamente', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          '401': { description: 'JWT inválido o no proporcionado' },
        },
      },
    },
    '/auth/profile/by-id': {
      post: {
        tags: ['Auth'],
        summary: 'Obtener perfil de usuario por ID',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['userId'], properties: { userId: { type: 'string' } } } } } },
        responses: {
          '200': { description: 'Perfil obtenido' },
          '400': { description: 'userId requerido' },
          '404': { description: 'Usuario no encontrado' },
        },
      },
    },
    '/auth/verify-2fa': {
      post: {
        tags: ['Auth'],
        summary: 'Verificar código 2FA',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['code'], properties: { code: { type: 'string' } } } } } },
        responses: {
          '200': { description: 'Login exitoso con 2FA' },
          '400': { description: 'Código requerido o 2FA no activado' },
          '401': { description: 'Código inválido o token expirado' },
        },
      },
    },

    // ===============================
    // TWO-FACTOR
    // ===============================
    '/two-factor/setup': {
      post: {
        tags: ['Two-Factor'],
        summary: 'Generar setup de 2FA',
        responses: {
          '200': { description: 'Setup generado exitosamente' },
          '409': { description: '2FA ya activado' },
          '500': { description: 'Error interno' },
        },
      },
    },
    '/two-factor/setup/qr': {
      get: {
        tags: ['Two-Factor'],
        summary: 'Obtener QR del 2FA',
        responses: {
          '200': { description: 'Imagen QR (PNG)', content: { 'image/png': { schema: { type: 'string', format: 'binary' } } } },
          '404': { description: 'QR no encontrado' },
          '409': { description: '2FA ya activado' },
          '500': { description: 'Error interno' },
        },
      },
    },
    '/two-factor/verify-and-enable': {
      post: {
        tags: ['Two-Factor'],
        summary: 'Verificar código y habilitar 2FA',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['code'], properties: { code: { type: 'string' } } } } } },
        responses: {
          '200': { description: '2FA habilitado' },
          '400': { description: 'Código inválido' },
          '401': { description: 'Token inválido o expirado' },
          '404': { description: 'Usuario no encontrado' },
        },
      },
    },
    '/two-factor/disable': {
      post: {
        tags: ['Two-Factor'],
        summary: 'Deshabilitar 2FA',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['code'], properties: { code: { type: 'string' } } } } } },
        responses: {
          '200': { description: '2FA deshabilitado' },
          '400': { description: 'Código inválido' },
          '401': { description: 'Código incorrecto' },
        },
      },
    },
    '/two-factor/status': {
      get: {
        tags: ['Two-Factor'],
        summary: 'Obtener estado del 2FA',
        responses: {
          '200': { description: 'Estado obtenido', content: { 'application/json': { schema: { $ref: '#/components/schemas/TwoFactorStatus' } } } },
          '500': { description: 'Error interno' },
        },
      },
    },
    '/two-factor/recovery-codes': {
      post: {
        tags: ['Two-Factor'],
        summary: 'Regenerar códigos de recuperación',
        responses: {
          '200': { description: 'Códigos regenerados' },
          '404': { description: 'Usuario no encontrado' },
          '500': { description: 'Error interno' },
        },
      },
    },

    // ===============================
    // USER
    // ===============================
    '/users/{userId}/role': {
      put: {
        tags: ['Users'],
        summary: 'Actualizar rol de usuario',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['roleName'], properties: { roleName: { type: 'string' } } } } } },
        responses: {
          '200': { description: 'Rol actualizado' },
          '400': { description: 'Rol no permitido' },
          '403': { description: 'Forbidden, no es admin' },
          '404': { description: 'Usuario no encontrado' },
        },
      },
    },
    '/users/{userId}/roles': {
      get: {
        tags: ['Users'],
        summary: 'Obtener roles de un usuario',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Roles obtenidos' },
          '401': { description: 'JWT inválido' },
        },
      },
    },
    '/users/by-role/{roleName}': {
      get: {
        tags: ['Users'],
        summary: 'Obtener usuarios por rol',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'roleName', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Lista de usuarios' },
          '400': { description: 'Rol no permitido' },
          '403': { description: 'Forbidden, no es admin' },
        },
      },
    },
  },
};