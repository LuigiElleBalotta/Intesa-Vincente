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
      const path = join(__dirname, '..', '..', '..', 'public');
      const wordSetFile = `${path}/words_set_${number}.json`;
      console.log('wordSetFile', wordSetFile);
      if( fs.existsSync(wordSetFile) ) {
        WordsSingleton.words = JSON.parse(fs.readFileSync(wordSetFile, 'utf8'));
      }
      else {
        console.log('File not found');
      }
    }
    
    public static GetRandomWordExcluding(excludedWords: string[]): string {
      const words: string[] = WordsSingleton.words.filter(w => !excludedWords.includes(w));
      return words[Math.floor(Math.random() * words.length)];
    }
}

