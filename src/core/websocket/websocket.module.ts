import { Module } from "@nestjs/common";
import { WebsocketGateway } from "./websocket.gateway";
import { VideoCallWsGateway } from "./video-call.gateway";

@Module({
  imports: [
  
  ],
  providers: [
    WebsocketGateway,
    VideoCallWsGateway
  ],
  exports: [
  ]
})
export class WebsocketModule {}