const GelatoComponent = require('gelato/component');

const Canvas = require('components/study/prompt/canvas/StudyPromptCanvasComponent.js');
const Navigation = require('components/study/prompt/navigation/StudyPromptNavigationComponent.js');
const PartDefn = require('components/study/prompt/part-defn/StudyPromptPartDefnComponent.js');
const PartRdng = require('components/study/prompt/part-rdng/StudyPromptPartRdngComponent.js');
const PartRune = require('components/study/prompt/part-rune/StudyPromptPartRuneComponent.js');
const PartTone = require('components/study/prompt/part-tone/StudyPromptPartToneComponent.js');
const ReviewStatus = require('components/study/prompt/review-status/StudyPromptReviewStatusComponent.js');
const ToolbarAction = require('components/study/prompt/toolbar-action/StudyPromptToolbarActionComponent.js');
const ToolbarGrading = require('components/study/prompt/toolbar-grading/StudyPromptToolbarGradingComponent.js');
const ToolbarVocab = require('components/study/prompt/toolbar-vocab/StudyPromptToolbarVocabComponent.js');
const Tutorial = require('components/study/prompt/tutorial/StudyPromptTutorialComponent.js');
const VocabContained = require('components/study/prompt/vocab-contained/StudyPromptVocabContainedComponent.js');
const VocabDefinition = require('components/study/prompt/vocab-definition/StudyPromptVocabDefinitionComponent.js');
const VocabMnemonic = require('components/study/prompt/vocab-mnemonic/StudyPromptVocabMnemonicComponent.js');
const VocabReading = require('components/study/prompt/vocab-reading/StudyPromptVocabReadingComponent.js');
const VocabSentence = require('components/study/prompt/vocab-sentence/StudyPromptVocabSentenceComponent.js');
const VocabStyle = require('components/study/prompt/vocab-style/StudyPromptVocabStyleComponent.js');
const VocabWriting = require('components/study/prompt/vocab-writing/StudyPromptVocabWritingComponent.js');

const Shortcuts = require('components/study/prompt/StudyPromptShortcuts');
const vent = require('vent');

/**
 * @class StudyPromptComponent
 * @extends {GelatoComponent}
 */
const StudyPromptComponent = GelatoComponent.extend({

  /**
   * @property template
   * @type {Function}
   */
  template: require('./StudyPromptComponent.jade'),

  /**
   * @method initialize
   * @param {Object} options
   * @constructor
   */
  initialize: function(options) {
    //properties
    this.$inputContainer = null;
    this.$panelLeft = null;
    this.$panelRight = null;
    this.page = options.page;
    this.part = null;
    this.review = null;
    this.reviews = null;

    //components
    this.canvas = new Canvas({prompt: this});
    this.navigation = new Navigation({prompt: this});
    this.reviewStatus = new ReviewStatus({prompt: this});
    this.shortcuts = new Shortcuts({prompt: this});
    this.toolbarAction = new ToolbarAction({prompt: this});
    this.toolbarGrading = new ToolbarGrading({prompt: this});
    this.toolbarVocab = new ToolbarVocab({prompt: this});
    this.tutorial = new Tutorial({prompt: this});
    this.vocabContained = new VocabContained({prompt: this});
    this.vocabDefinition = new VocabDefinition({prompt: this});
    this.vocabMnemonic = new VocabMnemonic({prompt: this});
    this.vocabReading = new VocabReading({prompt: this});
    this.vocabSentence = new VocabSentence({prompt: this});
    this.vocabStyle = new VocabStyle({prompt: this});
    this.vocabWriting = new VocabWriting({prompt: this});
    this.on('resize', this.resize);

    this.listenTo(vent, 'vocab:play', this.playVocabAudio);
    this.listenTo(vent, 'studyPromptVocabInfo:show', this.showVocabInfo);
  },

  /**
   * @method render
   * @returns {StudyPromptComponent}
   */
  render: function() {
    if (app.isMobile()) {
      this.template = require('./MobileStudyPromptComponent.jade')
    }

    this.renderTemplate();

    this.$inputContainer = this.$('#input-container');
    this.$toolbarContainer = this.$('#toolbar-action-container');
    this.$panelLeft = this.$('#panel-left');
    this.$panelRight = this.$('#panel-right');

    this.canvas.setElement('#canvas-container').render();
    this.navigation.setElement('#navigation-container').render();
    this.reviewStatus.setElement('#review-status-container').render();
    this.toolbarAction.setElement('#toolbar-action-container').render();
    this.toolbarGrading.setElement('#toolbar-grading-container').render();
    this.toolbarVocab.setElement('#toolbar-vocab-container').render();
    this.tutorial.setElement('#tutorial-container').render().hide();
    this.vocabContained.setElement('#vocab-contained-container').render();
    this.vocabDefinition.setElement('#vocab-definition-container').render();
    this.vocabMnemonic.setElement('#vocab-mnemonic-container').render();
    this.vocabReading.setElement('#vocab-reading-container').render();
    this.vocabSentence.setElement('#vocab-sentence-container').render();
    this.vocabStyle.setElement('#vocab-style-container').render();
    this.vocabWriting.setElement('#vocab-writing-container').render();

    this.shortcuts.registerAll();
    this.resize();

    return this;
  },

  /**
   * @method renderPart
   * @returns {StudyPromptComponent}
   */
  renderPart: function() {
    if (this.part) {
      this.part.remove();
    }

    if (this.reviews.isNew()) {
      this.$('#new-ribbon').removeClass('hidden');
    } else {
      this.$('#new-ribbon').addClass('hidden');
    }

    switch (this.reviews.part) {
      case 'defn':
        this.part = new PartDefn({prompt: this}).render();
        break;
      case 'rdng':
        this.part = new PartRdng({prompt: this}).render();
        break;
      case 'rune':
        this.part = new PartRune({prompt: this}).render();
        break;
      case 'tone':
        this.part = new PartTone({prompt: this}).render();
        break;
    }

    // brush dot
    this.$('#canvas-container').toggleClass('rune', this.reviews.part === 'rune');

    this.toolbarVocab.disableEditing();

    return this;
  },

  /**
   * @method getInputSize
   * @returns {Number}
   */
  getInputSize: function() {
    var $content = this.$panelLeft.find('.content');
    if ($content.length) {
      return $content.width();
    } else {
      return 0;
    }
  },

  /**
   * @method next
   * @param {Boolean} [skip]
   */
  next: function(skip) {
    this.review.stop();

    if (skip || this.reviews.isLast()) {
      if (skip) {
        this.reviews.skip = true;
      }
      this.trigger('next', this.reviews);
    } else {
      this.reviews.next();
      this.trigger('reviews:next', this.reviews);
      this.renderPart();
    }
  },

  /**
   * Plays the audio for the current vocab.
   * @method playVocabAudio
   */
  playVocabAudio: function() {
    this.reviews.vocab.play();
  },

  /**
   * @method previous
   */
  previous: function() {
    this.review.stop();

    if (this.reviews.isFirst()) {
      this.trigger('previous', this.reviews);
    } else {
      this.reviews.previous();
      this.trigger('reviews:previous', this.reviews);
      this.renderPart();
    }
  },

  /**
   * @method remove
   * @returns {StudyPromptComponent}
   */
  remove: function() {
    this.canvas.remove();
    this.navigation.remove();

    if (this.part) {
      this.part.remove();
    }

    this.reviewStatus.remove();
    this.shortcuts.unregisterAll();
    this.toolbarAction.remove();
    this.toolbarGrading.remove();
    this.toolbarVocab.remove();
    this.tutorial.remove();
    this.vocabContained.remove();
    this.vocabDefinition.remove();
    this.vocabMnemonic.remove();
    this.vocabReading.remove();
    this.vocabSentence.remove();
    this.vocabStyle.remove();
    this.vocabWriting.remove();

    return GelatoComponent.prototype.remove.call(this);
  },

  /**
   * @method reset
   * @returns {StudyPromptComponent}
   */
  reset: function() {
    this.review = null;
    this.reviews = null;
    this.remove();
    this.render();
    return this;
  },

  /**
   * Resizes the input container and the toolbar for the current resolution
   * @method resize
   * @returns {StudyPromptComponent}
   */
  resize: function() {
    const inputSize = this.getInputSize();
    this.$inputContainer.css({height: inputSize, width: inputSize});

    this.canvas.resize();

    if (app.isMobile()) {
      this.$el.height(this.page.getHeight());
    }
    const toolbarHeight = this._getToolbarHeight();

    this.$toolbarContainer.css({height: toolbarHeight});

    return this;
  },

  /**
   * @method set
   * @param {PromptReviews} reviews
   * @returns {StudyPromptComponent}
   */
  set: function(reviews) {
    console.info('PROMPT:', reviews);
    this.reviews = reviews;
    this.renderPart();
    this.navigation.render();
    this.reviewStatus.render();

    return this;
  },

  /**
   * @method showVocabInfo
   */
  showVocabInfo: function() {
    if (app.isMobile()) {
      vent.trigger('vocabInfo:toggle', this.reviews.vocab.id);
    } else {
      app.dialogs.vocabViewer.load(this.reviews.vocab.id);
      app.dialogs.vocabViewer.open();
    }
  },

  /**
   * Calculates the intended height of the toolbar based on the current screen
   * resolution.
   * @return {number} the height the toolbar should be
   * @private
   */
  _getToolbarHeight: function() {
    if (app.isMobile()) {
      return $('#study-prompt-container').height() -
        this.$('#panel-right').height() -
        this.$('#input-container').height() -

        // there's some padding somewhere
        10;
    } else {
     return $('#study-prompt-container').height() -
       (this.$('#input-container').height() +

      // the margin-top property of #toolbar-action-container + the padding-top of #panel-left
      40 + 62);
    }
  }
});

module.exports = StudyPromptComponent;
