var GelatoPage = require('gelato/page');
var Items = require('collections/items');
var Prompt = require('components/prompt/view');
var StudyToolbar = require('components/study-toolbar/view');
var DefaultNavbar = require('navbars/default/view');

/**
 * @class Study
 * @extends {GelatoPage}
 */
module.exports = GelatoPage.extend({
    /**
     * @method initialize
     * @constructor
     */
    initialize: function() {
        this._listId = null;
        this._sectionId = null;
        this.counter = 1;
        this.items = new Items();
        this.navbar = new DefaultNavbar();
        this.prompt = new Prompt();
        this.toolbar = new StudyToolbar({items: this.items});
        this.listenTo(this.prompt, 'next', this.handlePromptNext);
        this.listenTo(this.prompt, 'previous', this.handlePromptPrevious);
        this.listenTo(this.prompt, 'review:next', this.handlePromptReviewNext);
        this.listenTo(this.prompt, 'review:previous', this.handlePromptReviewPrevious);
        this.listenTo(this.prompt, 'review:start', this.handlePromptReviewStart);
        this.listenTo(this.prompt, 'review:stop', this.handlePromptReviewStop);
        this.listenTo(this.prompt, 'skip', this.handlePromptSkip);
        this.listenTo(this.toolbar, 'click:add-item', this.handleToolbarAddItem);
    },
    /**
     * @property events
     * @type Object
     */
    events: {},
    /**
     * @property template
     * @type {Function}
     */
    template: require('./template'),
    /**
     * @property title
     * @type {String}
     */
    title: 'Study - Skritter',
    /**
     * @property bodyClass
     * @type {String}
     */
    bodyClass: 'background1',
    /**
     * @method render
     * @returns {Study}
     */
    render: function() {
        this.renderTemplate();
        this.navbar.render();
        this.prompt.setElement('#prompt-container').render();
        this.toolbar.setElement('#toolbar-container').render();
        return this;
    },
    /**
     * @method handlePromptNext
     * @param {PromptReviews} reviews
     */
    handlePromptNext: function(reviews) {
        this.toolbar.timer.addLocalOffset(reviews.getBaseReviewingTime());
        this.items.addReviews(reviews.getItemReviews());
        this.items.reviews.save();
        this.counter++;
        this.next();
    },
    /**
     * @method handlePromptPrevious
     * @param {PromptReviews} reviews
     */
    handlePromptPrevious: function(reviews) {
        this.previous();
    },
    /**
     * @method handlePromptReviewNext
     * @param {PromptReviews} reviews
     */
    handlePromptReviewNext: function(reviews) {},
    /**
     * @method handlePromptPrevious
     * @param {PromptReviews} reviews
     */
    handlePromptReviewPrevious: function(reviews) {},
    /**
     * @method handlePromptPrevious
     * @param {PromptReviews} reviews
     */
    handlePromptReviewStart: function(reviews) {
        this.toolbar.timer.start();
    },
    /**
     * @method handlePromptPrevious
     * @param {PromptReviews} reviews
     */
    handlePromptReviewStop: function(reviews) {
        this.toolbar.timer.stop();
    },
    /**
     * @method handlePromptSkip
     * @param {PromptReviews} reviews
     */
    handlePromptSkip: function(reviews) {
        this.next();
    },
    /**
     * @method handleToolbarAddItem
     */
    handleToolbarAddItem: function() {
        this.items.add(
            _.bind(function(result) {
                $.notify(
                    {
                        icon: 'fa fa-plus-circle',
                        title: '',
                        message: result.numVocabsAdded + ' word has been added.'
                    },
                    {
                        type: 'minimalist',
                        animate: {
                            enter: 'animated fadeInDown',
                            exit: 'animated fadeOutUp'
                        },
                        delay: 5000,
                        icon_type: 'class'
                    }
                );
            }, this),
            _.bind(function() {
                $.notify(
                    {
                        icon: 'fa fa-exclamation-circle',
                        title: 'Error',
                        message: 'Unable to add a new word.'
                    },
                    {
                        type: 'minimalist',
                        animate: {
                            enter: 'animated fadeInDown',
                            exit: 'animated fadeOutUp'
                        },
                        delay: 5000,
                        icon_type: 'class'
                    }
                );
            }, this)
        );
    },
    /**
     * @method load
     * @param {String} [listId]
     * @param {String} [sectionId]
     */
    load: function(listId, sectionId) {
        //TODO: support section parameter
        this._listId = listId;
        this._sectionid = sectionId;
        async.waterfall([
            _.bind(function(callback) {
                this.loadMore(null, function(items) {
                    callback(null, items);
                }, function(error) {
                    callback(error, items);
                });
            }, this)
        ], _.bind(function(error, items) {
            if (error) {
                console.error('ITEM LOAD ERROR:', error, items);
            } else {
                this.loadMore(items.cursor);
                this.next();
            }
        }, this))
    },
    /**
     * @method loadMore
     * @param {String} [cursor]
     * @param {Function} [callbackSuccess]
     * @param {Function} [callbackError]
     */
    loadMore: function(cursor, callbackSuccess, callbackError) {
        if (this.items.state === 'standby') {
            this.items.fetch({
                data: {
                    cursor: cursor,
                    include_contained: true,
                    include_decomps: true,
                    include_sentences: true,
                    include_strokes: true,
                    include_vocabs: true,
                    limit: 10,
                    parts: app.user.getStudyParts().join(','),
                    sort: 'next',
                    styles: app.user.getStudyStyles().join(',')
                },
                merge: false,
                remove: false,
                error: function(items, error) {
                    _.isFunction(callbackError) ? callbackError(error, items) : undefined;
                },
                success: function(items) {
                    _.isFunction(callbackSuccess) ? callbackSuccess(items) : undefined;
                }
            });
        } else {
            console.error('ITEM LOAD ERROR:', 'fetch already in progress');
        }
    },
    /**
     * @method next
     */
    next: function() {
        var nextItem = this.items.getNext();
        if (this.prompt) {
            if (nextItem) {
                this.toolbar.timer.reset();
                this.prompt.set(nextItem.getPromptReviews());
            } else {
                console.error('ITEM LOAD ERROR:', 'no items');
            }
        }
        if (this.counter % 10 === 0) {
            console.log('LOADING MORE ITEMS:', 10);
            this.loadMore();
        }
    },
    /**
     * @method previous
     */
    previous: function() {},
    /**
     * @method remove
     * @returns {Study}
     */
    remove: function() {
        //TODO: figure out a better way to handle canceling ajax request
        this.navbar.remove();
        this.prompt.remove();
        this.navbar = null;
        this.prompt = null;
        return GelatoPage.prototype.remove.call(this);
    }
});
