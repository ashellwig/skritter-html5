const BaseSkritterCollection = require('base/BaseSkritterCollection');
const ReviewCollection = require('collections/ReviewCollection');
const VocabCollection = require('collections/VocabCollection');
const ItemModel = require('models/ItemModel');

/**
 * A collection of ItemModels for a user to review related to a specific
 * Vocab they are studying.
 * @class ItemCollection
 * @extends {BaseSkritterCollection}
 */
const ItemCollection = BaseSkritterCollection.extend({

  /**
   * @property model
   * @type {ItemModel}
   */
  model: ItemModel,

  /**
   * @property url
   * @type {String}
   */
  url: 'items',

  /**
   * @method initialize
   * @constructor
   */
  initialize: function (models, options) {
    options = options || {};

    this.reviews = new ReviewCollection(null, {items: this});
    this.vocabs = new VocabCollection(null, {items: this});

    this.cursor = null;
    this.addingState = 'standby';
    this.dueCount = 0;
    this.dueCountServer = 0;
    this.dueCountState = 'standby';
    this.fetchingState = 'standby';
    this.listIds = [];
    this.preloadingState = 'standby';
    this.sorted = null;

    /**
     * Keeps track of what items the queue requests. If there's a mismatch between a user's Queue and UserItems,
     * a lot of nulls will be returned. When this is detected, this flag should be turned true.
     * On two subsequent requests that return > 90% nulls for items, if this is already set to true,
     * the queue will automatically be reset and the page reloaded, which should fix the issue.
     * @type {boolean}
     */
    this.queuePossiblyStale = false;

    /**
     * Whether the queue is currently being reset
     * @type {boolean}
     * @private
     */
    this._resettingQueue = false;

    this.listenTo(this.reviews, 'update:due', this.updateDueCount);
  },

  /**
   * Adds a single item for a user to study.
   * DON'T CALL THIS FUNCTION DIRECTLY: use addItems() instead!
   * @param {Object} [options] options for the add operation
   * @param {String} [options.lang] language to fetch items from lists
   * @param {String|String[]} [options.listIds] an array or string of list ids from which to add items
   * @return {Promise<Object>} resolves when the item has been added
   * @method addItem
   */
  addItem: function (options) {
    options = options || {};
    options.lang = options.lang || app.getLanguage();

    if (options.lists) {
      options.lists = _.isArray(options.lists) ? options.lists : [options.lists];
    } else {
      options.lists = [];
    }

    options.lists = options.lists.join('|');

    return new Promise((resolve, reject) => {
      if (this.addingState === 'standby') {
        this.addingState = 'adding';
      } else {
        resolve();

        return;
      }

      const params = '?lang=' + options.lang +
        '&lists=' + options.lists +
        '&offset=' + options.offset;

      $.ajax({
        url: app.getApiUrl() + 'items/add' + params,
        type: 'POST',
        headers: app.user.session.getHeaders(),
        error: (error) => {
          this.addingState = 'standby';

          reject(error);
        },
        success: (result) => {
          if (result.Items.length) {
            const item = new ItemModel(result.Items[0]);

            console.log('ADDED ITEM:', result.Items[0]);

            item._loaded = false;
            item._queue = true;

            this.add(item);
            this.unshift(item);

            // only preload when a single item is being added
            if (options.limit === 1) {
              this.preloadNext();
            }
          }

          this.addingState = 'standby';

          resolve(result);
        },
      });
    });
  },

  /**
   * Adds an arbitrary number of new items. Defaults to 1 if a limit is not
   * sent in through the options.
   * @param {Object} [options] object that contains options for the add operation
   * @param {Number} [options.limit] the number of items to attempt to add
   * @param {String} [options.listId] a list id from which to add items
   * @param {Number} [options.offset] offset value for which list to start adding from
   * @param {Function} [callback] an optional callback that will be called when
   *                              the limit has been reached.
   * @method addItems
   */
  addItems: function (options, callback) {
    let count = 0;
    let results = {items: [], numVocabsAdded: 0, itemsFailed: 0};

    options = options || {};
    options.limit = options.limit || 1;
    options.offset = options.offset || Math.round(Math.random() * 10);

    app.user.isSubscriptionActive((active) => {
      if (!active) {
        this.itemsAdded(results, callback);

        return;
      }

      async.whilst(
        () => count < options.limit,
        async (callback) => {
          count++;

          try {
            const result = await this.addItem(options);

            results.items.push(result);
            results.numVocabsAdded += result.numVocabsAdded;

            options.offset++;

            callback();
          } catch (error) {
            results.itemsFailed++;

            callback();
          }
        },
        () => {
          this.itemsAdded(results, callback);
        });
    });
  },

  /**
   * Finalizes the adding of items. Updates the due counts and
   * calls any necessary callbacks.
   * @param {Object} [results] an object containing which items were added,
   *                            the number of items, and the number of failed
   *                            attempts to add items
   * @param {Function} [callback] an optional callback to the original function
   *                              that called addItems
   * @return {Object} the results object
   */
  itemsAdded: function (results, callback) {
    const addedCount = results.numVocabsAdded;
    const partCount = app.user.getFilteredParts().length;

    this.preloadNext();

    // make a guess at how many items to add to the due count
    // based on number of vocabs added and active parts
    if (addedCount) {
      this.reviews.addCountOffset += addedCount * partCount;
      this.updateDueCount(true);
    }

    if (_.isFunction(callback)) {
      callback(null, results);
    }

    return results;
  },

  /**
   * @method fetchCharacters
   * @returns {Promise}
   */
  fetchCharacters: function () {
    return new Promise(
      (resolve, reject) => {
        // filter out characters which have already been fetched
        const filteredWritings = _.filter(
          this.vocabs.getUniqueWritings(),
          function (value) {
            return !app.user.characters.findWhere({writing: value});
          }
        );

        // stop fetch when no writings needed
        if (!filteredWritings.length) {
          resolve();
          return;
        }

        // fetch characters from server using new v2 api
        app.user.characters.fetch({
          data: {
            languageCode: app.getLanguage(),
            writings: filteredWritings.join(''),
          },
          remove: false,
          error: function (error) {
            reject(error);
          },
          success: function () {
            resolve();
          },
        });
      }
    );
  },

  /**
   * @method fetchNext
   * @param {Object} options
   * @returns {Promise}
   */
  fetchNext: function (options) {
    options = options || {};
    options.limit = options.limit || 50;
    options.lists = options.lists || null;
    options.sections = options.sections || null;

    return new Promise(
      (resolve, reject) => {
        if (this.fetchingState === 'fetching') {
          resolve();
          return;
        }

        this.fetchingState = 'fetching';

        if (app.user.offline.isReady()) {
          async.series(
            [
              async (callback) => {
                const result = await app.user.offline.loadNext();

                _.forEach(this.add(result.Items, {merge: true}), (item) => {
                  item._loaded = true;
                  item._queue = true;
                });

                this.add(result.ContainedItems, {merge: true});

                this.vocabs.add(result.Vocabs);

                app.user.characters.add(result.Characters, {merge: true});

                callback();
              },
            ],
            (error) => {
              this.fetchingState = 'standby';

              if (!options.silent) {
                this.trigger('preload');
              }

              if (error) {
                reject(error);
              } else {
                resolve();
              }
            }
          );
        } else {
          async.series(
            [
              (callback) => {
                ScreenLoader.post('Updating cache');

                $.ajax({
                  url: app.getApiUrl(2) + 'queue/update',
                  type: 'GET',
                  headers: app.user.session.getHeaders(),
                  data: {
                    languageCode: app.getLanguage(),
                  },
                  error: (error) => callback(error),
                  success: () => callback(),
                });
              },
              (callback) => {
                ScreenLoader.post('Fetching next');

                $.ajax({
                  url: app.getApiUrl(2) + 'queue/next',
                  type: 'GET',
                  headers: app.user.session.getHeaders(),
                  data: {
                    languageCode: app.getLanguage(),
                    limit: options.limit,
                    lists: options.lists || app.user.getFilteredLists().join('|'),
                    parts: app.user.getFilteredParts().join('|'),
                    sections: options.sections,
                    styles: app.user.getFilteredStyles().join('|'),
                  },
                  error: (error) => {
                    callback(error);
                  },
                  success: (result) => {
                    _.forEach(this.add(result, {merge: true}), (model) => {
                      model._queue = true;
                    });

                    callback();
                  },
                });
              },
            ],
            (error) => {
              if (error) {
                this.fetchingState = 'standby';
                reject(error);
                return;
              }

              // preload stuff because we need it anyways
              this.preloadNext({limit: 5})
                .catch(
                  (error) => {
                    this.fetchingState = 'standby';
                    reject(error);
                  }
                )
                .then(
                  () => {
                    this.fetchingState = 'standby';
                    resolve();
                  }
                );
            }
          );
        }
      }
    );
  },

  /**
   * @method getNext
   * @returns {Array}
   */
  getNext: function () {
    const now = moment().unix();
    const parts = app.user.getFilteredParts().join(',');
    const styles = app.user.getFilteredStyles().join(',');

    return _
      .chain(this.getQueue())
      .filter(
        (model) => {
          // check if model has been removed from collection
          if (!model) {
            return false;
          }

          // exclude models that have not been fully loaded yet
          if (!model._loaded) {
            return false;
          }

          // exclude part not including in user settings
          if (!_.includes(parts, model.get('part'))) {
            return false;
          }

          // exclude style not including in user settings
          if (!_.includes(styles, model.get('style'))) {
            return false;
          }

          // exclude items marked as banned in vocab
          if (model.isBanned()) {
            return false;
          }

          // exclude rune items without stroke data
          if (model.isPartRune() && !model.isCharacterDataLoaded()) {
            // exclude the rune item from the local queue
            model._queue = false;

            // move the item into future on the server
            model.bump();

            return false;
          }

          if (model.isJapanese()) {
            // skip all kana writings when study kana disabled
            if (!app.user.get('studyKana') && model.isPartRune() && model.isKana()) {
              // exclude the rune item from the local queue
              model._queue = false;

              // move the item into future on the server
              model.bump();

              return false;
            }
          }

          return model;
        }
      )
      .sortBy((item) => -item.getReadiness(now))
      .value();
  },

  /**
   * @method getQueue
   * @returns {Array}
   */
  getQueue: function () {
    return _.filter(this.models, (model) => model._queue);
  },

  /**
   * @method parse
   * @param {Object} response
   * @returns {Object}
   */
  parse: function (response) {
    this.cursor = response.cursor;
    this.vocabs.add(response.Vocabs);
    this.vocabs.decomps.add(response.Decomps);
    this.vocabs.sentences.add(response.Sentences);

    return response.Items.concat(response.ContainedItems || []);
  },

  /**
   * @method preloadNext
   * @param {Object} [options]
   * @returns {Promise}
   */
  preloadNext: function (options) {
    const now = moment().unix();
    const queue = this.getQueue();

    options = options || {};
    options.limit = options.limit || 10;
    options.silent = options.silent || false;

    // return list of active next item ids
    const itemIds = _
      .chain(queue)
      .filter((model) => !model._loaded)
      .sortBy((item) => -item.getReadiness(now))
      .map((item) => item.id)
      .value()
      .slice(0, options.limit);

    return new Promise(
      (resolve, reject) => {
        // return successful when no item preloading needed
        if (!itemIds.length) {
          resolve();
          return;
        }

        if (this.preloadingState === 'fetching') {
          resolve();
          return;
        }

        this.preloadingState = 'fetching';

        this.fetch({
          data: {
            ids: itemIds.join('|'),
            include_contained: true,
            include_decomps: true,
            include_heisigs: app.user.get('showHeisig') || false,
            include_sentences: false,
            include_strokes: false,
            include_top_mnemonics: true,
            include_vocabs: true,
          },
          merge: true,
          remove: false,
          error: (error) => {
            reject(error);
          },
          success: (collection, result) => {
            // check for null items to determine if queue reset is needed
            const nullItems = result.Items.filter((i) => i === null);
            if (nullItems.length / result.Items.length >= .9) {
              if (!this.queuePossiblyStale) {
                this.queuePossiblyStale = true;
              } else {
                this.resetQueue(true);
              }
            }

            // mark items that have successfully been loaded from the server
            _.forEach(
              itemIds,
              (itemId) => {
                const item = collection.get(itemId);

                if (item) {
                  item._loaded = true;
                }
              }
            );

            // preload characters for items just added
            this.fetchCharacters()
              .catch(reject)
              .then(
                () => {
                  this.preloadingState = 'standby';

                  if (!options.silent) {
                    this.trigger('preload');
                  }

                  resolve();
                }
              );
          },
        });
      }
    );
  },

  /**
   * @method reset
   * @returns {Items}
   */
  reset: function () {
    this.vocabs.reset();

    return BaseSkritterCollection.prototype.reset.apply(this, arguments);
  },

  /**
   * Resets a user's queue for the current language
   * @param {Boolean} [reload] whether to reload the page after resetting
   */
  resetQueue: function (reload) {
    return new Promise((resolve, reject) => {
      // I know, UI code in a model. Sorry :-(
      ScreenLoader.post('Synching queue');

      if (this._resettingQueue) {
        resolve();
        return;
      }

      this._resettingQueue = true;

      $.ajax({
        data: {
          languageCode: app.getLanguage(),
        },
        headers: app.user.session.getHeaders(),
        type: 'GET',
        url: app.getApiUrl(2) + 'queue/reset/' + app.user.id,
        error: (error) => {
          ScreenLoader.post('Queue synchronization error. Please contact the team@skritter.com to fix this.');
          this._resettingQueue = false;
          reject(error);
        },
        success: () => {
          this._resettingQueue = false;
          resolve();

          if (reload) {
            app.reload();
          }
        },
      });
    });
  },

  /**
   * @method updateDueCount
   * @param {boolean} [skipServer]
   */
  updateDueCount: function (skipServer) {
    if (this.dueCountState === 'fetching') {
      return;
    }

    if (skipServer) {
      let localCount = this.dueCountServer - this.reviews.getDueCountOffset();

      if (localCount > 0) {
        this.dueCount = localCount;
      } else {
        this.dueCount = 0;
      }

      this.trigger('update:due-count', this.dueCount);

      return;
    }

    this.dueCountState = 'fetching';

    let url = app.getApiUrl() + 'items/due';

    if (app.config.useV2Gets.itemsdue) {
      url = app.getApiUrl(2) + 'gae/items/due';
    }

    if (app.user.offline.isReady()) {
      let serverCount = 0;
      let localCount = 0;

      localCount = serverCount - this.reviews.getDueCountOffset();

      if (localCount > 0) {
        this.dueCount = localCount;
      } else {
        this.dueCount = 0;
      }

      app.user.offline.loadDueCount({list: this.listIds}).then((result) => {
        this.dueCount += result;
        this.dueCountServer = result;
        this.dueCountState = 'standby';

        this.trigger('update:due-count', this.dueCount);
      });

      return;
    }

    $.ajax({
      url,
      type: 'GET',
      headers: app.user.session.getHeaders(),
      data: {
        lang: app.getLanguage(),
        languageCode: app.getLanguage(),
        list: this.listIds.join(','),
        parts: app.user.getFilteredParts().join(','),
        styles: app.user.getFilteredStyles().join(','),
      },
      error: () => {
        this.dueCount = '-';
        this.dueCountState = 'standby';
        this.trigger('update:due-count', this.dueCount);
      },
      success: (result) => {
        let serverCount = 0;
        let localCount = 0;

        _.forIn(result.due, (part) => {
          _.forIn(part, (style) => {
            serverCount += style;
          });
        });

        localCount = serverCount - this.reviews.getDueCountOffset();

        if (localCount > 0) {
          this.dueCount = localCount;
        } else {
          this.dueCount = 0;
        }

        this.dueCountServer = serverCount;
        this.dueCountState = 'standby';

        this.trigger('update:due-count', this.dueCount);
      },
    });
  },

});

module.exports = ItemCollection;
