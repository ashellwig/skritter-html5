const SkritterModel = require('base/BaseSkritterModel');
const PromptItemCollection = require('collections/PromptItemCollection');
const PromptItemModel = require('models/PromptItemModel');

/**
 * @class ItemModel
 * @extends {SkritterModel}
 */
const ItemModel = SkritterModel.extend({

  /**
   * @property consecutiveWrong
   * @type {Number}
   */
  consecutiveWrong: 0,

  /**
   * @property idAttribute
   * @type {String}
   */
  idAttribute: 'id',

  /**
   * @property urlRoot
   * @type {String}
   */
  urlRoot: 'items',

  /**
   * @method ban
   */
  ban: function() {
    this.getVocab().banPart(this.get('part'));
  },

  /**
   * Forcefully bump the next value two weeks into the future.
   * @method bump
   * @returns {ItemModel}
   */
  bump: function() {
    this.set('next', moment(this.get('next')).add(2, 'weeks').unix());
    return this;
  },

  /**
   * @property defaults
   * @type {Object}
   */
  defaults: function() {
    return {
      vocabIds: [],
      vocabListIds: []
    };
  },

  /**
   * @method getBase
   * @returns {String}
   */
  getBase: function() {
    return this.id.split('-')[2];
  },

  /**
   * @method getContainedItems
   * @returns {Array}
   */
  getContainedItems: function() {
    let containedItems = [];
    let part = this.get('part');
    if (['rune', 'tone'].indexOf(part) > -1) {
      let containedVocabs = this.getContainedVocabs();
      for (let i = 0, length = containedVocabs.length; i < length; i++) {
        let vocabId = containedVocabs[i].id;
        let splitId = vocabId.split('-');
        let fallbackId = [app.user.id, splitId[0], splitId[1], 0, part].join('-');
        let intendedId = [app.user.id, vocabId, part].join('-');
        if (this.collection.get(intendedId)) {
          containedItems.push(this.collection.get(intendedId));
        } else if (this.collection.get(fallbackId)) {
          containedItems.push(this.collection.get(fallbackId));
        } else {
          containedItems.push(this.collection.add(
            {
              id: fallbackId,
              writing: splitId[1]
            },
            {merge: true}
          ));
        }
      }
    }
    return containedItems;
  },

  /**
   * @method getContainedVocabs
   * @returns {Array}
   */
  getContainedVocabs: function() {
    let vocab = this.getVocab();
    return vocab ? vocab.getContained() : [];
  },

  /**
   * @method getPromptItems
   * @returns {PromptItemCollection}
   */
  getPromptItems: function() {
    let promptItems = new PromptItemCollection();
    let containedItems = this.getContainedItems();
    let containedVocabs = this.getContainedVocabs();
    let now = Date.now();
    let part = this.get('part');
    let vocab = this.getVocab();
    let characters = [];
    let items = [];
    let vocabs = [];

    switch (part) {
      case 'rune':
        characters = vocab.getPromptCharacters();
        items = containedItems.length ? containedItems : [this];
        vocabs = containedVocabs.length ? containedVocabs : [vocab];
        break;
      case 'tone':
        characters = vocab.getPromptTones();
        items = containedItems.length ? containedItems : [this];
        vocabs = containedVocabs.length ? containedVocabs : [vocab];
        break;
      default:
        items = [this];
        vocabs = [vocab];
    }

    for (let i = 0, length = vocabs.length; i < length; i++) {
      let childItem = items[i];
      let childVocab = vocabs[i];
      let promptItem = new PromptItemModel();
      promptItem.character = characters[i];
      promptItem.interval = childItem.get('interval');
      promptItem.item = childItem;
      promptItem.vocab = childVocab;
      if (i === 0 && vocabs.length > 1) {
        promptItem.set('submitTime', Date.now() / 1000);
      }
      if (_.includes(['rune', 'tone'], part)) {
        promptItem.set('filler', characters[i] ? childVocab.isFiller() : true);
        promptItem.set('complete', characters[i] ? childVocab.isFiller() : true);
      } else {
        promptItem.set('filler', false);
      }
      promptItem.set('kana', childVocab.isKana());
      promptItems.add(promptItem);
    }

    promptItems.created = now;
    promptItems.group = now + '_' + this.id;
    promptItems.interval = this.get('interval');
    promptItems.item = this;
    promptItems.part = part;
    promptItems.readiness = this.getReadiness();
    promptItems.vocab = vocab;

    return promptItems;
  },

  /**
   * @method getReadiness
   * @param {Number} [startingAt]
   * @returns {Number}
   */
  getReadiness: function(startingAt) {
    if (!this.get('last')) {
      return 9999;
    }

    const now = startingAt || moment().unix();
    const actualAgo = now - this.get('last');
    const scheduledAgo = this.get('next') - this.get('last');

    return actualAgo / scheduledAgo;
  },

  /**
   * @method getVariation
   * @returns {Number}
   */
  getVariation: function() {
    return parseInt(this.id.split('-')[3], 10);
  },

  /**
   * @method getVocab
   * @returns {Vocab}
   */
  getVocab: function() {
    let vocabs = this.getVocabs();
    return vocabs[this.get('reviews') % vocabs.length];
  },

  /**
   * @method getVocabs
   * @returns {Array}
   */
  getVocabs: function() {
    let vocabs = [];
    let vocabIds = this.get('vocabIds');
    let reviewSimplified = app.user.get('reviewSimplified');
    let reviewTraditional = app.user.get('reviewTraditional');
    for (let i = 0, length = vocabIds.length; i < length; i++) {
      let vocab = this.collection.vocabs.get(vocabIds[i]);
      if (vocab) {
        let vocabStyle = vocab.get('style');
        if (vocab.isChinese()) {
          if (reviewSimplified && vocabStyle === 'simp') {
            vocabs.push(vocab);
          } else if (reviewTraditional && vocabStyle === 'trad') {
            vocabs.push(vocab);
          } else if (vocabStyle === 'both') {
            vocabs.push(vocab);
          } else if (vocabStyle === 'none') {
            vocabs.push(vocab);
          }
        } else {
          vocabs.push(vocab);
        }
      }
    }
    return vocabs;
  },

  /**
   * @method isActive
   * @returns {Boolean}
   */
  isActive: function() {
    return this.get('vocabIds').length > 0;
  },

  /**
   * Determines whether the current item is banned
   * @method isBanned
   * @returns {Boolean}
   */
  isBanned: function() {
    const vocab = this.getVocab();
    if (vocab) {
      return _.includes(this.getVocab().get('bannedParts'), this.get('part'));
    }

    return false;
  },

  /**
   * @method isCharacterDataLoaded
   * @returns {Boolean}
   */
  isCharacterDataLoaded: function() {
    let vocabCharacters = this.getVocab().getCharactersWithoutFillers();
    let loadedCharacters = app.user.characters.pluck('writing');

    return _.every(vocabCharacters, character => _.includes(loadedCharacters, character));
  },

  /**
   * @method isChinese
   * @returns {Boolean}
   */
  isChinese: function() {
    return this.get('lang') === 'zh';
  },

  /**
   * @method isJapanese
   * @returns {Boolean}
   */
  isJapanese: function() {
    return this.get('lang') === 'ja';
  },

  /**
   * @method isKana
   * @returns {Boolean}
   */
  isKana: function() {
    return app.fn.isKana(this.getBase());
  },

  /**
   * @method isLeech
   * @returns {Boolean}
   */
  isLeech: function() {
    return !this.isNew() && this.consecutiveWrong > 2;
  },

  /**
   * @method isNew
   * @returns {Boolean}
   */
  isNew: function() {
    return !this.get('reviews');
  },

  /**
   * @method isPartDefn
   * @returns {Boolean}
   */
  isPartDefn: function() {
    return this.get('part') === 'defn';
  },

  /**
   * @method isPartRdng
   * @returns {Boolean}
   */
  isPartRdng: function() {
    return this.get('part') === 'rdng';
  },

  /**
   * @method isPartRune
   * @returns {Boolean}
   */
  isPartRune: function() {
    return this.get('part') === 'rune';
  },

  /**
   * @method isPartTone
   * @returns {Boolean}
   */
  isPartTone: function() {
    return this.get('part') === 'tone';
  },

  /**
   * @method parse
   * @param {Object} response
   * @returns {Object}
   */
  parse: function(response) {
    return response.Item || response;
  },

  /**
   * @method skip
   */
  skip: function() {
    $.ajax({
      url: app.getApiUrl(2) + 'queue/skip/' + this.id,
      type: 'POST',
      headers: app.user.session.getHeaders()
    });
  },

  /**
   * @method unban
   */
  unban: function() {
    this.getVocab().unbanPart(this.get('part'));
  }

});

module.exports = ItemModel;
