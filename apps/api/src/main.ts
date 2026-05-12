import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const staticRoot = join(process.cwd(), 'static');
  mkdirSync(staticRoot, { recursive: true });
  app.useStaticAssets(staticRoot, {
    prefix: '/static/',
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  logger.log(`API listening on http://localhost:${port}`);
}

void bootstrap();
