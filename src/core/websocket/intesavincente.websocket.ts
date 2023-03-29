import { Logger } from "@nestjs/common";
import * as moment from "moment";
import { Server, Socket } from "socket.io";

export class IntesaVincenteWs {
  private logger: Logger = new Logger('IntesaVincente.Websocket')
  
  _socketBase: Socket;
  player_type: string;
  roomId: string;
  
  constructor( baseSocket: Socket ) {
    this._socketBase = baseSocket;
  }
  
  /*
  askDatiUltimoPrelievo(): void {
    const dataAttuale = moment().format('YYYY-MM-DD HH:mm:ss');
    this._socketBase.emit('DatiUltimoPrelievo', { "DataToAsk": "DatiUltimoPrelievo", "RequestDate": dataAttuale })
  }
   */
}