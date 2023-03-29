import { Module } from "@nestjs/common";
import { WebsocketGateway } from "./websocket.gateway";

@Module({
  imports: [
  
  ],
  providers: [
    WebsocketGateway
  ],
  exports: [
  ]
})
export class WebsocketModule {}