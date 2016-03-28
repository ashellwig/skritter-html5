var BootstrapDialog = require('base/bootstrap-dialog');

/**
 * Displays study settings that a user can customize for a VocabList.
 * @class VocablistSettingsDialog
 * @extends {BootstrapDialog}
 */
module.exports = BootstrapDialog.extend({
    /**
     * Initializes a new settings list. Fetches the vocablist and rerenders
     * the content of the view after it's been fetched.
     * @method initialize
     * @param {Object} options
     */
    initialize: function(options) {
        this.vocablist = options.vocablist;
        if (!this.vocablist) {
            throw new Error('VocablistSettingsDialog requires a vocablist passed in!')
        }
        if (!this.vocablist.get('sections')) {
            this.vocablist.fetch();
            //this.listenTo(this.vocablist, 'state', this.render);

            // Hack until state event and property works.
            this.listenTo(this.vocablist, 'sync', function() {
                this.vocablist.state = 'standby';
                this.renderContent();
            });
        }
    },
    /**
     * @property template
     * @type {Function}
     */
    template: require('dialogs/vocablist-settings/template'),
    /**
     * @method render
     * @returns {VocablistSettingsDialog}
     */
    render: function() {
        this.renderTemplate();
        return this;
    },
    /**
     * @method renderContent
     */
    renderContent: function() {
        var rendering = $(this.template(this.getContext()));
        this.$('.modal-content').replaceWith(rendering.find('.modal-content'));
    },
    /**
     * @property events
     * @type {Object}
     */
    events: {
        'vclick #close-btn': 'handleClickCloseButton',
        'vclick #save-btn': 'handleClickSaveButton'
    },
    /**
     * @method handleClickCloseButton
     * @param {Event} event
     */
    handleClickCloseButton: function(event) {
        this.close();
    },
    /**
     * @method handleClickSaveButton
     */
    handleClickSaveButton: function () {
        var getVals = function(el) { return $(el).val(); };

        var attributes = {
            studyingMode: this.$el.find('input[name="studyingMode"]:checked').val(),
            partsStudying: $.map(this.$el.find('input[name="partsStudying"]:checked'), getVals),
            limitSentenceParts: this.$el.find('input[name="limitSentenceParts"]').is(':checked'),
        };

        var studyAllListWritingsEl = this.$el.find('input[name="studyAllListWritings"]');
        if (studyAllListWritingsEl.length) {
            attributes.studyAllListWritings = studyAllListWritingsEl.is(':checked');
        }

        var currentSectionSelect = this.$el.find('select[name="currentSection"]');
        if (currentSectionSelect.length) {
            attributes.currentSection = currentSectionSelect.val();
        }

        var skipSectionsInputs = this.$el.find('input[name="sectionsSkipping"]');
        if (skipSectionsInputs.length) {
            var skippingInputs =  skipSectionsInputs.filter(':not(:checked)');
            attributes.sectionsSkipping = $.map(skippingInputs, getVals);
        }

        var autoSectionMovementEl = this.$el.find('input[name="autoSectionMovement"]');
        if (autoSectionMovementEl.length) {
            attributes.autoSectionMovement = autoSectionMovementEl.is(':not(:checked)');
        }

        this.vocablist.set(attributes).save();
        this.close();
    }
});
