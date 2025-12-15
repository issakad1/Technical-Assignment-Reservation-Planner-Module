import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('RENTALL Reservation Planner API')
    .setDescription('API for managing vehicle reservations and fleet operations')
    .setVersion('1.0')
    .addTag('reservations')
    .addTag('customers')
    .addTag('vehicles')
    .addTag('locations')
    .addTag('analytics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`
  🚀 RENTALL Reservation Planner API is running!
  
  📍 Local:            http://localhost:${port}
  📚 API Docs:         http://localhost:${port}/api/docs
  🔗 API Endpoint:     http://localhost:${port}/api/v1
  `);
}

bootstrap();
