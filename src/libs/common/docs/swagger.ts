import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function createSwaggerDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('WhatsApp Service API')
    .setDescription(
      'Link WhatsApp Business, retrieve the pairing QR, list joined groups, and send group messages. ' +
        'Use Authorize with WHATSAPP_API_TOKEN (paste the token without the Bearer prefix). ' +
        'Start with POST /whatsapp/connect, then poll GET /whatsapp/status or GET /whatsapp/qr. ' +
        'Saved sessions reconnect without generating a QR. Incoming group monitoring runs automatically after connecting; it has no HTTP endpoint.',
    )
    .setVersion('1.0')
    .addTag('WhatsApp', 'Pairing, connection status, groups, and messaging')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        description: 'The WHATSAPP_API_TOKEN configured on the server',
      },
      'whatsapp-token',
    )
    .build();
  return SwaggerModule.createDocument(app, config);
}

export function setupSwagger(app: INestApplication) {
  const document = createSwaggerDocument(app);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: {
      persistAuthorization: false,
      displayRequestDuration: true,
    },
    customSiteTitle: 'WhatsApp Service API',
  });
}
