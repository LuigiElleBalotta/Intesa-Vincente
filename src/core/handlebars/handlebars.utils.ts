import * as hbs from 'hbs';
const fs = require('fs');
const path = require('path');

export function registerHandlebars() {
  var dir = path.join(__dirname, '..', '..', '..', 'views', 'partials');
  //console.log(partialsDir);
  
  const walkSync = (dir, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
      
      filelist = fs.statSync(path.join(dir, file)).isDirectory()
        ? walkSync(path.join(dir, file), filelist)
        : filelist.concat(path.join(dir, file));
      
    });
    return filelist;
  }
  
  var filelist = walkSync(dir);
  if (filelist.length > 0) {
    filelist.forEach(function (filename) {
      var matches = /^([^.]+).hbs$/.exec(path.basename(filename));
      if (!matches) {
        return;
      }
      var name = matches[1];
      var template = fs.readFileSync(filename, 'utf8');
      hbs.registerPartial(name, template);
      console.log(`Registered partial: "${name}"`)
    });
  }
  
  hbs.registerHelper('json', function(context){
    return JSON.stringify(context);
  })
  
  hbs.registerHelper('ifEquals', function(arg1, arg2, options){
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this)
  })
  
  hbs.registerHelper('isTrue', function(context){
    return Boolean(context);
  })
  
  hbs.registerHelper('isNotNull', function(arg) {
    return arg && arg !== null && arg !== '' && arg !== undefined;
  });
  
  hbs.registerHelper('stringNotNullOrWhitespace', function (value, options) {
    if (!value) { return options.fn(this); }
    return value.replace(/\s*/g, '').length === 0
      ? options.fn(this)
      : options.inverse(this);
  })
  
  hbs.registerHelper('eachByKey', function(dic, key) {
    const map = dic as Map<any, any[]>;
    if( map.has(key)) {
      return map.get(key);
    }
    else {
      return []
    }
  });
  
  hbs.registerHelper('ifCond', function(v1, operator, v2, options) {
    switch (operator) {
      case '==':
        return (v1 == v2) ? options.fn(this) : options.inverse(this);
      case '===':
        return (v1 === v2) ? options.fn(this) : options.inverse(this);
      case '!=':
        return (v1 != v2) ? options.fn(this) : options.inverse(this);
      case '!==':
        return (v1 !== v2) ? options.fn(this) : options.inverse(this);
      case '<':
        return (v1 < v2) ? options.fn(this) : options.inverse(this);
      case '<=':
        return (v1 <= v2) ? options.fn(this) : options.inverse(this);
      case '>':
        return (v1 > v2) ? options.fn(this) : options.inverse(this);
      case '>=':
        return (v1 >= v2) ? options.fn(this) : options.inverse(this);
      case '&&':
        return (v1 && v2) ? options.fn(this) : options.inverse(this);
      case '||':
        return (v1 || v2) ? options.fn(this) : options.inverse(this);
      default:
        return options.inverse(this);
    }
  })
  
  hbs.registerHelper('isLengthGtZero', function(arg) {
    return arg && Array.from(arg).length > 0;
  });
  
  hbs.registerHelper('check', function(value, comparator) {
    return (value === comparator) ? '' : value;
  });
  
  hbs.registerHelper('descById', function(id, array){
    if( array ) {
      const arr = Array.from(array);
      const idx = arr.findIndex(x => x["ID"] === id);
      if( idx > -1 ) {
        return arr[idx]["Descrizione"];
      }
      else {
        return '';
      }
    }
    else {
      return '';
    }
    
  })
}