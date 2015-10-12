var GelatoDialog = require('gelato/dialog');

/**
 * @class StudySettingsDialog
 * @extends {GelatoDialog}
 */
module.exports = GelatoDialog.extend({
    /**
     * @property events
     * @type {Object}
     */
    events: {
        'click #button-close': 'handleClickClose',
        'click #button-save': 'handleClickSave'
    },
    /**
     * @property template
     * @type {Function}
     */
    template: require('./template'),
    /**
     * @method render
     * @returns {StudySettingsDialog}
     */
    render: function() {
        this.renderTemplate();
        return this;
    },
    /**
     * @method handleClickClose
     * @param {Event} event
     */
    handleClickClose: function(event) {
        event.preventDefault();
        this.close();
    },
    /**
     * @method handleClickSave
     * @param {Event} event
     */
    handleClickSave: function(event) {
        event.preventDefault();
        this.close();
    }
});
