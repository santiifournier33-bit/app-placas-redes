# Guía de Configuración AWS Remotion Lambda

Para que la generación de **Videos MP4** funcione sin costos fijos, necesitamos conectar tu aplicación con tu cuenta de AWS. Sigue estos 4 pasos en tu terminal:

## Paso 1: Instalar AWS CLI y loguearse
Si no tienes el CLI de AWS instalado en tu PC, instálalo desde [aquí](https://aws.amazon.com/cli/). Luego:
```bash
aws configure
```
*(Te pedirá el Access Key y Secret Key de un usuario administrador de tu cuenta AWS).*

## Paso 2: Conceder permisos a Remotion
Ejecuta el siguiente comando en la carpeta de este proyecto para que Remotion configure los permisos necesarios de Lambda en AWS de forma automática:
```bash
npx remotion lambda setup
```
Al finalizar, copiará un nombre de función, algo como: `remotion-render-14-12-0`

## Paso 3: Subir tu código a la nube (S3)
Para que AWS pueda generar el video, debe conocer el código de tu animación. Ejecuta esto para empaquetarlo y enviarlo al S3 de tu cuenta:
```bash
npx remotion lambda sites create src/remotion/Root.tsx
```
Te devolverá una URL pública como: `https://remotionlambda-xxx.s3.us-east-1.amazonaws.com/sites/my-site/index.html`

## Paso 4: Actualizar tus Variables de Entorno
Abre tu archivo `.env.local` (o configúralo en Netlify) y pega esos dos valores que obtuviste:

```env
REMOTION_AWS_REGION="us-east-1"
REMOTION_AWS_FUNCTION_NAME="remotion-render-xxx"
REMOTION_AWS_SERVE_URL="https://remotionlambda-xxx.s3.us-east-1.amazonaws.com/sites/my-site/index.html"
```

---
¡Listo! Cuando un usuario pulse "Publicar Reel", la app iniciará el renderizado en AWS y obtendrá el MP4 finalizado para enviar a Zernio en ~20 segundos.
