import { Injectable } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressPeerServer, PeerServerEvents } from 'peer';
import { Express } from 'express';
@Injectable()
export class PeerServerService {
  peerServer: Express & PeerServerEvents;
  enablePeerServer(app: NestExpressApplication) {
    this.peerServer = ExpressPeerServer(app.getHttpServer(), {
      path: '/peer-server',
      port: 3301,
      createWebSocketServer: (options) => {
        return app.getHttpServer().listen(3301);
      }
    });
    console.log('peer server: ', this.peerServer);
    this.peerServer.get('/test', (req, res) => {
      res.send('hello');
    });
  }
}