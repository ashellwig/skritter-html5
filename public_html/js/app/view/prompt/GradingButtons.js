/**
 * @module Skritter
 * @submodule View
 * @param templateGradingButtons
 * @author Joshua McFarland
 */
define([
    'require.text!template/grading-buttons.html'
], function(templateGradingButtons) {
    /**
     * @class PromptGradingButtons
     */
    var GradingButtons = Backbone.View.extend({
        /**
         * @method initialize
         */
        initialize: function() {
            GradingButtons.animationSpeed = 100;
            GradingButtons.expanded = true;
            GradingButtons.value = 3;
        },
        /**
         * @method render
         * @returns {Backbone.View}
         */
        render: function() {
            this.$el.html(templateGradingButtons);
            return this;
        },
        /**
         * @property {Object} events
         */
        events: {
            'click.GradingButtons #grade1': 'handleButtonClick',
            'click.GradingButtons #grade2': 'handleButtonClick',
            'click.GradingButtons #grade3': 'handleButtonClick',
            'click.GradingButtons #grade4': 'handleButtonClick'
        },
        /**
         * @method collapse
         * @returns {Backbone.View}
         */
        collapse: function() {
            GradingButtons.expanded = false;
            for (var i = 1; i <= 4; i++) {
                if (this.$('#grade' + i).hasClass('selected')) {
                    this.$('#grade' + i).removeClass('hidden');
                } else {
                    this.$('#grade' + i).addClass('hidden');
                }
            }
            return this;
        },
        /**
         * @method expand
         * @returns {Backbone.View}
         */
        expand: function() {
            this.$('#grading-buttons').children().removeClass('hidden');
            GradingButtons.expanded = true;
            return this;
        },
        /**
         * @method grade
         * @param {Number} value
         * @returns {Number}
         */
        grade: function(value) {
            if (value)
                GradingButtons.value = value;
            return GradingButtons.value;
        },
        /**
         * @method handleButtonClick
         * @param {Object} event
         */
        handleButtonClick: function(event) {
            this.select(parseInt(event.currentTarget.id.replace(/[^\d]+/, ''), 10));
            if (GradingButtons.expanded) {
                this.triggerSelected();
            } else {
                this.toggle();
            }
        },
        /**
         * @method hide
         * @param {Boolean} skipAnimation
         */
        hide: function(skipAnimation) {
            if (skipAnimation) {
                this.$('#grading-buttons').hide();
            } else {
                this.$('#grading-buttons').hide(GradingButtons.animationSpeed);
            }
            return this;
        },
        /**
         * @method remove
         */
        remove: function() {
            this.$el.empty();
            this.stopListening();
            this.undelegateEvents();
        },
        /**
         * @method select
         * @param {Number} value
         */
        select: function(value) {
            if (value)
                GradingButtons.value = value;
            for (var i = 1; i <= 4; i++) {
                if (GradingButtons.value === i) {
                    this.$('#grade' + i).addClass('selected');
                } else {
                    this.$('#grade' + i).removeClass('selected');
                }
            }
            return this;
        },
        /**
         * @method show
         */
        show: function() {
            this.$('#grading-buttons').show(GradingButtons.animationSpeed);
            return this;
        },
        /**
         * @method toggle
         */
        toggle: function() {
            if (GradingButtons.expanded) {
                this.collapse();
            } else {
                this.expand();
            }
            return this;
        },
        /**
         * @method triggerSelected
         */
        triggerSelected: function() {
            this.trigger('selected', GradingButtons.value);
        }
    });

    return GradingButtons;
});