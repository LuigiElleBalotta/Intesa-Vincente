import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from "@nestjs/config";
import configuration from "./core/config/configuration";
import { WebsocketModule } from "./core/websocket/websocket.module";

@Module({
    imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
          load: [configuration],
        }),
        WebsocketModule
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
