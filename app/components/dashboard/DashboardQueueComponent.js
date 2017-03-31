const GelatoComponent = require('gelato/component');

/**
 * @class DashboardQueueComponent
 * @extends {GelatoComponent}
 */
const DashboardQueueComponent = GelatoComponent.extend({

  /**
   * @property template
   * @type {Function}
   */
  template: require('./DashboardQueue'),

  /**
   * @method initialize
   * @constructor
   */
  initialize: function() {
    this.vocablists = app.user.vocablists;
    this.listenTo(this.vocablists, 'state', this.render);
    this.vocablists.setSort('activeCompletion');

    this.listenTo(
      this.vocablists, 'state:standby',
      function() {
        if (this.vocablists.cursor && this.vocablists.length) {
          this.vocablists.fetch({
            data: {
              cursor: this.vocablists.cursor,
              limit: 10,
              sort: 'studying',
              include_percent_done: 'true',
              lang: app.getLanguage(),
              languageCode: app.getLanguage()
            },
            remove: false
          });
        } else {
          this.trigger('component:loaded', 'queue');
        }
      }
    );

    this.vocablists.fetch({
      data: {
        limit: app.config.useV2Gets.vocablists ? null : 12,
        sort: 'studying',
        include_percent_done: 'true',
        lang: app.getLanguage(),
        languageCode: app.getLanguage()
      }
    });
  },

  /**
   * @method render
   * @returns {DashboardQueueComponent}
   */
  render: function() {
    this.renderTemplate();

    return this;
  }

});

module.exports = DashboardQueueComponent;
