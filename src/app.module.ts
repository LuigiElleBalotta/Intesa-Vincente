import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from "@nestjs/config";
import configuration from "./core/config/configuration";
import { WebsocketModule } from "./core/websocket/websocket.module";
import { PeerServerController } from "./core/peer-server/peer-server.controller";
import { PeerServerService } from "./core/peer-server/peer-server.service";

@Module({
    imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
          load: [configuration],
        }),
        WebsocketModule
    ],
    controllers: [AppController, PeerServerController],
    providers: [AppService, PeerServerService],
})
export class AppModule {}
