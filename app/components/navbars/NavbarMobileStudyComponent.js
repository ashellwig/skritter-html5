const NavbarDefaultComponent = require('./NavbarDefaultComponent.js');
const StudyToolbarTimerComponent = require('components/study/toolbar/timer/StudyToolbarTimerComponent.js');
const vent = require('vent');

const NavbarMobileStudyComponent = NavbarDefaultComponent.extend({

  events: {
    'click #toggle-menu': 'handleToggleMenuClick',
    'click .add-amt': 'handleAddWordAmountClick',
    'click #add': 'handleAddClick',
    'click #play': 'handlePlayClick',
    'click #info': 'handleInfoClick',
    'click #options': 'handleOptionsClick'
  },

  /**
   * Template to use
   */
  template: require('./NavbarMobileStudy.jade'),

  initialize: function(options) {
    NavbarDefaultComponent.prototype.initialize.apply(this, arguments);
    this._views['timer'] = new StudyToolbarTimerComponent({
      showIcon: true
    });
    this.page = options.page;

    this._adding = false;

    _.bindAll(this, 'toggleAddWordsPopup');

    // todo: fix this
    this.dueCountOffset = 0;

    this.listenTo(vent, 'items:added', this.handleItemAdded);
    this.listenTo(this.page.items, 'update:due-count', this.handleDueCountUpdated);
  },

  /**
   *
   * @param event
   */
  handleToggleMenuClick: function(event) {
    event.preventDefault();
    vent.trigger('mobileNavMenu:toggle');
  },

  render: function() {
    NavbarDefaultComponent.prototype.render.apply(this, arguments);

    this._views['timer'].setElement('#timer-container').render();

    return this;
  },

  /**
   * Triggers an event to add an item from the user's lists
   * @method handleAddClick
   * @param {jQuery.ClickEvent} event
   * @triggers items:add
   */
  handleAddClick: function(event) {
    if (this._adding) {
      return;
    }

    event.stopPropagation();

    this.toggleAddWordsPopup(null, true);
  },

  /**
   * Handles when the user clicks an amount of words to add.
   * Triggers an event to start the add item process for that amount.
   * @param {jQuery.Event} event the click event
   */
  handleAddWordAmountClick: function(event) {
    const numItemsToAdd = $(event.target).data('amt');

    this.toggleAddWordsPopup();
    this.updateAddButton(true);
    vent.trigger('items:add', null, numItemsToAdd);
  },

  /**
   * Shows a popup that allows the user to select the number of words they want to add
   * @param event
   * @param show
   */
  toggleAddWordsPopup: function(event, show) {
    if (event && event.stopPropagation()) {
      event.stopPropagation()
    }

    this.$('#add-popup').toggleClass('hidden', !show);
    $(document).off('click', this.toggleAddWordsPopup);

    if (show) {
      $(document).on('click', this.toggleAddWordsPopup);
    }
  },

  /**
   * Updates the UI to show the due count
   */
  handleDueCountUpdated: function() {
    this.$('.due-count').text(this.page.items.dueCount);
  },

  handleItemAdded: function() {
    this.$('#add').removeClass('adding');
  },

  /**
   *
   * @param {jQuery.ClickEvent} event
   * @method handlePlayClick
   */
  handlePlayClick: function(event) {
    vent.trigger('vocab:play');
  },

  /**
   * Hides any other open menus, then opens the
   * @param {jQuery.ClickEvent} event
   * @method handleInfoClick
   */
  handleInfoClick: function(event) {
    app.hideAllMenus();
    vent.trigger('studyPromptVocabInfo:show');
  },

  /**
   * Triggers an event to show a study settings popup.
   * @method handleOptionsClick
   * @param {jQuery.ClickEvent} event
   * @triggers studySettings:show
   */
  handleOptionsClick: function(event) {
    vent.trigger('studySettings:show');
  },

  /**
   * @method remove
   * @returns {NavbarMobileStudyComponent}
   */
  remove: function() {
    $(document).off('click', this.toggleAddWordsPopup);

    return NavbarDefaultComponent.prototype.remove.call(this);
  },

  /**
   * Updates the adding state and UI to reflect whether items are currently
   * being added.
   * @param {Boolean} [adding] whether items are currently being added
   */
  updateAddButton: function(adding) {
    adding = adding || false;

    this._adding = adding;
    this.$('#add').toggleClass('adding', adding);
  },
});

module.exports = NavbarMobileStudyComponent;
