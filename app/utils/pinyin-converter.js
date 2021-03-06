const data = require('../data/pinyin-map');
const syllables = require('../data/pinyin-syllables');
// const numberSyllables = require('../data/pinyin-number-syllables');

// var re1='(z)';
// var re2='(h)';
//
// var p = new RegExp(re1+re2,["i"]);
// var m = p.exec(txt);

// function analyzePinyinAnswer(answer, correctAnswer) {
//   // regex uses a greedy algorithm, put larger initials first
//   let doubleInitials = /(zh)|(ch)|(sh)/;
//   let initials = /(b)|(p)|(m)|(f)|(d)|(t)|(n)|(l)|(g)|(k)|(h)|(j)|(q)|(x)|(z)|(c)|(s)/;

//   let initial = answer.substr(0, 2);

//   return {};
// }

/**
 * @method getData
 * @returns {Object}
 */
function getData () {
  return data;
}

// function getPinyinArray() {
//   let pinyin = [];
//   for (let item in data) {
//     pinyin.push(data[item].pinyin);
//   }
//   return pinyin;
// }

/**
 * @method pinyinToTone
 * @param {String} text
 * @param {Boolean} [includeSpaces]
 * @returns {String}
 */
function pinyinToTone (text, includeSpaces) {
  text = text.toLowerCase();
  let textArray = [];
  if (includeSpaces) {
    textArray = text.match(/[a-z|A-Z]+[0-9]+|\s|,\s|\s\.\.\.\s|'/g);
  } else {
    textArray = text.match(/[a-z|A-Z]+[0-9]+|,\s|\s\.\.\.\s|'/g);
  }
  if (textArray) {
    for (let i = 0, length = textArray.length; i < length; i++) {
      let textItem = textArray[i];
      if (textItem !== ' ... ' &&
        textItem !== '\'' &&
        textItem !== ', ' &&
        textItem !== ' ') {
        if (data[textItem]) {
          textArray[i] = data[textItem].pinyin;
        }
      }
    }
    return textArray.join('');
  } else {
    return '';
  }
}

/**
 * @method pinyinToZhuyin
 * @param {String} text
 * @param {Boolean} [excludeTones]
 * @returns {String}
 */
function pinyinToZhuyin (text, excludeTones) {
  text = text.toLowerCase();

  let zhuyinArray = [];
  let textArray = text.match(/[a-z|A-Z]+[0-9]+|,\s|'|\s\.\.\.\s/g);

  if (textArray) {
    for (let i = 0, length = textArray.length; i < length; i++) {
      let textItem = textArray[i];
      let toneItem = textItem.match(/[0-9]+/g);
      if (textItem !== ' ... ' && textItem !== '\'' && textItem !== ', ') {
        zhuyinArray.push(data[textItem].zhuyin);
        if (!excludeTones && toneItem) {
          zhuyinArray.push(data[toneItem].zhuyin);
        }
      }
      if (textItem === ', ') {
        zhuyinArray.push(textItem);
      }
    }
    return zhuyinArray.join('');
  } else {
    return '';
  }
}

/**
 * @method removeTones
 * @param {String} text
 * @return {String}
 */
function removeToneMarks (text) {
  text = text.toLowerCase();

  for (let syllable in syllables) {
    if (syllables.hasOwnProperty(syllable)) {
      text = text.replace(syllable, syllables[syllable]);
    }
  }

  return text;
}

/**
 * Analyzes a string of text to detect if any tone-marked vowels are contained.
 * E.g. rén returns true, ren2 returns false.
 * @param {String} text
 * @return {Boolean} whether tone-marked vowels are contained.
 */
function hasToneMarks (text) {
  text = text.toLowerCase();

  for (let syllable in syllables) {
    if (syllables.hasOwnProperty(syllable)) {
      if (text.replace(syllable, syllables[syllable]) !== text) {
        return true;
      }
    }
  }

  return false;
}

/**
 * @method removeToneNumbers
 * @param {String} text
 * @return {String}
 */
function removeToneNumbers (text) {
  text = text.toLowerCase();
  text = text.replace(/[0-9]/g, '');
  text = text.replace(/v/g, 'ü');

  return text;
}

module.exports = {
  getData: getData,
  hasToneMarks: hasToneMarks,
  toTone: pinyinToTone,
  toZhuyin: pinyinToZhuyin,
  removeToneMarks: removeToneMarks,
  removeToneNumbers: removeToneNumbers,
};
