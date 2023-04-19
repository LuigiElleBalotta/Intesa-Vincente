import { All, Controller, Next, Req, Res } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PeerServerService } from './peer-server.service';

@Controller('/peer-server')
export class PeerServerController {
  constructor(private readonly peerServerService: PeerServerService) {}
  
  @All('*')
  server(
    @Req() request: Request,
    @Res() response: Response,
    @Next() next: NextFunction,
  ) {
    const entryPointPath = '/peer-server/';
    request.url = request.url.replace(entryPointPath, '/');
    console.log('in route peer: ', request.url);
    this.peerServerService.peerServer(request, response, next);
  }
}