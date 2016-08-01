var SkritterCollection = require('base/skritter-collection');
var Reviews = require('collections/reviews');
var Vocabs = require('collections/vocabs');
var Item = require('models/item');

/**
 * @class Items
 * @extends {SkritterCollection}
 */
module.exports = SkritterCollection.extend({

  /**
   * @method initialize
   * @constructor
   */
  initialize: function(models, options) {
    options = options || {};
    this.cursor = null;
    this.history = [];
    this.sorted = null;
    this.reviews = new Reviews(null, {items: this});
    this.vocabs = new Vocabs(null, {items: this});
  },

  /**
   * @property model
   * @type {Item}
   */
  model: Item,

  /**
   * @property url
   * @type {String}
   */
  url: 'items',

  /**
   * @method addHistory
   * @param {Item} item
   * @returns {Items}
   */
  addHistory: function(item) {
    this.remove(item);
    this.history.push(item.getBase());
    if (this.history.length > 4) {
      this.history.shift();
    }

    return this;
  },

  /**
   * @method addItems
   * @param {Object} [options]
   * @param {Function} callback
   */
  addItems: function(options, callback) {
    var self = this;
    options = options || {};
    async.waterfall(
      [
        function(callback) {
          self.fetch({
            remove: false,
            sort: false,
            type: 'POST',
            url: app.getApiUrl() + 'items/add?lists=' + (options.lists || ''),
            error: function(error) {
              callback(error);
            },
            success: function(items, result) {
              callback(null, result);
            }
          });
        },
        function(result, callback) {
          self.fetch({
            data: {
              ids: _.map(result.Items, 'id').join('|'),
              include_contained: true
            },
            remove: false,
            sort: false,
            error: function(error) {
              callback(error);
            },
            success: function() {
              callback(null, result);
            }
          });
        }
      ],
      function(error, result) {
        if (error) {
          console.error('ITEM ADD ERROR:', error);
          callback(error)
        } else {
          callback(null, result);
        }
      }
    );
  },

  /**
   * @method clearHistory
   * @returns {Items}
   */
  clearHistory: function() {
    this.reset();
    this.history = [];

    return this;
  },

  /**
   * @method comparator
   * @param {Item} item
   * @returns {Number}
   */
  comparator: function(item) {
    return -item.getReadiness();
  },

  /**
   * @method fetchNext
   * @param {Object} options
   * @param {Function} [callback]
   */
  fetchNext: function(options, callback) {
    options = options || {};
    options.limit = options.limit || 10;
    this.fetch({
      data: {
        sort: 'next',
        lang: app.getLanguage(),
        limit: options.limit,
        include_contained: true,
        include_decomps: true,
        include_heisigs: true,
        include_sentences: true,
        include_strokes: true,
        include_vocabs: true,
        parts: app.user.getFilteredParts().join(','),
        styles: app.user.getFilteredStyles().join(',')
      },
      merge: true,
      remove: false,
      sort: false,
      error: function(error) {
        _.isFunction(callback) && callback(error);
      },
      success: function(items) {
        _.isFunction(callback) && callback(null, items);
      }
    });
  },

  /**
   * @method getNext
   * @returns {Array}
   */
  getNext: function() {
    var history = this.history;
    return _
      .chain(this.models)
      .filter(
        function(model) {
          return model.isActive() && !model.isBanned() && !_.includes(history, model.getBase());
        }
      )
      .shuffle()
      .value();
  },

  /**
   * @method hasNext
   * @returns {Boolean}
   */
  hasNext: function() {
    return this.getNext().length > 0;
  },

  /**
   * @method parse
   * @param {Object} response
   * @returns {Object}
   */
  parse: function(response) {
    this.cursor = response.cursor;
    this.vocabs.add(response.Vocabs);
    this.vocabs.decomps.add(response.Decomps);
    this.vocabs.sentences.add(response.Sentences);
    this.vocabs.strokes.add(response.Strokes);
    return response.Items.concat(response.ContainedItems || []);
  },

  /**
   * @method reset
   * @returns {Items}
   */
  reset: function() {
    this.vocabs.reset();
    return SkritterCollection.prototype.reset.call(this);
  },

  /**
   * @method sort
   * @returns {Items}
   */
  sort: function() {
    this.sorted = moment().unix();
    return SkritterCollection.prototype.sort.call(this);
  }

});
