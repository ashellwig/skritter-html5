const GelatoPage = require('gelato/page');
const Vocabs = require('collections/VocabCollection');
const WordsSidebar = require('components/words/WordsSidebarComponent');
const VocabActionMixin = require('mixins/vocab-action');
const VocabViewerDialog = require('dialogs1/vocab-viewer/view');
const vent = require('vent');

/**
 * @class Mnemonics
 * @extends {GelatoPage}
 */
module.exports = GelatoPage.extend({

  /**
   * @property events
   * @type {Object}
   */
  events: {
    'click .vocab-row': 'handleClickVocabRow',
    'click #load-more-btn': 'handleClickLoadMoreButton',
    'change input[type="checkbox"]': 'handleChangeCheckbox',
    'click #delete-mnemonics-btn': 'handleClickDeleteMnemonicsButton'
  },

  /**
   * @property template
   * @type {Function}
   */
  template: require('./WordsMnemonics'),

  /**
   * @property title
   * @type {String}
   */
  title: 'Mnemonics - Skritter',

  /**
   * @method initialize
   * @constructor
   */
  initialize: function() {
    this.sidebar = new WordsSidebar();
    this.mnemonicVocabs = new Vocabs();
    this.limit = 20;

    this.listenTo(this.mnemonicVocabs, 'state', this.renderTable);
    this.fetchMnemonics();
  },

  /**
   * @method remove
   */
  remove: function() {
    this.sidebar.remove();

    return GelatoPage.prototype.remove.call(this);
  },

  /**
   * @method render
   * @returns {VocablistBrowse}
   */
  render: function() {
    if (app.isMobile()) {
      this.template = require('./MobileWordsMnemonics.jade');
    }

    this.renderTemplate();
    this.sidebar.setElement('#words-sidebar-container').render();

    return this;
  },

  /**
   * @method fetchItems
   * @param {string} [cursor]
   */
  fetchMnemonics: function(cursor) {
    this.mnemonicVocabs.fetch({
      data: {
        sort: 'mnemonic',
        lang: app.getLanguage(),
        limit: this.limit,
        cursor: cursor || ''
      },
      remove: false,
      sort: false
    });
  },

  /**
   * @method handleChangeCheckbox
   * @param {Event} event
   */
  handleChangeCheckbox: function(event) {
    var checkbox = $(event.target);
    if (checkbox.attr('id') === 'all-checkbox') {
      this.$('input[type="checkbox"]').prop('checked', checkbox.prop('checked'));
    }
    var anyChecked = this.mnemonicVocabs.length && this.$('input[type="checkbox"]:checked').length;
    this.$('#delete-mnemonics-btn').prop('disabled', !anyChecked);
  },

  /**
   * @method handleClickDeleteMnemonicsButton
   */
  handleClickDeleteMnemonicsButton: function() {
    var self = this;
    var vocabs = new Vocabs();
    _.forEach(this.$('input:checked'), function(el) {
      var vocabID = $(el).closest('tr').data('vocab-id');
      if (!vocabID) {
        return;
      }
      vocabs.add(self.mnemonicVocabs.get(vocabID));
      self.mnemonicVocabs.remove(vocabID);
    });
    this.beginVocabAction('delete-mnemonic', vocabs);
    this.renderTable();
    this.$('#delete-mnemonics-btn').prop('disabled', true);
  },

  /**
   * @method handleClickLoadMoreButton
   */
  handleClickLoadMoreButton: function() {
    this.fetchMnemonics(this.mnemonicVocabs.cursor);
  },

  /**
   * @method handleClickVocabRow
   * @param {Event} event
   */
  handleClickVocabRow: function(event) {
    event.preventDefault();
    const row = $(event.target).parent('tr');
    const vocabId = row.data('vocab-id');

    if (vocabId) {
      if (app.isMobile()) {
        vent.trigger('vocabInfo:toggle', vocabId);
      } else {
        this.dialog = new VocabViewerDialog();
        this.dialog.load(vocabId);
        this.dialog.open();
      }
    }
  },

  /**
   * @method renderTable
   */
  renderTable: function() {
    var context = require('globals');
    context.view = this;
    var rendering = $(this.template(context));
    this.$('.table-oversized-wrapper').replaceWith(rendering.find('.table-oversized-wrapper'));
  }
});

_.extend(module.exports.prototype, VocabActionMixin);
