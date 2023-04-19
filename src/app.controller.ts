import { Controller, Get, Param, Query, Render, Res, UnauthorizedException } from "@nestjs/common";
import { AppService } from './app.service';
import { Response } from 'express';
import { WordsSingleton } from "./core/singletons/words.singleton";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('index')
  getIndex(): any {
    return {};
  }
  
  @Get('set-words-set/:wordsSet')
  setWordsSet(@Res() res: Response, @Param('wordsSet') wordsSet: number ) {
    WordsSingleton.GetWordsSet(+wordsSet);
    res.redirect('/');
  }
  
  @Get('get-current-words-set')
  getWordsSet(@Res() res: Response): any {
    res.status(200).json(WordsSingleton.words);
  }
  
  @Get('room-list')
  @Render('room-list')
  getRoomList(): any {
    return {};
  }
  
  @Get('test-videochat')
  @Render('test-videochat')
  getTestVideochat(): any {
    return {};
  }
  
  @Get('game')
  @Render('game')
  getGame(@Query('roomId') roomId: string, @Query('privilege') privilege): any {
    switch(privilege) {
      case 'conduttore':
        return {
          view_add_score: true,
          view_remove_score: true,
          view_next_round: true,
          view_stop_round: true,
          view_word: true,
        };
      case 'giocatore':
        return {
          view_add_score: false,
          view_remove_score: false,
          view_next_round: false,
          view_stop_round: true,
          view_word: false,
        };
      case 'spettatore':
        return {
          view_add_score: false,
          view_remove_score: false,
          view_next_round: false,
          view_stop_round: false,
          view_word: true,
        }
    }
    throw new UnauthorizedException("Invalid privilege");
  }
}
