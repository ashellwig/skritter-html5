const GelatoPage = require('gelato/page');
const Prompt = require('components/study/prompt/StudyPromptComponent.js');
const Toolbar = require('components/study/toolbar/StudyToolbarComponent.js');
const Recipes = require('components/common/CommonRecipesComponent.js');
const Items = require('collections/ItemCollection.js');
const Vocablist = require('models/VocablistModel.js');
const MobileStudyNavbar = require('components/navbars/NavbarMobileStudyComponent.js');
const QuickSettings = require('dialogs1/quick-settings/QuickSettingsDialog.js');
const vent = require('vent');

/**
 * @class StudyListPage
 * @extends {GelatoPage}
 */
const StudyListPage = GelatoPage.extend({

  /**
   * @property showFooter
   * @type {Boolean}
   */
  showFooter: false,

  /**
   * The navbar to use in mobile views
   * @type {NavbarMobileStudyComponent}
   */
  mobileNavbar: MobileStudyNavbar,

  /**
   * @property template
   * @type {Function}
   */
  template: require('./StudyListPage.jade'),

  /**
   * @property title
   * @type {String}
   */
  title: 'Study - Skritter',

  /**
   * @method initialize
   * @param {Object} options
   * @constructor
   */
  initialize: function(options) {
    ScreenLoader.show();

    this.currentItem = null;
    this.currentPromptItems = null;
    this.previousItem = null;
    this.previousPrompt = false;
    this.previousPromptItems = null;

    this.items = new Items();
    this.prompt = new Prompt({page: this});
    this.toolbar = new Toolbar({page: this});
    this.vocablist = new Vocablist({id: options.listId});

    if (app.user.get('eccentric')) {
      this._views['recipe'] = new Recipes();
    }

    // make sure the item collection knows about filtered list
    this.items.listIds = [this.vocablist.id];

    this.listenTo(this.prompt, 'next', this.handlePromptNext);
    this.listenTo(this.prompt, 'previous', this.handlePromptPrevious);
    this.listenTo(vent, 'items:add', this.addItems);
    this.listenTo(vent, 'studySettings:show', this.showStudySettings);
  },

  /**
   * @method render
   * @returns {StudyListPage}
   */
  render: function() {
    if (app.isMobile()) {
      this.template = require('./MobileStudyListPage.jade');
    }

    this.renderTemplate();
    this.prompt.setElement('#study-prompt-container').render();
    this.toolbar.setElement('#study-toolbar-container').render();

    if (!app.isMobile() && app.user.get('eccentric')) {
      this._views['recipe'].setElement('#recipes-container').render();
    }

    if (!app.isMobile()) {
      this.toolbar.hide();
    }

    this.checkRequirements();

    return this;
  },

  /**
   * Adds items to the study queue
   * @method addItem
   * @param {Boolean} [silenceNoItems] whether to hide a popup if no items are added
   * @param {Number} [numToAdd] the number of items to add. Defaults to 1.
   * whether to suppress messages to the user about the items added if nothing was added.
   */
  addItems: function(silenceNoItems, numToAdd) {
    numToAdd = numToAdd || 1;

    this.items.addItems(
      {
        lang: app.getLanguage(),
        limit: numToAdd,
        lists: this.vocablist.id
      },
      function(error, result) {
        if (!error) {
          let added = result.numVocabsAdded;

          if (added === 0) {
            if (silenceNoItems) {
              return;
            }
            // TODO: this should respond to vent items:added in a separate
            // function--"app-level" notification?
            // Could be added from lists or vocab info dialog...
            app.notifyUser({
              message: 'No more words to add. <br><a href="/vocablists/browse">Add a new list</a>',
              type: 'pastel-info'
            });
          } else {
            app.notifyUser({
              message: added + (added > 1 ? ' words have ' : ' word has ') + 'been added.',
              type: 'pastel-success'
            });
          }
        }
        vent.trigger('items:added', !error ? result : null);
      }
    );
  },

  /**
   * @method checkRequirements
   */
  checkRequirements: function() {
    ScreenLoader.post('Preparing study');

    this.items.updateDueCount();

    async.parallel(
      [
        (callback) => {
          app.user.subscription.fetch({
            error: function() {
              callback();
            },
            success: function() {
              callback();
            }
          });
        },
        (callback) => {
          this.items.fetchNext({limit: 30, lists: this.vocablist.id})
            .catch(callback)
            .then(callback);
        },
        (callback) => {
          this.vocablist.fetch({
            error: function() {
              callback();
            },
            success: function() {
              callback();
            }
          });
        }
      ],
      () => {
        const active = app.user.isSubscriptionActive();

        if (!this.vocablist) {
          ScreenLoader.hide();
          app.router.navigate('', {trigger: true});
        } else if (!this.items.length) {
          if (active) {
            ScreenLoader.post('Adding words from list');
            document.title = this.vocablist.get('name') + ' - Skritter';
            this.items.addItems(
              {
                lang: app.getLanguage(),
                limit: 5,
                lists: this.vocablist.id
              },
              function() {
                app.reload();
              }
            );
          } else {
            this.prompt.render();
            this.prompt.$('#overlay').show();
            ScreenLoader.hide();
          }
        } else {
          document.title = this.vocablist.get('name') + ' - Skritter';

          this.stopListening(this.items);
          this.listenTo(this.items, 'preload', this.handleItemPreload);

          this.next();

          ScreenLoader.hide();
        }
      }
    );
  },

  /**
   * @method handleItemPreload
   */
  handleItemPreload: function() {
    if (!this.currentPromptItems) {
      this.next();
    }
  },

  /**
   * @method handlePromptNext
   * @param {PromptItemCollection} promptItems
   */
  handlePromptNext: function(promptItems) {
    this.items.reviews.put(promptItems.getReview());

    if (this.previousPrompt) {
      this.previousPrompt = false;
      this.next();

      return;
    }

    if (this.currentPromptItems) {
      if (this.items.reviews.length > 2) {
        this.items.reviews.post({skip: 1});
        this.items.updateDueCount();
      }

      if (promptItems.readiness >= 1.0) {
        vent.trigger('dueCountOffset:increase');
      }

      if (!app.isMobile()) {
        this.toolbar.timer.addLocalOffset(promptItems.getBaseReviewingTime());
      }

      this.currentItem._queue = false;
      this.currentPromptItems = null;
      this.previousPromptItems = promptItems;

      this.next();
    }
  },

  /**
   * @method handlePromptPrevious
   * @param {PromptItemCollection} promptItems
   */
  handlePromptPrevious: function(promptItems) {
    this.previousPrompt = true;
    this.currentPromptItems = promptItems;
    this.previous();
  },

  /**
   * @method next
   */
  next: function() {
    const items = this.items.getNext();
    const queue = this.items.getQueue();

    if (this.previousPrompt) {
      this.togglePromptLoading(false);
      this.prompt.reviewStatus.render();
      this.prompt.set(this.currentPromptItems);
      this.toolbar.render();

      return;
    }

    if (items.length) {
      this.currentItem = items[0];
      this.currentPromptItems = items[0].getPromptItems();
      this.togglePromptLoading(false);
      this.prompt.reviewStatus.render();
      this.prompt.set(this.currentPromptItems);
      this.toolbar.render();

      // TODO: fix automatic item adding
      // if (app.user.isItemAddingAllowed() && this.items.dueCount < 5) {
      //   this.addItems(true);
      // }

      if (items.length < 5) {
        this.items.preloadNext();
      }

      return;
    }

    if (!queue.length) {
      this.togglePromptLoading(true);
      this.items.reviews.post({skip: 1});
      this.items.fetchNext({limit: 30, lists: this.vocablist.id});
      return;
    }

    if (this.items.skipped) {
      this.items.preloadNext();
      this.items.skipped = false;
      return;
    }

    // disable things while preloading
    this.togglePromptLoading(true);
    this.items.preloadNext();
  },

  /**
   * @method previous
   */
  previous: function() {
    if (this.previousPromptItems) {
      this.togglePromptLoading(false);
      this.prompt.reviewStatus.render();
      this.prompt.set(this.previousPromptItems);
      this.toolbar.render();
    }
  },

  /**
   * @method remove
   * @returns {StudyListPage}
   */
  remove: function() {
    this.prompt.remove();
    this.toolbar.remove();
    this.items.reviews.post();
    return GelatoPage.prototype.remove.call(this);
  },

  /**
   * Shows a dialog that allows the user to adjust their study settings
   */
  showStudySettings: function() {
    const dialog = new QuickSettings();

    dialog.open();

    dialog.on('save', settings => {
      ScreenLoader.show();
      ScreenLoader.post('Saving study settings');
      app.user.set(settings, {merge: true});
      app.user.cache();
      app.user.save(
        null,
        {
          error: () => {
            ScreenLoader.hide();
            dialog.close();
          },
          success: () => {
            // TODO: figure out why this causes canvas sizing issue
            // this.render();
            // dialog.close();

            app.reload();
          }
        }
      );
    });
  },

  /**
   * Toggles the loading state on the canvas when fetching new items
   * @param {Boolean} loading whether the prompt is loading
   */
  togglePromptLoading: function(loading) {

    // toggle it if it wasn't passed in
    if (loading === undefined) {
      loading = !(this.prompt.$panelLeft.css('opacity') === 0.4);
    }

    const componentName = app.isMobile() ? 'mobile-study-prompt' : 'study-prompt';
    this.prompt.$el.find('gelato-component[data-name="' + componentName + '"]').toggleClass('fetching-items', loading);
  }
});

module.exports = StudyListPage;
