import { Logger, UseFilters } from "@nestjs/common";
import { BaseWsExceptionFilter, WebSocketGateway, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from "@nestjs/websockets";
import * as moment from 'moment';
import { Server, Socket } from "socket.io";
import { IntesaVincenteWs } from "./intesavincente.websocket";
import { KeyedCollection } from "../shared/keyed-collection";

@UseFilters(new BaseWsExceptionFilter())
@WebSocketGateway({ path: '/video-call', perMessageDeflate: true, allowEIO3: true })
export class VideoCallWsGateway implements OnGatewayInit<Server>, OnGatewayConnection<Socket>, OnGatewayDisconnect<Socket> {
  
  private readonly socketsPool: KeyedCollection<IntesaVincenteWs> = new KeyedCollection<IntesaVincenteWs>();
  
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('IntesaVincente.Websocket.VideoCall')
  
  constructor() {
  
  }
  
  async afterInit(server: Server) {
    this.logger.log(`Initialized WebSocket.`);
  }
  
  async handleDisconnect( client: Socket ) {
    try {
      const dataDisconnessione = moment().format('YYYY-MM-DD HH:mm:ss');
      
      const ws = this.socketsPool.Item( client.id );
      this.socketsPool.Remove( client.id );
  
      client.broadcast.to(ws.roomId).emit('user-disconnected', client.id);
    }
    catch( ex ) {
      this.logger.error( ex );
    }
  }
  
  async handleConnection(client: Socket, ...args: any[] ) {
    try {
      const dataConnessione = moment().format('YYYY-MM-DD HH:mm:ss');
      this.logger.log(`[${dataConnessione}] Client connected: ${client.id}`);
      const gmws = new IntesaVincenteWs( client );
      this.socketsPool.Add(client.id, gmws);
    }
    catch( ex )
    {
      this.logger.error( ex );
    }
  }
  
  @SubscribeMessage('join-room')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    client.join(payload.roomId); // Aggiungi il client alla stanza
    client.broadcast.to(payload.roomId).emit('user-connected', client.id); // Invia un messaggio a tutti i client della stanza (tranne al client che ha inviato il messaggio)
    
    const ws = this.socketsPool.Item( client.id );
    ws.roomId = payload.roomId;
    
  }
  
  @SubscribeMessage('test-ping')
  handlePing(@ConnectedSocket() client: Socket ): void {
    const dataRicezione = moment().format('YYYY-MM-DD HH:mm:ss');
    
    const ws = this.socketsPool.Item( client.id );
    
    client.emit('pong', { code: 'PONG', message: 'I\'m still alive, don\'t worry.', date: moment().format('YYYY-MM-DD HH:mm:ss') })
    
  }
}