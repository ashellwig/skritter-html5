var Component = require('base/component');

/**
 * @class PromptToolbarAction
 * @extends {Component}
 */
module.exports = Component.extend({
    /**
     * @method initialize
     * @param {Object} options
     * @constructor
     */
    initialize: function(options) {
        this.prompt = options.prompt;
    },
    /**
     * @property buttonCorrect
     * @type {Boolean}
     */
    buttonCorrect: true,
    /**
     * @property buttonErase
     * @type {Boolean}
     */
    buttonErase: true,
    /**
     * @property buttonShow
     * @type {Boolean}
     */
    buttonShow: true,
    /**
     * @property buttonTeach
     * @type {Boolean}
     */
    buttonTeach: true,
    /**
     * @property template
     * @type {Function}
     */
    template: require('./template'),
    /**
     * @method render
     * @returns {PromptToolbarAction}
     */
    render: function() {
        this.renderTemplate();
        return this;
    },
    /**
     * @property events
     * @type Object
     */
    events: {
        'vclick #toolbar-correct': 'handleClickOptionCorrect',
        'vclick #toolbar-erase': 'handleClickOptionErase',
        'vclick #toolbar-show': 'handleClickOptionShow',
        'vclick #toolbar-stroke-order': 'handleClickOptionTeach'
    },
    /**
     * @method handleClickOptionCorrect
     * @param {Event} event
     */
    handleClickOptionCorrect: function(event) {
        event.preventDefault();
        this.trigger('click:correct');
    },
    /**
     * @method handleClickOptionErase
     * @param {Event} event
     */
    handleClickOptionErase: function(event) {
        event.preventDefault();
        this.trigger('click:erase');
    },
    /**
     * @method handleClickOptionShow
     * @param {Event} event
     */
    handleClickOptionShow: function(event) {
        event.preventDefault();
        this.trigger('click:show');
    },
    /**
     * @method handleClickOptionTeach
     * @param {Event} event
     */
    handleClickOptionTeach: function(event) {
        event.preventDefault();
        this.trigger('click:teach');
    }
});