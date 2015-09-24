var GelatoPage = require('gelato/page');
var Vocabs = require('collections/vocabs');
var WordsSidebar = require('components/words-sidebar/view');
var ProgressDialog = require('dialogs/progress/view');
var DefaultNavbar = require('navbars/default/view');
var VocabActionMixin = require('mixins/vocab-action');

/**
 * @class StarredWords
 * @extends {GelatoPage}
 */
module.exports = GelatoPage.extend({
    /**
     * @property bodyClass
     * @type {String}
     */
    bodyClass: 'background1',
    /**
     * @property events
     * @type {Object}
     */
    events: {
        'vclick #load-more-btn': 'handleClickLoadMoreButton',
        'vclick #remove-all-stars-link': 'fetchAllStarredVocabsThenRemoveThem',
        'vclick .star-td a': 'handleClickStarLink'
    },
    /**
     * @method initialize
     * @constructor
     */
    initialize: function() {
        this.navbar = new DefaultNavbar();
        this.sidebar = new WordsSidebar();
        this.starredVocabs = new Vocabs();
        this.listenTo(this.starredVocabs, 'sync', this.renderTable);
        this.limit = 20;
        this.fetchStarredVocabs();
    },
    /**
     * @method remove
     */
    remove: function() {
        this.navbar.remove();
        this.sidebar.remove();
        return GelatoPage.prototype.remove.call(this);
    },
    /**
     * @method render
     * @returns {VocablistBrowse}
     */
    render: function() {
        this.renderTemplate();
        this.navbar.render();
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
    title: 'Starred Words - Skritter',
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
            // TODO: Make GelatoDialog able to hide immediately so that
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
                this.removeAllStars();
            }

        }
    },
    /**
     * @method fetchItems
     * @param {string} cursor
     */
    fetchStarredVocabs: function(cursor) {
        this.starredVocabs.fetch({
            data: {
                sort: 'starred',
                limit: this.limit,
                cursor: cursor || ''
            },
            remove: false
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
     * @param {Event} e
     */
    handleClickStarLink: function(event) {
        var vocabID = $(event.target).closest('tr').data('vocab-id');
        var vocab = this.starredVocabs.get(vocabID);
        vocab.toggleStarred();
        $(event.target)
          .toggleClass('glyphicon-star')
          .toggleClass('glyphicon-star-empty');
        vocab.save(
          { id: vocab.id, starred: vocab.get('starred') },
          { method: 'PUT', patch: true }
        );
    },
    /**
     * @method removeAllStars
     */
    removeAllStars: function() {
        this.beginVocabAction('remove-star', this.starredVocabs.clone());
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
    }
});

_.extend(module.exports.prototype, VocabActionMixin);
