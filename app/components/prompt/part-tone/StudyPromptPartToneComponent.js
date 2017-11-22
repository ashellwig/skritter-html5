const GelatoComponent = require('gelato/component');
// const config = require('config');

/**
 * @class StudyPromptPartToneComponent
 * @extends {GelatoComponent}
 */
const StudyPromptPartToneComponent = GelatoComponent.extend({

  /**
   * @property el
   * @type {String}
   */
  el: '#review-container',

  /**
   * Whether the keyboard shortcuts should be registered for this prompt
   * @type {Boolean}
   */
  registerShortcuts: true,

  /**
   * @property template
   * @type {Function}
   */
  template: require('./StudyPromptPartToneComponent.jade'),

  /**
   * @method initialize
   * @param {Object} options
   * @constructor
   */
  initialize: function (options) {
    this.prompt = options.prompt;
    this.listenTo(this.prompt.canvas, 'click', this.handlePromptCanvasClick);
    this.listenTo(this.prompt.canvas, 'input:up', this.handlePromptCanvasInputUp);
    this.listenTo(this.prompt.toolbarAction, 'click:correct', this.handlePromptToolbarActionCorrect);
    this.listenTo(this.prompt.toolbarGrading, 'mousedown', this.handlePromptToolbarGradingMousedown);
    this.listenTo(this.prompt.toolbarGrading, 'mousemove', this.handlePromptToolbarGradingMousemove);
    this.listenTo(this.prompt.toolbarGrading, 'mouseup', this.handlePromptToolbarGradingMouseup);
    this.on('resize', this.render);
  },


  /**
   * @method render
   * @returns {StudyPromptPartToneComponent}
   */
  render: function () {
    if (app.isMobile()) {
      this.template = require('./MobileStudyPromptPartToneComponent.jade');
    }

    this.prompt.review = this.prompt.reviews.current();
    this.prompt.canvas.grid = false;
    this.prompt.canvas.reset();

    if (this.prompt.review.character) {
      this.prompt.canvas.clearLayer('character-reveal');
      this.prompt.canvas.drawShape(
        'character-reveal',
        this.prompt.review.character.getTargetShape(),
        {color: '#e8ded2'}
      );
    } else {
      this.prompt.canvas.clearLayer('character-reveal');
      this.prompt.canvas.drawCharacter(
        'character-reveal',
        this.prompt.review.vocab.get('writing'),
        {
          color: '#e8ded2',
          font: this.prompt.review.vocab.getFontName(),
        }
      );
    }

    this.prompt.canvas.drawShape(
      'character',
      this.prompt.review.tone.getUserShape(),
      {color: this.prompt.review.getGradingColor()}
    );

    this.prompt.toolbarAction.setPromptType('tone', false);

    if (app.isMobile()) {
      this.prompt.vocabDefinition.render();
      this.prompt.vocabMnemonic.render();
      this.prompt.vocabSentence.render();
      this.prompt.vocabStyle.render();
      this.prompt.vocabWriting.render();
    }

    if (this.prompt.review.isComplete()) {
      this.renderComplete();
    } else {
      this.renderIncomplete();
    }

    this.renderTemplate();

    return this;
  },

  /**
   * @method renderComplete
   * @returns {StudyPromptPartToneComponent}
   */
  renderComplete: function () {
    this.prompt.review.stop();
    this.prompt.review.set('complete', true);

    this.prompt.canvas.disableInput();

    this.prompt.canvas.injectLayerColor(
      'character',
      this.prompt.review.getGradingColor()
    );

    this.prompt.navigation.update();
    this.prompt.shortcuts.grading.listen();
    this.prompt.shortcuts.tone.stop_listening();
    this.prompt.toolbarAction.update();
    this.prompt.toolbarGrading.update(this.prompt.review.get('score'));
    this.prompt.vocabReading.render();

    if (!app.isMobile()) {
      this.prompt.toolbarVocab.update();
      this.prompt.vocabContained.render();
      this.prompt.vocabDefinition.render();
      this.prompt.vocabMnemonic.render();
      this.prompt.vocabSentence.render();
      this.prompt.vocabStyle.render();
      this.prompt.vocabWriting.render();
    }

    this.$('.tone-message').hide();

    if (app.user.isAudioEnabled() &&
      this.prompt.reviews.isLast()) {
      this.prompt.reviews.vocab.play();
    }

    this.prompt.trigger('tone:complete');

    return this;
  },

  /**
   * @method renderIncomplete
   * @returns {StudyPromptPartToneComponent}
   */
  renderIncomplete: function () {
    this.prompt.review.start();
    this.prompt.review.set('complete', false);

    this.prompt.canvas.enableInput();

    this.prompt.navigation.update();
    this.prompt.shortcuts.grading.stop_listening();
    this.prompt.shortcuts.tone.listen();
    this.prompt.toolbarAction.update();
    this.prompt.toolbarGrading.update();
    this.prompt.vocabReading.render();

    if (!app.isMobile()) {
      this.prompt.toolbarVocab.update();
      this.prompt.vocabContained.render();
      this.prompt.vocabDefinition.render();
      this.prompt.vocabMnemonic.render();
      this.prompt.vocabSentence.render();
      this.prompt.vocabStyle.render();
      this.prompt.vocabWriting.render();
    }

    this.$('.tone-message').show();

    return this;
  },

  /**
   * @method handlePromptCanvasClick
   */
  handlePromptCanvasClick: function () {
    if (this.prompt.review.isComplete()) {
      if (this.prompt.isAutoAdvancing) {
        this.prompt.stopAutoAdvance();
      } else {
        this.prompt.next();
      }
    }
  },

  /**
   * @method handlePromptCanvasInputUp
   * @param {Array} points
   * @param {createjs.Shape} shape
   */
  handlePromptCanvasInputUp: function (points, shape) {
    let possibleTones = this.prompt.review.getTones();
    let expectedTone = this.prompt.review.tone.getTone(possibleTones[0]);
    let stroke = this.prompt.review.tone.recognize(points, shape);

    if (stroke && app.fn.getLength(points) > 30) {
      let targetShape = stroke.getTargetShape();
      let userShape = stroke.getUserShape();

      if (possibleTones.indexOf(stroke.get('tone')) > -1) {
        this.prompt.review.set('score', 3);
        this.prompt.canvas.tweenShape(
          'character',
          userShape,
          targetShape
        );
      } else {
        this.prompt.review.set('score', 1);
        this.prompt.review.tone.reset();
        this.prompt.review.tone.add(expectedTone);
        this.prompt.canvas.drawShape(
          'character',
          expectedTone.getTargetShape()
        );
      }
    } else {
      this.prompt.review.tone.reset();
      this.prompt.review.tone.add(expectedTone);

      if (possibleTones.indexOf(5) > -1) {
        this.prompt.review.set('score', 3);
        this.prompt.canvas.drawShape(
          'character',
          this.prompt.review.tone.getTargetShape()
        );
      } else {
        this.prompt.review.set('score', 1);
        this.prompt.canvas.drawShape(
          'character',
          expectedTone.getTargetShape()
        );
      }
    }

    if (this.prompt.review.tone.isComplete()) {
      // inject the grading color before expensive rendering
      this.prompt.canvas.injectLayerColor(
        'character',
        this.prompt.review.getGradingColor()
      );

      // wait until events finish firing and call stack is cleared
      _.defer(() => {
        this.renderComplete();

        if (app.user.get('autoAdvancePrompts')) {
          this.prompt.startAutoAdvance();
        }
      });
    }
  },

  /**
   * @method handlePromptToolbarActionCorrect
   */
  handlePromptToolbarActionCorrect: function () {
    this.prompt.review.set('score', this.prompt.review.get('score') === 1 ? 3 : 1);
    this.prompt.review.set('complete', true);

    if (this.prompt.review.tone.isComplete()) {
      this.prompt.toolbarGrading.select(this.prompt.review.get('score'));
      this.prompt.toolbarAction.update();
      this.prompt.canvas.injectLayerColor(
        'character',
        this.prompt.review.getGradingColor()
      );
    } else {
      const possibleTones = this.prompt.review.getTones();
      const expectedTone = this.prompt.review.tone.getTone(possibleTones[0]);
      this.prompt.canvas.drawShape(
        'character',
        expectedTone.getTargetShape()
      );
      this.renderComplete();
    }
  },

  /**
   * Handles a mousedown event from the grading component.
   * Changes the color of the prompt to reflect the selected grade.
   * @method handlePromptToolbarGradingMousedown
   * @param {Number} score the new grade to apply
   */
  handlePromptToolbarGradingMousedown: function (score) {
    this._mouseDown = true;
    if (this.prompt.review.isComplete()) {
      this.prompt.review.set('score', score);
      this.prompt.canvas.injectLayerColor(
        'character',
        this.prompt.review.getGradingColor()
      );
    }
  },

  /**
   * Handles a mousemove event from the grading component.
   * Changes the color of the prompt to reflect the selected grade.
   * @method handlePromptToolbarGradingMousemove
   * @param {Number} score the new grade to apply
   */
  handlePromptToolbarGradingMousemove: function (score) {
    if (!this._mouseDown) {
      return;
    }
    this.prompt.stopAutoAdvance();
    this.changeReviewScore(score);
  },

  /**
   * Handles a mouseup event from the grading component.
   * Changes the color of the prompt to reflect the selected grade.
   * @method handlePromptToolbarGradingMouseup
   * @param {Number} score the new grade to apply
   */
  handlePromptToolbarGradingMouseup: function (score) {
    this._mouseDown = false;
    this.prompt.stopAutoAdvance();
    this.changeReviewScore(score);

    if (app.user.get('autoAdvancePrompts')) {
      this.prompt.startAutoAdvance();
    }
  },

  /**
   * Changes the score for a review and updates the UI accordingly.
   * Stops any auto-advance features.
   * @param {Number} score the score to change the review to
   */
  changeReviewScore: function (score) {
    this.prompt.review.set('score', score);
    this.prompt.canvas.injectLayerColor(
      'character',
      this.prompt.review.getGradingColor()
    );
  },

  /**
   * @method completeTone
   */
  completeTone: function () {
    const possibleTones = this.prompt.review.getTones();
    const expectedTone = this.prompt.review.tone.getTone(possibleTones[0]);

    this.prompt.canvas.clearLayer('character');
    this.prompt.review.set('complete', true);
    this.prompt.review.tone.reset();
    this.prompt.review.tone.add(expectedTone);

    this.render();
  },

});

module.exports = StudyPromptPartToneComponent;
