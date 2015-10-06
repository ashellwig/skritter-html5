var GelatoPage = require('gelato/page');
var Vocabs = require('collections/vocabs');
var WordsSidebar = require('components/words-sidebar/view');
var DefaultNavbar = require('navbars/default/view');
var VocabActionMixin = require('mixins/vocab-action');

/**
 * @class Mnemonics
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
        'change input[type="checkbox"]': 'handleChangeCheckbox',
        'vclick #delete-mnemonics-btn': 'handleClickDeleteMnemonicsButton'
    },
    /**
     * @method initialize
     * @constructor
     */
    initialize: function() {
        this.navbar = new DefaultNavbar();
        this.sidebar = new WordsSidebar();
        this.mnemonicVocabs = new Vocabs();
        this.listenTo(this.mnemonicVocabs, 'state', this.renderTable);
        this.limit = 20;
        this.fetchMnemonics();
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
    title: 'Mnemonics - Skritter',
    /**
     * @method fetchItems
     * @param {string} cursor
     */
    fetchMnemonics: function(cursor) {
        this.mnemonicVocabs.fetch({
            data: {
                sort: 'mnemonic',
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
        var anyChecked = this.$('input[type="checkbox"]:checked').length;
        this.$('#delete-mnemonics-btn').prop('disabled', !anyChecked);
    },
    /**
     * @method handleClickDeleteMnemonicsButton
     */
    handleClickDeleteMnemonicsButton: function() {
        var vocabs = new Vocabs();
        _.forEach(this.$('input:checked'), function(el) {
            var vocabID = $(el).closest('tr').data('vocab-id');
            if (!vocabID) {
                return;
            }
            vocabs.add(this.mnemonicVocabs.get(vocabID));
            this.mnemonicVocabs.remove(vocabID);
        }, this);
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
     * @method renderTable
     */
    renderTable: function() {
        var context = require('globals');
        context.view = this;
        var rendering = $(this.template(context));
        this.$('.table-oversized-wrapper').replaceWith(rendering.find('.table-oversized-wrapper'));
    },
});

_.extend(module.exports.prototype, VocabActionMixin);
