import * as fs from 'fs';
import { join } from 'path';
export class WordsSingleton {
    public static words: string[] = [
      "violino",
      "pianoforte",
      "tastiera",
      "chitarra",
      "batteria",
      "tromba",
    ];
    
    public static GetWordsSet( number: number ): void {
      const path = join(__dirname, '..', 'public');
      const wordSetFile = `${path}/words_set_${number}.json`;
      if( fs.existsSync(wordSetFile) ) {
        this.words = JSON.parse(fs.readFileSync(wordSetFile, 'utf8'));
      }
    }
    
    public static GetRandomWordExcluding(excludedWords: string[]): string {
      const words: string[] = this.words.filter(w => !excludedWords.includes(w));
      return words[Math.floor(Math.random() * words.length)];
    }
}

