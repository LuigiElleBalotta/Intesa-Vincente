import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import { registerHandlebars } from "./core/handlebars/handlebars.utils";

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    
    const configService = app.get(ConfigService);
    const appPort = configService.get<number>('app.port', 3000);

    app.useStaticAssets(join(__dirname, '..', 'public'));
    app.setBaseViewsDir(join(__dirname, '..', 'views'));
    registerHandlebars();
    app.setViewEngine('hbs');
    
    app.useGlobalPipes(new ValidationPipe())
    app.enableCors();
    
    await app.listen(appPort);
    
    console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
