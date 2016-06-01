var GelatoPage = require('gelato/page');
var Vocabs = require('collections/vocabs');
var WordsSidebar = require('components/words/sidebar/view');
var ProgressDialog = require('dialogs/progress/view');
var VocabActionMixin = require('mixins/vocab-action');
var ConfirmDialog = require('dialogs1/confirm-generic/view');
/**
 * @class StarredWords
 * @extends {GelatoPage}
 */
module.exports = GelatoPage.extend({
  /**
   * @method initialize
   * @constructor
   */
  initialize: function() {
    this._views = {};

    this.sidebar = new WordsSidebar();
    this.starredVocabs = new Vocabs();
    this.limit = 20;

    this._views['confirmDialog'] = new ConfirmDialog({
      title: app.locale('pages.starredWords.confirmDeleteDialogTitle'),
      body: app.locale('pages.starredWords.confirmDeleteDialogBody')
    });

    this.listenTo(this._views['confirmDialog'], 'confirm', this.handleConfirmDeleteAllStarred);
    this.listenTo(this.starredVocabs, 'sync', this.renderTable);

    this.fetchStarredVocabs();
  },

  /**
   * @property events
   * @type {Object}
   */
  events: {
    'click #load-more-btn': 'handleClickLoadMoreButton',
    'click #remove-all-stars-link': 'fetchAllStarredVocabsThenRemoveThem',
    'click .star-td a': 'handleClickStarLink'
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
    this.renderTemplate();
    this.sidebar.setElement('#words-sidebar-container').render();

    return this;
  },

  /**
   * @property template
   * @type {Function}
   */
  template: require('./template'),

  /**
   * @property title
   * @type {String}
   */
  title: app.locale('pages.starredWords.title'),

  /**
   * @method fetchAllStarredVocabsThenRemoveThem
   */
  fetchAllStarredVocabsThenRemoveThem: function() {
    if (this.starredVocabs.cursor) {
      if (!this.getAllVocabsDialog) {
        this.getAllVocabsDialog = new ProgressDialog({
          title: 'Loading starred words',
          showBar: false
        });
        this.getAllVocabsDialog.render().open();
        this.getAllVocabsDialog.setProgress(100);
      }
      this.fetchStarredVocabs(this.starredVocabs.cursor);
      this.listenToOnce(this.starredVocabs, 'sync', this.fetchAllStarredVocabsThenRemoveThem);
    }
    else {
      // TODO: Make BootstrapDialog able to hide immediately so that
      // this process of hiding one then showing another doesn't have
      // to be convoluted.
      if (this.getAllVocabsDialog) {
        this.getAllVocabsDialog.close();
        var removeAllStars = _.bind(this.removeAllStars, this);
        this.listenToOnce(this.getAllVocabsDialog, 'hidden', function() {
          _.defer(removeAllStars);
        });
        this.getAllVocabsDialog = null;
      }
      else {
        this._views['confirmDialog'].open();
      }
    }
  },

  /**
   * @method fetchItems
   * @param {string} [cursor]
   */
  fetchStarredVocabs: function(cursor) {
    this.starredVocabs.fetch({
      data: {
        sort: 'starred',
        limit: this.limit,
        cursor: cursor || ''
      },
      remove: false,
      sort: false
    });
  },

  /**
   * @method handleClickLoadMoreButton
   */
  handleClickLoadMoreButton: function() {
    this.fetchStarredVocabs(this.starredVocabs.cursor);
  },

  /**
   * @method handleClickStarLink
   * @param {Event} event
   */
  handleClickStarLink: function(event) {
    var vocabID = $(event.target).closest('tr').data('vocab-id');
    var vocab = this.starredVocabs.get(vocabID);
    vocab.toggleStarred();
    $(event.target)
      .toggleClass('glyphicon-star')
      .toggleClass('glyphicon-star-empty');
    vocab.save(
      {id: vocab.id, starred: vocab.get('starred')},
      {method: 'PUT', patch: true}
    );
  },

  /**
   * @method removeAllStars
   */
  removeAllStars: function() {
    this.beginVocabAction('remove-star', this.starredVocabs);
    this.starredVocabs.reset();
    this.renderTable();
  },

  /**
   * @method renderTable
   */
  renderTable: function() {
    var context = require('globals');
    context.view = this;
    var rendering = $(this.template(context));
    this.$('.table-oversized-wrapper').replaceWith(rendering.find('.table-oversized-wrapper'));

    this.$('#remove-all-stars-link').prop('disabled', !this.starredVocabs.length);
  },

  handleConfirmDeleteAllStarred: function() {
    this._views['confirmDialog'].close();
    var self = this;
    setTimeout(function() {
      self.removeAllStars();
    }, 250);

  }
});

_.extend(module.exports.prototype, VocabActionMixin);
