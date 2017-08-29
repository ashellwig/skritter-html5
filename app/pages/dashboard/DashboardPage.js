const GelatoPage = require('gelato/page');
const DashboardGoal = require('components/dashboard/DashboardStatusComponent');
const DashboardMonth = require('components/dashboard/DashboardMonthComponent');
const DashboardProgress = require('components/dashboard/DashboardProgressComponent');
const DashboardQueue = require('components/dashboard/DashboardQueueComponent');
const DashboardTotal = require('components/dashboard/DashboardTotalComponent');
const ExpiredNotification = require('components/account/AccountExpiredNotificationComponent');
const MobileNavbar = require('components/navbars/NavbarMobileDashboardComponent');

/**
 * A page that shows a summary of the user's review count due, stats, and lists
 * they're studying.
 * @class Dashboard
 * @extends {GelatoPage}
 */
const DashboardPage = GelatoPage.extend({

  events: {
    'click #feedback-btn': 'onFeedbackBtnClicked'
  },

  /**
   * @property mobileNavbar
   * @type {MobileNavbar}
   */
  mobileNavbar: MobileNavbar,

  /**
   * @property showFooter
   * @type {Boolean}
   */
  showFooter: !app.isMobile(),

  /**
   * @property title
   * @type {String}
   */
  title: app.locale('pages.dashboard.title'),

  /**
   * @property template
   * @type {Function}
   */
  template: require('./Dashboard'),

  /**
   * @method initialize
   * @constructor
   */
  initialize: function() {
    if (app.config.recordLoadTimes) {
      this.loadStart = window.performance.now();
    }

    this._views['goal'] = new DashboardGoal();
    this._views['queue'] = new DashboardQueue();
    this._views['expiration'] = new ExpiredNotification();

    if (app.isMobile()) {
      this._views['progress'] = new DashboardProgress();
    } else {
      this._views['month'] = new DashboardMonth();
      this._views['total'] = new DashboardTotal();
    }

    if (app.config.recordLoadTimes) {
      this.componentsLoaded = {
        goal: false,
        month: false,
        queue: false
      };
      this.loadAlreadyTimed = false;

      this.listenTo(this._views['goal'], 'component:loaded', this.onComponentLoaded);
      this.listenTo(this._views['month'], 'component:loaded', this.onComponentLoaded);
      this.listenTo(this._views['queue'], 'component:loaded', this.onComponentLoaded);
    }

    this.listenTo(this._views['expiration'], 'fetch-data:failed', this.subscriptionFetchFailed);

    app.mixpanel.track('Viewed dashboard page');

    app.capturePlatformInfo();
  },

  /**
   * @method render
   * @returns {Dashboard}
   */
  render: function() {
    this.renderTemplate();

    if (this._views['month']) {
      this._views['month'].setElement('#dashboard-month-container').render();
    }

    if (this._views['progress']) {
      this._views['progress'].setElement('#dashboard-progress-container').render();
    }

    if (this._views['total']) {
      this._views['total'].setElement('#dashboard-total-container').render();
    }

    this._views['goal'].setElement('#dashboard-goal-container').render();
    this._views['queue'].setElement('#dashboard-queue-container').render();
    this._views['expiration'].setElement('#subscription-notice').render();

    return this;
  },

  /**
   *
   * @param {String} component the name/key of the component loaded
   */
  onComponentLoaded: function(component) {
    this.componentsLoaded[component] = true;

    if (this.loadAlreadyTimed) {
      return;
    }

    if (app.config.recordLoadTimes) {
      for (let key in this.componentsLoaded) {
        if (this.componentsLoaded[key] !== true) {
          return;
        }
      }

      this.loadAlreadyTimed = true;
      const loadTime = window.performance.now() - this.loadStart;
      app.loadTimes.pages.dashboard.push(loadTime);
    }
  },

  /**
   * Opens a dialog the user can leave app feedback in.
   */
  onFeedbackBtnClicked: function() {
    app.showFeedbackDialog();
  },

  subscriptionFetchFailed: function() {

  }
});

module.exports = DashboardPage;
