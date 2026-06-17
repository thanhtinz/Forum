import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Sau reverse proxy (Caddy) — để rate-limit lấy đúng IP client
  try { (app.getHttpAdapter().getInstance() as any).set('trust proxy', 1); } catch {}

  // /api cho backend; chừa các route SEO ở gốc
  app.setGlobalPrefix('api', { exclude: ['sitemap.xml', 'rss.xml', 'robots.txt', 'thread'] });
  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') ?? '*',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 Forum API running on http://localhost:${port}/api`);
}
bootstrap();
