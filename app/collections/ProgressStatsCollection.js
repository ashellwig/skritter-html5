const BaseSkritterCollection = require('base/BaseSkritterCollection');
const ProgressStatModel = require('models/ProgressStatModel');
const GelatoCollection = require('gelato/collection');

/**
 * @class ProgressStatsCollection
 * @extends {BaseSkritterCollection}
 */
const ProgressStatsCollection = BaseSkritterCollection.extend({

  /**
   * @property model
   * @type {ProgressStatModel}
   */
  model: ProgressStatModel,

  /**
   * @property url
   * @type {String}
   */
  url: 'progstats',

  /**
   * @method sync
   * @param {String} method
   * @param {Model} model
   * @param {Object} options
   */
  sync: function(method, model, options) {
    options.headers = _.result(this, 'headers');

    if (!options.url) {
      options.url = app.getApiUrl() + _.result(this, 'url');
    }

    if (method === 'read' && app.config.useV2Gets.progstats) {
      options.url = 'https://api.skritter.com/v2/gae/progstats';
    }

    GelatoCollection.prototype.sync.call(this, method, model, options);
  },

  /**
   * A map of metadata to keep track of what's already been fetched
   */
  cache: {},

  /**
   * @method comparator
   * @param {ProgressStatModel} statA
   * @param {ProgressStatModel} statB
   * @returns {Number}
   */
  comparator: function(statA, statB) {
    if (statA.id > statB.id) {
      return -1;
    } else if (statB.id > statA.id) {
      return 1;
    } else {
      return 0;
    }
  },

  /**
   * Filters response to only get stats data up to today.
   * @method parse
   * @param {Object} response
   * @returns Array
   */
  parse: function(response) {
    const now = moment().startOf('day').valueOf();

    return response.ProgressStats.filter(function(s) {
      let statDate = moment(s.date, app.config.dateFormatApp).valueOf();
      return statDate <= now;
    });
  },

  /**
   * Given a range of dates, splits it into an array of evenly-ranged chunks.
   * E.g. for a range spanning 30 days, will return 3 sequential ranges each
   * spanning 10 days.
   * For API v2 calls, this doesn't split the date range.
   * @method divideDateRange
   * @param {Moment} momentStart start date of the range
   * @param {Moment} momentEnd end date of the range
   * @param {Number} chunkSize the maximum number of days that should be in the range
   * @returns {Array<Array<String>>} A list of date ranges with the
   *                                         first value being the start date
   *                                         and the second being teh end date,
   *                                         both formatted YYYY-MM-DD
   */
  divideDateRange: function(momentStart, momentEnd, chunkSize) {
    let dates = [];
    let diff = momentEnd.diff(momentStart, 'days');

    if (diff <= chunkSize || app.config.useV2Gets.progstats) {
      return [
        [momentStart.format('YYYY-MM-DD'), momentEnd.format('YYYY-MM-DD')],
      ];
    }

    for (let i = 0; i < diff; i += chunkSize + 1) {
      dates.push([
        moment(momentEnd).subtract(Math.min(i + chunkSize, diff), 'days').format('YYYY-MM-DD'),
        moment(momentEnd).subtract(i, 'days').format('YYYY-MM-DD'),
      ]);
    }

    return dates;
  },

  /**
   * @method fetchMonth
   * @param {Function} [callbackSuccess]
   * @param {Function} [callbackError]
   */
  fetchMonth: function(callbackSuccess, callbackError) {
    const momentMonthStart = moment().subtract(4, 'hours').startOf('month');
    const momentMonthEnd = moment().subtract(4, 'hours').endOf('month');

    // means we've already called this, we only need to possibly update today's value
    if (this.cache['month']) {
      if (this.cache['month'].start === momentMonthStart.format(app.config.dateFormatApp) &&
        this.cache['month'].end === momentMonthEnd.format(app.config.dateFormatApp)) {
        this.fetchToday(callbackSuccess, callbackError);
        return;
      }
    }

    this.fetchRange(momentMonthStart, momentMonthEnd, {
      success: () => {
        this.cache['month'] = {
          start: momentMonthStart.format(app.config.dateFormatApp),
          end: momentMonthEnd.format(app.config.dateFormatApp),
        };

        if (_.isFunction(callbackSuccess)) {
          callbackSuccess(this);
        }
      },
      error: callbackError,
      remove: false,
    });
  },

  /**
   * Fetches the stats between an arbitrary date range, splitting larger ranges
   * into smaller chunks if needed for more immediate access to partial data.
   * @method fetchRange
   * @param {String} start a YYYY-MM-DD formatted string that specifies the
   *                        start of the date range
   * @param {String} end  a YYYY-MM-DD formatted string that specifies the
   *                      end of the date range
   * @param {Object} [options] optional object with options
   * @param {Function} [options.success] called when all of the fetches successfully complete
   * @param {Function} [options.error] called when any of the fetches fail
   * @param {Boolean} [options.remove] whether to remove other models in the collection after the fetch
   */
  fetchRange: function(start, end, options) {
    // TODO: look into changing granularity for ranges larger than a month
    const momentEnd = moment(end, app.config.dateFormatApp);
    const momentStart = moment(start, app.config.dateFormatApp);
    const dates = this.divideDateRange(momentStart, momentEnd, 10);
    const dfds = [];
    const self = this;

    options = options || {};

    // if we've already fetched this exact range, don't re-fetch it all again.
    // If the end date is today, just re-fetch today in case the user studied
    // since the last fetch.
    if (this.cache['fetchRange']) {
      if (this.cache['fetchRange'].start === momentStart.format(app.config.dateFormatApp) &&
        this.cache['fetchRange'].end === momentEnd.format(app.config.dateFormatApp)) {
        if (this.cache['fetchRange'] === moment().format(app.config.dateFormatApp)) {
          this.fetchToday(options.success, options.error);
        } else {
          if (_.isFunction(options.success)) {
            options.success(this);
          }
        }
        return;
      }
    }

    dates.forEach(function(date) {
      const dfd = $.Deferred();

      self._fetchRange(date[0], date[1], dfd.resolve, function(error, model) {
        dfd.reject();
        if (_.isFunction((options.error))) {
          options.error(error, model);
        }
      });

      dfds.push(dfd);
    });

    $.when.apply(null, dfds).done(() => {
      this.cache['fetchRange'] = {
        start: momentStart.format(app.config.dateFormatApp),
        end: momentEnd.format(app.config.dateFormatApp),
      };

      if (_.isFunction(options.success)) {
        options.success(this);
      }
    });
  },

  /**
   * Performs a single fetch of stats within a given date range
   * @param {String} start a YYYY-MM-DD formatted date string that specifies
   *                       the start of the date range.
   * @param {String} end  a YYYY-MM-DD formatted date string that specifies
   *                      the end of the date range.
   * @param {Function} callbackSuccess called when the fetch completes
   * @param {Function} callbackError called when the fetch fails
   * @private
   */
  _fetchRange: function(start, end, callbackSuccess, callbackError) {
    this.fetch({
      data: {
        lang: app.getLanguage(),
        languageCode: app.getLanguage(),
        start: start,
        end: end,
      },
      remove: false,
      success: function(data) {
        if (_.isFunction(callbackSuccess)) {
          callbackSuccess(data);
        }
      },
      error: function(model, error) {
        if (_.isFunction((callbackError))) {
          callbackError(error, model);
        }
      },
    });
  },

  /**
   * Fetches today's stats
   * @method fetchToday
   * @param {Function} [callbackSuccess]
   * @param {Function} [callbackError]
   */
  fetchToday: function(callbackSuccess, callbackError) {
    return new Promise((resolve, reject) => {
      this.fetch({
        data: {
          lang: app.getLanguage(),
          languageCode: app.getLanguage(),
          start: moment().tz(app.user.get('timezone')).subtract(4, 'hours').format('YYYY-MM-DD'),
        },
        remove: false,
        success: (model) => {
          if (typeof callbackSuccess === 'function') {
            callbackSuccess(model);
          }
          resolve(model);
        },
        error: (model, error) => {
          if (typeof callbackError === 'function') {
            callbackError(error, model);
          }
          reject(error);
        },
      });
    });
  },

  /**
   * @method getAllTimeCharactersLearned
   * @returns {Number}
   */
  getAllTimeCharactersLearned: function() {
    return this.getItemsLearnedForPeriod('char', 'all');
  },

  /**
   * @method getAllTimeWordsLearned
   * @returns {Number}
   */
  getAllTimeWordsLearned: function() {
    return this.getItemsLearnedForPeriod('word', 'all');
  },

  /**
   * Gets the total amount of time a user has spent studying for the lifetime of their account.
   * @returns {object} the amount of time studied as a string with a units property
   *                   specifiying the largest denomination of the amount property.
   */
  getAllTimeTimeStudied: function() {
    if (!this.length) {
      return {amount: '0', units: 'seconds'};
    }

    let timeStudied = this.at(0).get('timeStudied');
    let allStudied = Math.floor(timeStudied.all);
    let seconds = Math.floor(allStudied) % 60;
    let minutes = Math.floor(allStudied / 60) % 60;
    let hours = Math.floor(allStudied / 3600);

    if (seconds < 10) {
      seconds = '0' + seconds;
    }

    let largestUnit = hours ? 'hours' :
      minutes ? 'minutes' :
        'seconds';

    if (largestUnit === 'hours' && minutes && minutes < 10) {
      minutes = '0' + minutes;
    }

    let amount = hours ? '' + hours + ':' + minutes + ':' + seconds :
      minutes ? minutes + ':' + seconds :
        seconds;

    if (largestUnit === 'seconds' && amount === '00') {
      amount = '0';
    }

    return {
      amount: amount,
      units: largestUnit,
    };
  },

  /**
   * Gets the average time a user has studied per day over all the time within the collection
   * @returns {Object} the average time studied per day among all the models in the collection
   * @method getAverageTimeStudied
   */
  getAverageTimeStudied: function() {
    let avgTime = 0;

    for (let i = 0; i < this.length; i++) {
      avgTime += this.at(i).get('timeStudied').day;
    }

    return this.convertToLargestTimeUnit(avgTime / (this.length || 1));
  },

  /**
   *
   * @param {Number} time
   * @returns {{amount: string, units: string, secondaryUnits: string}}
   * @method convertToLargestTimeUnit
   */
  convertToLargestTimeUnit: function(time) {
    let seconds = Math.floor(time) % 60;
    let minutes = Math.floor(time / 60) % 60;
    let hours = Math.floor(time / 3600);

    if (minutes < 10) {
      minutes = '0' + minutes;
    }

    if (seconds < 10) {
      seconds = '0' + seconds;
    }

    let largestUnit = hours ? 'hours' :
      minutes ? 'minutes' :
        'seconds';


    let secondLargestUnit = largestUnit === 'hours' ? 'minutes' :
      largestUnit === 'minutes' ? 'seconds' :
        'seconds';
    let amount = hours ? '' + hours + ':' + minutes + ':' + seconds :
      minutes ? minutes + ':' + seconds :
        seconds;

    // note: this is a very English-centric hack--replace me with proper language strings!
    if (amount.split(':')[0] === '01') {
      largestUnit = largestUnit.slice(0, -1);
    }

    if (amount.split(':')[1] === '01') {
      secondLargestUnit = secondLargestUnit.slice(0, -1);
    }

    return {
      amount: amount,
      units: largestUnit,
      secondaryUnits: secondLargestUnit,
    };
  },

  /**
   * Gets the total number of reviews a user has studied over their lifetime
   * @returns {Number} the total number of reviews a user has studied over their lifetime
   */
  getCountAllTimeReviews: function() {
    if (!this.length) {
      return 0;
    }

    let stat = this.at(0);
    let wordStats = stat.get('word');
    let charStats = stat.get('char');

    // .char, .word ... .defn .rdng .rune .tone ... .studied .all
    // gets the total number of reviews for both word and character reviews
    let totalNum = [wordStats, charStats].reduce(function(total, reviewCat) {
      // for a given stat, loops through the parts (defn, rdng, etc.)
      // and sums the numbers of .studied.all for each part.
      let partsTotal = Object.keys(reviewCat).reduce(function(pTotal, studyPart) {
        return pTotal + reviewCat[studyPart].studied.all;
      }, 0);

      return total + partsTotal;
    }, 0);

    return totalNum;
  },


  /**
   * @method getDailyItemsReviewed
   * @returns {Number}
   */
  getDailyItemsReviewed: function() {
    const today = moment().subtract(4, 'hours').format('YYYY-MM-DD');
    const stat = this.get(today);

    let total = 0;

    if (stat) {
      total += stat.get('char').defn.studied.day;
      total += stat.get('char').rdng.studied.day;
      total += stat.get('char').rune.studied.day;
      total += stat.get('char').tone.studied.day;
      total += stat.get('word').defn.studied.day;
      total += stat.get('word').rdng.studied.day;
      total += stat.get('word').rune.studied.day;
      total += stat.get('word').tone.studied.day;
    }

    return total || 0;
  },

  /**
   * @method getDailyTimeStudied
   * @returns {Number}
   */
  getDailyTimeStudied: function() {
    const today = moment().tz(app.user.get('timezone')).subtract(4, 'hours').format('YYYY-MM-DD');
    const stat = this.get(today);

    return stat ? stat.get('timeStudied').day : 0;
  },

  /**
   * @method getGoalItemPercent
   * @returns {Number}
   */
  getGoalItemPercent: function() {
    const goal = app.user.getGoal();
    const totalItems = app.user.stats.getDailyItemsReviewed();
    const percentItems = Math.round(totalItems / goal.value * 100);

    return percentItems > 100 ? 100 : parseFloat(percentItems.toFixed(2));
  },

  /**
   * @method getGoalTimePercent
   * @returns {Number}
   */
  getGoalTimePercent: function() {
    const goal = app.user.getGoal();
    const totalTime = app.user.stats.getDailyTimeStudied() / 60;
    const percentTime = Math.round(totalTime / goal.value * 100);

    return percentTime > 100 ? 100 : parseFloat(percentTime.toFixed(2));
  },

  /**
   * @method getMonthlyHeatmapData
   * @returns {Object}
   */
  getMonthlyHeatmapData: function() {
    let data = {};

    for (let i = 0, length = this.length; i < length; i++) {
      let stat = this.at(i);
      let date = moment(stat.get('date')).unix();
      data[date] = stat.getStudiedCount();
    }

    return data;
  },

  /**
   * Gets the best or current monthly studying streak.
   * Defaults to best streak unless current is specified as a parameter.
   * @method getMonthlyStreak
   * @param {Boolean} [current] whether to return the current or the best streak.
   * @returns {Number} The number of days the user has studied
   */
  getMonthlyStreak: function(current) {
    let bestStreak = 0;
    let currentStreak = 0;

    for (let i = 0, length = this.length; i < length; i++) {
      let stat = this.at(i);
      if (stat.hasBeenStudied()) {
        currentStreak++;
      }
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
      if (!stat.hasBeenStudied()) {
        if (current) {
          return currentStreak;
        }
        currentStreak = 0;
      }
    }

    return bestStreak;
  },

  /**
   * Gets the number of items a user has added to their study queue within an inclusive date range
   * @param {String} startDate
   * @param {String} endDate
   * @returns {Promise<Number>} the number of items added in the date range
   */
  getNumItemsAddedInPeriod: function(startDate, endDate) {
    return new Promise((resolve, reject) => {
      this.fetchRange(startDate, endDate, {
        success: () => {
          const stats = this._getStatsInRange(startDate, endDate
          );
          if (!stats.length) {
            resolve(0);
          }

          const start = stats[0];
          const end = stats[stats.length - 1];

          let addedStart = 0;
          let addedEnd = 0;

          ['rdng', 'rune', 'defn', 'tone'].forEach((part) => {
            if (start.get('word')[part]) {
              addedStart += (start.get('word')[part].learned.all + start.get('word')[part].learning.all);
            }
            if (start.get('char')[part]) {
              addedStart += (start.get('char')[part].learned.all + start.get('char')[part].learning.all);
            }
            if (end.get('word')[part]) {
              addedEnd += (end.get('word')[part].learned.all + end.get('word')[part].learning.all);
            }
            if (end.get('char')[part]) {
              addedEnd += (end.get('char')[part].learned.all + end.get('char')[part].learning.all);
            }
          });

          const totalAdded = addedEnd - addedStart;

          resolve(totalAdded);
        },
        error: reject,
        remove: false,
      });
    });
  },

  /**
   * Given a range of dates, gives the number of days in that range that the user studied.
   * @param {String} start YYYY-MM-DD formatted date from where to start (inclusive) counting
   * @param {String} end  YYYY-MM-DD formatted date from where to end (inclusive) counting
   * @returns {Number} the number of days the user studied
   */
  getNumDaysStudiedInPeriod: function(start, end) {
    let daysStudied = 0;
    let models = this._getStatsInRange(start, end);

    daysStudied = models.reduce(function(sum, m) {
      let timeStudied = m.get('timeStudied').day;
      return timeStudied > 0 ? sum + 1 : sum;
    }, daysStudied);


    return daysStudied;
  },

  /**
   * Gets the number for a certain category of items learned within a specified granularity.
   * @param {String} itemType the type of item to get "char"|"word"
   * @param {String} timePeriod the time period to look for "all"|"month"|"week"|"day"
   * @param {ProgressStatModel} [stat] the model from which to get the attributes
   * @returns {Number} The number of items learned in the time period
   * @method getItemsLearnedForPeriod
   */
  getItemsLearnedForPeriod: function(itemType, timePeriod, stat) {
    itemType = itemType || 'word';
    timePeriod = timePeriod || 'month';
    stat = stat || this.at(0);

    return this.length ? stat.get(itemType).rune.learned[timePeriod] : 0;
  },

  /**
   * Given a range of dates, gives the retention rate
   * @param {String} start YYYY-MM-DD formatted date from where to start (inclusive) counting
   * @param {String} end  YYYY-MM-DD formatted date from where to end (inclusive) counting
   * @returns {Number} the number of days the user studied
     */
  getRetentionRateForPeriod: function(start, end, itemType, part) {
    let stats = this._getStatsInRange(start, end);

    return this.getRetentionRate(stats, itemType, part);
  },

  /**
   *
   * @param {Array<ProgressStatModel>} stats
   * @param {String} itemType The type of
   * @param {String} part
   * @returns {number|*}
     */
  getRetentionRate: function(stats, itemType, part) {
    let remembered = 0;
    let studied = 0;
    let retentionRate;

    itemType = itemType || 'word';
    part = part || 'rune';

    _.forEach(stats, function(stat) {
      studied += stat.get(itemType)[part].studied.day;
      remembered += stat.get(itemType)[part].remembered.day;
    });

    retentionRate = studied === 0 ? 0 : ((remembered / studied) * 100);

    return retentionRate;
  },

  /**
   * Sums the desired type of stat for a specified time range
   * @param {String} itemType the type of item of get "char"|"word"
   * @param {String} start YYYY-MM-DD formatted date from where to start (inclusive) counting
   * @param {String} end YYYY-MM-DD formatted date from where to end (inclusive) counting
   * @returns {Number} the sum of the desired stat for the period
   * @method getSumItemsLearnedForPeriod
     */
  getSumItemsLearnedForPeriod: function(itemType, start, end) {
    // TODO: fetch stats if missing?
    let models = this._getStatsInRange(start, end);
    let learned = 0;
    let self = this;

    learned = models.reduce(function(sum, m) {
      return sum + self.getItemsLearnedForPeriod(itemType, 'day', m);
    }, learned);

    return learned;
  },

  /**
   * Gets the total time studied for a period of time
   * @param {String} start a date string formatted YYYY-MM-DD of when the period starts
   * @param {String} end a date string formatted YYYY-MM-DD of when the period starts
   * @param {Boolean} [keepInMs] whether to return the time formatted in the
   *                              largest unit (default), or when true, return
   *                              the time in ms.
   * @returns {Object} Formatted time unit object from convertToLargestTimeUnit of
   *                   the sum of the time studied during the specified period.
   * @method getTimeStudiedForPeriod
   */
  getTimeStudiedForPeriod: function(start, end, keepInMs) {
    let timeStudied = 0;
    let models = this._getStatsInRange(start, end);

    timeStudied = models.reduce(function(sum, m) {
      return sum + m.get('timeStudied').day;
    }, timeStudied);

    if (keepInMs) {
      return timeStudied;
    }

    return this.convertToLargestTimeUnit(timeStudied);
  },

  /**
   * Public wrapper to get stats models for a specified date range
   * @param {String} start the start date (inclusive) in YYYY-MM-DD format
   * @param {String} end the end date (inclusive) in YYYY-MM-DD format
   * @returns {Array<ProgressStatModel>} The models within the specified range
   */
  getStatsInRange: function(start, end) {
    return this._getStatsInRange(start, end);
  },

  /**
   * Gets the models for a specified date range
   * @param {String} start the start date (inclusive) in YYYY-MM-DD format
   * @param {String} end the end date (inclusive) in YYYY-MM-DD format
   * @returns {Array<ProgressStatModel>} The models within the specified range
   * @private
   */
  _getStatsInRange: function(start, end) {
    let endFound = false;
    let models = [];
    let momentEnd = moment(end, app.config.dateFormatApp);

    // if the end date requested is in the "future" and the collection
    // doesn't go that far, just pick the most recent model available as the end.
    if (this.models.length && moment(this.at(0).id, app.config.dateFormatApp).diff(momentEnd, 'days') < 0) {
      end = this.at(0).id;
    }

    for (let i = 0; i < this.length; i++) {
      if (this.at(i).id === end) {
        endFound = true;
      }
      if (endFound) {
        models.push(this.at(i));
      }
      if (this.at(i).id === start) {
        break;
      }
    }

    return models;
  },
});

module.exports = ProgressStatsCollection;
