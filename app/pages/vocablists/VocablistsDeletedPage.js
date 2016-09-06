var GelatoPage = require('gelato/page');
var Table = require('components/vocablists/VocablistsDeletedTableComponent');
var Sidebar = require('components/vocablists/VocablistsSidebarComponent');

/**
 * @class VocablistDeleted
 * @extends {GelatoPage}
 */
module.exports = GelatoPage.extend({

  /**
   * @property template
   * @type {Function}
   */
  template: require('./VocablistsDeleted'),

  /**
   * @property title
   * @type {String}
   */
  title: 'Deleted Lists - Skritter',

  /**
   * @method initialize
   * @constructor
   */
  initialize: function() {
    this.sidebar = new Sidebar();
    this.table = new Table();
  },

  /**
   * @method render
   * @returns {VocablistDeleted}
   */
  render: function() {
    this.renderTemplate();
    this.sidebar.setElement('#vocablist-sidebar-container').render();
    this.table.setElement('#vocablist-container').render();
    return this;
  },

  /**
   * @method remove
   * @returns {VocablistDeleted}
   */
  remove: function() {
    this.sidebar.remove();
    this.table.remove();
    return GelatoPage.prototype.remove.call(this);
  }
});
