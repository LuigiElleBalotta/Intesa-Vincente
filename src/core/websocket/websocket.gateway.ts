import { Logger, UseFilters } from "@nestjs/common";
import { BaseWsExceptionFilter, WebSocketGateway, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from "@nestjs/websockets";
import * as moment from 'moment';
import { Server, Socket } from "socket.io";
import { KeyedCollection } from "../shared/keyed-collection";
import { IntesaVincenteWs } from "./intesavincente.websocket";
import { WordsSingleton } from "../singletons/words.singleton";

interface IRoomTimer {
    remaining_seconds: number;
    interval_ref: any;
}

@UseFilters(new BaseWsExceptionFilter())
@WebSocketGateway({ path: '/ws', perMessageDeflate: true, allowEIO3: true })
export class WebsocketGateway implements OnGatewayInit<Server>, OnGatewayConnection<Socket>, OnGatewayDisconnect<Socket> {
  
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('IntesaVincente.Websocket')
  
  private readonly socketsPool: KeyedCollection<IntesaVincenteWs> = new KeyedCollection<IntesaVincenteWs>();
  
  private rooms_stats: Map<string, any> = new Map<string, any>();
  private rooms_timers: Map<string, IRoomTimer> = new Map<string, IRoomTimer>();
  private rooms_used_words: Map<string, string[]> = new Map<string, string[]>(); // Used words for each room
  
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
    client.broadcast.to(payload.roomId).emit('joinedRoom', payload.roomId); // Invia un messaggio a tutti i client della stanza (tranne al client che ha inviato il messaggio)
    
    // OLD:
    // this.server.to(payload.roomId).emit('joinedRoom', payload.roomId); // Invia un messaggio al client
    
    const ws = this.socketsPool.Item( client.id );
    ws.player_type = payload.player_type;
    ws.roomId = payload.roomId;
    
    // Init room stats
    if( !this.rooms_stats.has(payload.roomId) ) {
      this.rooms_stats.set(payload.roomId, {
        roomId: payload.roomId,
        punteggio: 0,
        secondi_rimanenti: 75,
        current_word: 'GAME NOT STARTED',
        is_paused: true,
        last_word_generated_time: null,
      });
      
      this.rooms_timers.set(payload.roomId, {
        remaining_seconds: 75,
        interval_ref: null
      });
      
      this.rooms_used_words.set(payload.roomId, []);
    }
    
    this.server.to(payload.roomId).emit('on-joined-room', {
      stats: this.rooms_stats.get(payload.roomId)
    });
  }
  
  @SubscribeMessage('new-random-word')
  handleMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: any ): void {
    const dataRicezione = moment().format('YYYY-MM-DD HH:mm:ss');
    // If last_word_generated_time is null or the difference between now and last_word_generated_time is less than 5 second, do nothing
    if( this.rooms_stats.get(payload.roomId).last_word_generated_time && moment().diff(this.rooms_stats.get(payload.roomId).last_word_generated_time, 'seconds') < 5 ) {
      this.logger.log(`[${dataRicezione}] Client ${client.id} asked for a new random word but the last word was generated less than 5 seconds ago...`)
      return;
    }
    
    
    
    // const ws = this.socketsPool.Item( client.id );
    this.logger.log(`[${dataRicezione}] Client ${client.id} asked for a new random word...`)
    
    const random_word = WordsSingleton.GetRandomWordExcluding(this.rooms_used_words.get(payload.roomId));
    
    // Update room stats
    this.rooms_stats.get(payload.roomId).current_word = random_word;

    // Update used words
    this.rooms_used_words.get(payload.roomId).push(random_word);

    // Update last word generated time
    this.rooms_stats.get(payload.roomId).last_word_generated_time = moment().format('YYYY-MM-DD HH:mm:ss');
    
    this.server.to(payload.roomId).emit('received-new-random-word', {
      random_word: random_word
    });
  }
  
  @SubscribeMessage('start-timer')
  handleStartTimer(@ConnectedSocket() client: Socket, @MessageBody() payload: any ): void {
    const dataRicezione = moment().format('YYYY-MM-DD HH:mm:ss');
  
    // const ws = this.socketsPool.Item( client.id );
    this.logger.log(`[${dataRicezione}] Client ${client.id} asked to start the room "${payload.roomId}" timer...`);
    
    const room_timer = this.rooms_timers.get(payload.roomId);
    
    if( room_timer.interval_ref ) {
      this.logger.log(`[${dataRicezione}] Client ${client.id} asked to start the room "${payload.roomId}" timer but it's already running...`);
      return;
    }
    
    room_timer.interval_ref = setInterval(() => {
      this._handleTimerTick(payload.roomId);
    }, 1000);
  }
  
  private _handleTimerTick(roomId: string) {
    const room_timer = this.rooms_timers.get(roomId);
    room_timer.remaining_seconds--;
    this.rooms_stats.get(roomId).secondi_rimanenti = room_timer.remaining_seconds;
  
    if( room_timer.remaining_seconds >= 0 ) {
      this.server.to(roomId).emit('timer-tick', {
        remaining_seconds: room_timer.remaining_seconds
      });
    }
  
    if( room_timer.remaining_seconds <= 0 ) {
      clearInterval(room_timer.interval_ref);
      room_timer.interval_ref = null;
    }
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
  
  @SubscribeMessage('manually-update-time')
  handleAddTime(@ConnectedSocket() client: Socket, @MessageBody() payload: any ): void {
    const dataRicezione = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // const ws = this.socketsPool.Item( client.id );
    this.logger.log(`[${dataRicezione}] Client ${client.id} wants to update time. Payload: ${JSON.stringify(payload)}`)
    
    const method = payload.method;
    const room_timer = this.rooms_timers.get(payload.roomId);
    const room_stats = this.rooms_stats.get(payload.roomId);
    if( method === 'add' ) {
      room_timer.remaining_seconds += 5;
      room_stats.secondi_rimanenti += 5;
    }
    else if( method === 'sub' ) {
      room_timer.remaining_seconds -= 5;
      room_stats.secondi_rimanenti -= 5;
    }
  
    this.server.to(payload.roomId).emit('updated-time', {
      time: room_timer.remaining_seconds
    });
    
    this.rooms_stats.get(payload.roomId).secondi_rimanenti = payload.current_remaining_secs;
  }
  
  @SubscribeMessage('prenota')
  handlePrenota(@ConnectedSocket() client: Socket, @MessageBody() payload: any ): void {
    const dataRicezione = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // const ws = this.socketsPool.Item( client.id );
    this.logger.log(`[${dataRicezione}] Client ${client.id} wants to answer. Stopping timer...`);
    
    // This is needed to prevent to call the timer-tick event
    const room_timer = this.rooms_timers.get(payload.roomId);
    if( room_timer.interval_ref !== null ) {
      clearInterval(room_timer.interval_ref);
      room_timer.interval_ref = null;
    }
  
    this.server.to(payload.roomId).emit('stop-countdown', {});
  }
  
  @SubscribeMessage('update-score')
  handleUpdateScore(@ConnectedSocket() client: Socket, @MessageBody() payload: any ): void {
    const dataRicezione = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // const ws = this.socketsPool.Item( client.id );
    this.logger.log(`[${dataRicezione}] Client ${client.id} wants to update score. Payload: ${JSON.stringify(payload)}`)
    
    const room_stats = this.rooms_stats.get(payload.roomId);
    const method = payload.method;
    let newScore = method === 'add' ? +room_stats.punteggio + 1 : +room_stats.punteggio - 1;
    if( newScore < 0 ) {
      newScore = 0;
    }
    
    room_stats.punteggio = newScore;
    
    this.rooms_stats.set(payload.roomId, room_stats);
  
    this.server.to(payload.roomId).emit('updated-score', {
      score: newScore,
      method: method
    });
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