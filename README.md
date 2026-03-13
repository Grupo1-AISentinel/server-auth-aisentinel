# AISentinel Core API - Grupo 1 IN6BV

Este proyecto es el servidor principal desarrollado en Node.js y MongoDB para el AISentinel. Se encarga de la gestión de usarios, transacciones, productos y favoritos, delegando la autenticación de usuarios a un microservicio externo construido en .NET.

## Tecnologías Utilizadas

El sistema está construido sobre el ecosistema de JavaScript utilizando **Node.js** con el framework **Express**. La persistencia de datos se maneja mediante **MongoDB** y **Mongoose**. Para la seguridad, se implementan **JSON Web Tokens (JWT)**, limitadores de peticiones con Express Rate Limit y cabeceras de seguridad con Helmet. La conversión de divisas en tiempo real se logra mediante la integración con la API de **FastForex**.

## Instalación y Configuración

1. Clonar el repositorio en el entorno local.
2. Ejecutar `pnpm install` para instalar todas las dependencias listadas en el `package.json`.
3. Crear un archivo `.env` en la raíz, guiándose por el esquema proporcionado en la sección de Variables de Entorno.
4. Asegurarse de tener el servicio de base de datos MongoDB en ejecución local o proporcionar una URI de Mongo Atlas.
5. Ejecutar el comando `pnpm run dev` para iniciar el servidor con recarga en caliente a través de Nodemon.

## Variables de Entorno (.env)

El archivo de configuración debe contener las siguientes claves para el correcto funcionamiento del servidor:

PORT=3069

URI_MONGO=mongodb://localhost:27017/DBAiSentinel

JWT_SECRET=tu_secreto_aqui

JWT_ISSUER=AuthService

JWT_AUDIENCE=AuthService

FASTFOREX_API_KEY=tu_api_key_aqui

## Rutas Principales (Endpoints)

| Módulo | Método | Endpoint | Descripción |
|---|---|---|---|
| **Auth** | POST | `/api/v1/auth/register` | Registra un nuevo usuario en el sistema y crea su cuenta de autenticación. |
| **Auth** | POST | `/api/v1/auth/login` | Autentica al usuario con sus credenciales y devuelve el token de acceso. |
| **Auth** | POST | `/api/v1/auth/verify-email` | Verifica la dirección de correo electrónico del usuario mediante un código o token de verificación. |
| **Auth** | POST | `/api/v1/auth/resend-verification` | Reenvía el correo de verificación de cuenta al usuario. |
| **Auth** | POST | `/api/v1/auth/forgot-password` | Inicia el proceso de recuperación de contraseña enviando un enlace o código al correo del usuario. |
| **Auth** | POST | `/api/v1/auth/reset-password` | Permite al usuario establecer una nueva contraseña usando el token de recuperación. |
| **Auth** | GET | `/api/v1/auth/profile` | Obtiene la información del perfil del usuario autenticado. |
| **Auth** | POST | `/api/v1/auth/profile/by-id` | Obtiene la información del perfil de un usuario específico mediante su ID. |
| **Auth** | POST | `/api/v1/auth/verify-2fa` | Verifica el código de autenticación de dos factores durante el inicio de sesión. |
| **two-factor** | POST | `/api/v1/two-factor/setup` | Inicia la configuración de autenticación de dos factores (2FA) para el usuario. |
| **two-factor** | GET | `/api/v1/two-factor/setup/qr` | Genera y devuelve el código QR para configurar 2FA en una aplicación autenticadora. |
| **two-factor** | POST | `/api/v1/two-factor/verify-and-enable` | Verifica el código 2FA y habilita la autenticación de dos factores en la cuenta. |
| **two-factor** | POST | `/api/v1/two-factor/disable` | Deshabilita la autenticación de dos factores para el usuario autenticado. |
| **two-factor** | GET | `/api/v1/two-factor/status` | Consulta el estado actual de la autenticación de dos factores para la cuenta. |
| **two-factor** | POST | `/api/v1/two-factor/recovery-codes` | Genera o regenera códigos de recuperación para acceder a la cuenta si se pierde el dispositivo 2FA. |
| **Users** | POST | `/api/v1/users/:userId/role` | Asigna un rol específico a un usuario. |
| **Users** | POST | `/api/v1/users/:userId/roles` | Asigna múltiples roles a un usuario. |
| **Users** | GET | `/api/v1/users/by-role/:roleName` | Obtiene la lista de usuarios que poseen un rol específico. |