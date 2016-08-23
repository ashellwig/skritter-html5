const GelatoPage = require('gelato/page');
const AccountSidebar = require('components/account/AccountSidebarComponent');

const ResetVocablistPositionDialog = require('dialogs1/reset-vocablist-position/view');

/**
 * @class AccountSettingsStudyPage
 * @extends {GelatoPage}
 */
const AccountSettingsStudyPage = GelatoPage.extend({

  /**
   * @property events
   * @type {Object}
   */
  events: {
    'change #field-target-language': 'handleChangeTargetLanguage',
    'click #button-save': 'handleClickButtonSave'
  },

  /**
   * @property title
   * @type {String}
   */
  title: 'Study Settings - Skritter',

  /**
   * @property template
   * @type {Function}
   */
  template: require('./AccountSettingsStudy'),

  /**
   * @method initialize
   * @constructor
   */
  initialize: function() {
    this.sidebar = new AccountSidebar();
    this.sourceLanguages = require('data/source-languages');
    this.listenTo(app.user, 'state', this.render);
    app.user.fetch();
  },

  /**
   * @method render
   * @returns {AccountSettingsStudyPage}
   */
  render: function() {
    this.renderTemplate();
    this.sidebar.setElement('#sidebar-container').render();
    return this;
  },

  /**
   * @method getSelectedParts
   * @returns {Array}
   */
  getSelectedParts: function() {
    var parts = [];
    this.$('#field-parts :checked').each(function() {
      parts.push($(this).val());
    });
    return parts;
  },

  /**
   * @method handleChangeTargetLanguage
   * @param {Event} event
   */
  handleChangeTargetLanguage: function(event) {
    event.preventDefault();
    app.user.set('targetLang', this.$('#field-target-language').val());
    this.render();
  },

  /**
   * @method handleClickButtonSave
   * @param {Event} event
   */
  handleClickButtonSave: function(event) {
    event.preventDefault();
    app.user.set({
      autoAddComponentCharacters: this.$('#field-add-contained').is(':checked'),
      showHeisig: this.$('#field-heisig').is(':checked'),
      sourceLang: this.$('#field-source-language').val(),
      targetLang: this.$('#field-target-language').val()
    });
    if (app.isChinese()) {
      app.user.set({
        addSimplified: this.$('#field-styles [value="simp"]').is(':checked'),
        addTraditional: this.$('#field-styles [value="trad"]').is(':checked'),
        chineseStudyParts: this.getSelectedParts()
      });
    } else if (app.isJapanese()) {
      app.user.set({
        japaneseStudyParts: this.getSelectedParts(),
        studyKana: this.$('#field-study-kana').is(':checked'),
        studyRareWritings: this.$('#field-study-rare-writings').is(':checked'),
        studyAllListWritings: this.$('#field-study-all-list-writings').is(':checked')
      });
    }
    if (app.user.hasChanged('addSimplified') || app.user.hasChanged('addTraditional')) {
      this.dialog = new ResetVocablistPositionDialog();
      this.dialog.render();
      this.dialog.open();
    }
    app.user.save();
  },

  /**
   * @method remove
   * @returns {AccountSettingsStudyPage}
   */
  remove: function() {
    this.sidebar.remove();
    return GelatoPage.prototype.remove.call(this);
  }

});

module.exports = AccountSettingsStudyPage;
