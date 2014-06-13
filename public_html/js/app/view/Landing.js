define([
    'require.text!template/landing.html',
    'base/View'
], function(template, BaseView) {
    /**
     * @class Landing
     */
    var View = BaseView.extend({
        /**
         * @method initialize
         */
        initialize: function() {
            BaseView.prototype.initialize.call(this);
        },
        /**
         * @method render
         * @returns {Backbone.View}
         */
        render: function() {
            this.$el.html(_.template(template, skritter.strings));
            BaseView.prototype.render.call(this).renderElements();
            if (skritter.user.getLanguageCode()) {
                this.elements.targetLanguage.text(skritter.user.getLanguageCode() === 'zh' ? 'Chinese' : 'Japanese');
            }
            return this;
        },
        /**
         * @method renderElements
         */
        renderElements: function() {
            this.elements.targetLanguage = this.$('.target-language');
        },
        /**
         * @property {Object} events
         */
        events: function() {
            return _.extend({}, BaseView.prototype.events, {
                'vclick .button-existing-user': 'clickExistingUser',
                'vclick .button-new-user': 'clickNewUser'
            });
        },
        /**
         * @method clickExistingUser
         * @param {Object} event
         */
        clickExistingUser: function(event) {
            skritter.router.navigate('login', {replace: true, trigger: true});
            event.preventDefault();
        },
        /**
         * @method clickNewUser
         * @param {Object} event
         */
        clickNewUser: function(event) {
            skritter.router.navigate('signup', {replace: true, trigger: true});
            event.preventDefault();
        }
    });

    return View;
});