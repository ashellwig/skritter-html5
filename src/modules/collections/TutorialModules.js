/**
 * @module Application
 */
define([
    'core/modules/GelatoCollection',
    'modules/data/TutorialData',
    'modules/models/TutorialModule'
], function(GelatoCollection, TutorialData, TutorialModule) {

    /**
     * @class TutorialModules
     * @extends GelatoCollection
     */
    var TutorialModules = GelatoCollection.extend({
        /**
         * @method initialize
         * @constructor
         */
        initialize: function() {
            this.add(Tutorials.getData());
        },
        /**
         * @property model
         * @type TutorialModule
         */
        model: TutorialModule,
        /**
         * @method getVocabIds
         * @returns {Array}
         */
        getVocabIds: function() {
            return this.map(function(module) {
                return module.get('vocabId');
            });
        }
    });

    return TutorialModules;

});