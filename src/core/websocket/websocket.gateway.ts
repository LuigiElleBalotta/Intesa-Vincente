import { Logger, UseFilters } from "@nestjs/common";
import { BaseWsExceptionFilter, WebSocketGateway, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from "@nestjs/websockets";
import moment from 'moment';
import { Server, Socket } from "socket.io";
import { KeyedCollection } from "../shared/keyed-collection";
import { IntesaVincenteWs } from "./intesavincente.websocket";
import { WordsSingleton } from "../singletons/words.singleton";

@UseFilters(new BaseWsExceptionFilter())
@WebSocketGateway({ path: '/ws', perMessageDeflate: true, allowEIO3: true })
export class WebsocketGateway implements OnGatewayInit<Server>, OnGatewayConnection<Socket>, OnGatewayDisconnect<Socket> {
  
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('IntesaVincente.Websocket')
  
  private readonly socketsPool: KeyedCollection<IntesaVincenteWs> = new KeyedCollection<IntesaVincenteWs>();
  
  private rooms_stats: Map<string, any> = new Map<string, any>();
  
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
      
      for( let roomId of ws._socketBase.rooms.values() ) {
        this.server.to(roomId).emit('leftRoom', roomId);
      }
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
  
  @SubscribeMessage('joinRoom')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    client.join(payload.roomId); // Aggiungi il client alla stanza
    this.server.to(payload.roomId).emit('joinedRoom', payload.roomId); // Invia un messaggio al client
    const ws = this.socketsPool.Item( client.id );
    ws.player_type = payload.player_type;
    ws.roomId = payload.roomId;
    
    if( !this.rooms_stats.has(payload.roomId) ) {
      this.rooms_stats.set(payload.roomId, {
        roomId: payload.roomId,
        punteggio: 0,
        secondi_rimanenti: 75,
        current_word: 'PAROLA',
      });
    }
    
    this.server.to(payload.roomId).emit('on-joined-room', {stats: this.rooms_stats.get(payload.roomId)});
  }
  
  @SubscribeMessage('new-random-word')
  handleMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: any ): void {
    const dataRicezione = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // const ws = this.socketsPool.Item( client.id );
    this.logger.log(`[${dataRicezione}] Client ${client.id} asked for a new random word. Excluding: ${JSON.stringify(payload)}...`)
    
    const random_word = WordsSingleton.GetRandomWordExcluding(payload.used_random_words);
    this.rooms_stats.get(payload.roomId).current_word = random_word;
    
    this.server.to(payload.roomId).emit('received-new-random-word', {
      random_word: random_word
    });
    
    /*
    if( this.socketsPool.ContainsKey(client.id)) {
      const socket = this.socketsPool.Item(client.id);
    }*/
  }
  
  @SubscribeMessage('request-rooms-list')
  handleRequestRoomsList(@ConnectedSocket() client: Socket, @MessageBody() payload: any ): void {
    const dataRicezione = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // const ws = this.socketsPool.Item( client.id );
    this.logger.log(`[${dataRicezione}] Client ${client.id} asked for rooms list. Payload: ${JSON.stringify(payload)}`)
    
    const rooms = this.socketsPool.Values().map((ws) => {
      return ws.roomId;
    })
      .filter((roomId) => { return roomId != undefined && roomId != null && roomId != '' });
    
    // Get the list of clients in the room from socketsPool
    const ret: Map<string, string[]> = new Map<string, string[]>();
    for( let roomId of rooms ) {
      if( !ret.has(roomId) ) {
        ret.set(roomId, []);
      }
      
      const clients = this.socketsPool.Values().filter((ws) => ws.roomId === roomId);
      
      const clientTypes = clients.map((ws) => ws.player_type);
      
      ret.set(roomId, clientTypes);
    }
    
    const arrayRet = [];
    for( let key of ret.keys()) {
      let punteggio = 0;
      let secondi_rimanenti = 75;
      if( this.rooms_stats.has(key) ) {
        punteggio = this.rooms_stats.get(key).punteggio;
        secondi_rimanenti = this.rooms_stats.get(key).secondi_rimanenti;
      }
      
      arrayRet.push({
        roomId: key,
        players: ret.get(key),
        punteggio: punteggio,
        secondi_rimanenti: secondi_rimanenti
      });
    }
    
  
    this.server.emit('received-rooms-list', {
      rooms: arrayRet
    });
  }
  
  @SubscribeMessage('add-time')
  handleAddTime(@ConnectedSocket() client: Socket, @MessageBody() payload: any ): void {
    const dataRicezione = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // const ws = this.socketsPool.Item( client.id );
    this.logger.log(`[${dataRicezione}] Client ${client.id} wants to add time. Payload: ${JSON.stringify(payload)}`)
  
    this.server.to(payload.roomId).emit('added-time', {
      time: payload.current_remaining_secs
    });
    
    this.rooms_stats.get(payload.roomId).secondi_rimanenti = payload.current_remaining_secs;
  }
  
  @SubscribeMessage('register-timer-tick')
  handleRegisterTimerTick(@ConnectedSocket() client: Socket, @MessageBody() payload: any ): void {
    const dataRicezione = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // const ws = this.socketsPool.Item( client.id );
    this.logger.log(`[${dataRicezione}] Client ${client.id} wants to register timer tick. Payload: ${JSON.stringify(payload)}`)
    
    this.rooms_stats.get(payload.roomId).secondi_rimanenti = payload.current_remaining_secs;
  
    this.server.to(payload.roomId).emit('registered-timer-tick', {});
  }
  
  @SubscribeMessage('prenota')
  handlePrenota(@ConnectedSocket() client: Socket, @MessageBody() payload: any ): void {
    const dataRicezione = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // const ws = this.socketsPool.Item( client.id );
    this.logger.log(`[${dataRicezione}] Client ${client.id} wants to answer. Stopping timer...`)
  
    this.server.to(payload.roomId).emit('stop-countdown', {});
  }
  
  @SubscribeMessage('update-score')
  handleUpdateScore(@ConnectedSocket() client: Socket, @MessageBody() payload: any ): void {
    const dataRicezione = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // const ws = this.socketsPool.Item( client.id );
    this.logger.log(`[${dataRicezione}] Client ${client.id} wants to update score. Payload: ${JSON.stringify(payload)}`)
    
    if( payload.score <= 0 ) {
      payload.score = 0;
    }
    
    this.rooms_stats.get(payload.roomId).punteggio = payload.score;
  
    this.server.to(payload.roomId).emit('updated-score', payload);
  }
  
  @SubscribeMessage('obtain-remaining-secs')
  handleObtainCurrentTimer(@ConnectedSocket() client: Socket, @MessageBody() payload: any ): void {
    const dataRicezione = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // const ws = this.socketsPool.Item( client.id );
    this.logger.log(`[${dataRicezione}] Client ${client.id} wants to obtain current timer. Payload: ${JSON.stringify(payload)}`)
  
    this.server.to(payload.roomId).emit('update-timer', payload);
  }
  
  @SubscribeMessage('request-room-stats')
  handleRequestRoomStats(@ConnectedSocket() client: Socket, @MessageBody() payload: any ): void {
    const dataRicezione = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // const ws = this.socketsPool.Item( client.id );
    this.logger.log(`[${dataRicezione}] Client ${client.id} wants to obtain room stats. Payload: ${JSON.stringify(payload)}`)
    
    const roomStats = this.rooms_stats.get(payload.roomId);
    
  
    this.server.to(payload.roomId).emit('received-room-stats', { stats: roomStats });
  }
  
  @SubscribeMessage('test-ping')
  handlePing(@ConnectedSocket() client: Socket ): void {
    const dataRicezione = moment().format('YYYY-MM-DD HH:mm:ss');
    
    const ws = this.socketsPool.Item( client.id );
    
    client.emit('pong', { code: 'PONG', message: 'I\'m still alive, don\'t worry.', date: moment().format('YYYY-MM-DD HH:mm:ss') })
    
  }
}