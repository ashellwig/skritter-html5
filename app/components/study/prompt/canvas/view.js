var GelatoComponent = require('gelato/component');

/**
 * @class StudyPromptCanvas
 * @extends {GelatoComponent}
 */
module.exports = GelatoComponent.extend({
	/**
	 * @method initialize
	 * @param {Object} options
	 * @constructor
	 */
	initialize: function(options) {
		this.brushScale = 0.04;
		this.defaultFadeEasing = createjs.Ease.sineOut;
		this.defaultFadeSpeed = 1000;
		this.defaultTraceFill = '#38240c';
		this.grid = false;
		this.gridColor = '#b2b5b9';
		this.gridDashLength = 10;
		this.gridLineWidth = 0.5;
		this.mouseDownEvent = null;
		this.mouseLastDownEvent = null;
		this.mouseLastUpEvent = null;
		this.mouseTapTimeout = null;
		this.mouseUpEvent = null;
		this.prompt = options.prompt;
		this.size = 450;
		this.stage = null;
		this.strokeColor = '#4b4b4b';

		this.downListener = null;
		this.moveListener = null;
		this.leaveListener = null;
		this.upListener = null;

		createjs.Graphics.prototype.dashedLineTo = function(x1, y1, x2, y2, dashLength) {
			this.moveTo(x1, y1);
			var dX = x2 - x1;
			var dY = y2 - y1;
			var dashes = Math.floor(Math.sqrt(dX * dX + dY * dY) / dashLength);
			var dashX = dX / dashes;
			var dashY = dY / dashes;
			var i = 0;
			while (i++ < dashes) {
				x1 += dashX;
				y1 += dashY;
				this[i % 2 === 0 ? 'moveTo' : 'lineTo'](x1, y1);
			}
			this[i % 2 === 0 ? 'moveTo' : 'lineTo'](x2, y2);
			return this;
		};

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
	 * @method render
	 * @returns {StudyPromptCanvas}
	 */
	render: function() {
		this.renderTemplate();
		this.stage = this.createStage();
		this.createLayer('character-grid');
		this.createLayer('character-background');
		this.createLayer('character-hint');
		this.createLayer('character-reveal');
		this.createLayer('character-teach');
		this.createLayer('character');
		this.createLayer('input-background2');
		this.createLayer('input-background1');
		this.createLayer('stroke-hint');
		this.createLayer('input');
		this.disableCanvas();
		this.enableCanvas();
		return this;
	},
	/**
	 * @method clearLayer
	 * @param {String} name
	 * @returns {StudyPromptCanvas}
	 */
	clearLayer: function(name) {
		var layer = this.getLayer(name);
		createjs.Tween.removeTweens(layer);
		layer.removeAllChildren();
		layer.uncache();
		layer.alpha = 1;
		this.stage.update();
		return this;
	},
	/**
	 * @method createLayer
	 * @param {String} name
	 * @returns {createjs.Container}
	 */
	createLayer: function(name) {
		var layer = new createjs.Container();
		layer.name = 'layer-' + name;
		this.stage.addChild(layer);
		return layer;
	},
	/**
	 * @method createStage
	 * @returns {createjs.Stage}
	 */
	createStage: function() {
		var canvas = this.$('#input-canvas').get(0);
		var stage = new createjs.Stage(canvas);
		createjs.Ticker.removeEventListener('tick', stage);
		createjs.Ticker.addEventListener('tick', stage);
		createjs.Touch.enable(stage);
		createjs.Ticker.setFPS(24);
		stage.autoClear = true;
		stage.enableDOMEvents(true);
		return stage;
	},
	/**
	 * @method disableCanvas
	 * @returns {Canvas}
	 */
	disableCanvas: function() {
		this.stage.removeEventListener('stagemousedown', _.bind(this.triggerCanvasMouseDown, this));
		this.stage.removeEventListener('stagemouseup', _.bind(this.triggerCanvasMouseUp, this));
		return this;
	},
	/**
	 * @method disableGrid
	 * @returns {StudyPromptCanvas}
	 */
	disableGrid: function() {
		this.clearLayer('character-grid');
		this.grid = false;
		return this;
	},
	/**
	 * @method disableInput
	 * @returns {StudyPromptCanvas}
	 */
	disableInput: function() {
		this.$('#input-canvas').off('.Input');
		this.stage.removeEventListener('stagemousedown', this.downListener);
		this.stage.removeEventListener('stagemousemove', this.moveListener);
		this.stage.removeEventListener('stagemouseup', this.upListener);
		this.stage.removeEventListener('mouseleave', this.leaveListener);
		return this;
	},
	/**
	 * @method drawCircle
	 * @param {String} layerName
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} radius
	 * @param {Object} options
	 * @returns {createjs.Shape}
	 */
	drawCircle: function(layerName, x, y, radius, options) {
		var circle = new createjs.Shape();
		options = options ? options : {};
		circle.graphics.beginFill(options.fill || '#000000');
		circle.graphics.drawCircle(x, y, radius);
		if (options.alpha) {
			circle.alpha = options.alpha;
		}
		this.getLayer(layerName).addChild(circle);
		this.stage.update();
		return circle;
	},
	/**
	 * @method drawGrid
	 * @returns {StudyPromptCanvas}
	 */
	drawGrid: function() {
		var grid = new createjs.Shape();
		this.clearLayer('character-grid');
		grid.graphics.beginStroke(this.gridColor).setStrokeStyle(this.gridLineWidth, 'round', 'round');
		grid.graphics.dashedLineTo(this.size / 2, 0, this.size / 2, this.size, this.gridDashLength);
		grid.graphics.dashedLineTo(0, this.size / 2, this.size, this.size / 2, this.gridDashLength);
		grid.graphics.dashedLineTo(0, 0, this.size, this.size, this.gridDashLength);
		grid.graphics.dashedLineTo(this.size, 0, 0, this.size, this.gridDashLength);
		grid.graphics.endStroke();
		grid.cache(0, 0, this.size, this.size);
		this.getLayer('character-grid').addChild(grid);
		this.stage.update();
		return this;
	},
	/**
	 * @method drawCharacter
	 * @param {String} layerName
	 * @param {String} character
	 * @param {Object} [options]
	 * @returns {createjs.Text}
	 */
	drawCharacter: function(layerName, character, options) {
		options = options || {};
		options.color = options.color || '#000000';
		options.font = options.font || 'Arial';
		options.size = options.size || this.size;
		var font = options.size + 'px ' + options.font;
		var text = new createjs.Text(character, font, options.color);
		this.getLayer(layerName).addChild(text);
		this.stage.update();
		return text;
	},
	/**
	 * @method drawShape
	 * @param {String} layerName
	 * @param {createjs.Container|createjs.Shape} shape
	 * @param {Object} [options]
	 * @returns {createjs.Shape}
	 */
	drawShape: function(layerName, shape, options) {
		options = options || {};
		if (options.color) {
			this.injectColor(shape, options.color);
		}
		this.getLayer(layerName).addChild(shape);
		this.stage.update();
		return shape;
	},
	/**
	 * @method enableCanvas
	 * @returns {Canvas}
	 */
	enableCanvas: function() {
		this.stage.addEventListener('stagemousedown', _.bind(this.triggerCanvasMouseDown, this));
		this.stage.addEventListener('stagemouseup', _.bind(this.triggerCanvasMouseUp, this));
		return this;
	},
	/**
	 * @method disableGrid
	 * @returns {StudyPromptCanvas}
	 */
	enableGrid: function() {
		this.drawGrid();
		this.grid = true;
		return this;
	},
	/**
	 * Enables touch and mouse input on the canvas and handles the events.
	 * Draws a line to follow the input.
	 * @method enableInput
	 * @returns {StudyPromptCanvas}
	 * @TODO refactor these inner functions and local vars into instance fns
	 * and variables--this function does too much!
	 */
	enableInput: function() {
		var self = this;
		var oldPoint, oldMidPoint, points, marker;

		this.disableInput();
		this.downListener = self.stage.addEventListener('stagemousedown', onInputDown);

		function onInputDown(event) {
			points = [];
			marker = new createjs.Shape();
			marker.graphics.setStrokeStyle(self.size * self.brushScale, 'round', 'round');
			marker.stroke = marker.graphics.beginStroke(self.strokeColor).command;

			points.push(new createjs.Point(event.stageX, event.stageY));
			oldPoint = oldMidPoint = points[0];
			self.triggerInputDown(oldPoint);
			self.getLayer('input').addChild(marker);

			self.moveListener = self.stage.addEventListener('stagemousemove', onInputMove);
			self.upListener = self.stage.addEventListener('stagemouseup', onInputUp);
			self.leaveListener = self.stage.addEventListener('mouseleave', onInputLeave);
		}

		function onInputMove(event) {
			var point = new createjs.Point(event.stageX, event.stageY);
			var midPoint = new createjs.Point(oldPoint.x + point.x >> 1, oldPoint.y + point.y >> 1);

			if (app.fn.getDistance(oldPoint, point) > 3.0) {
				marker.graphics
					.setStrokeStyle(self.size * self.brushScale, 'round', 'round')
					.moveTo(midPoint.x, midPoint.y)
					.curveTo(oldPoint.x, oldPoint.y, oldMidPoint.x, oldMidPoint.y);
				oldPoint = point.clone();
				oldMidPoint = midPoint.clone();
				points.push(point);
				self.stage.update();
			}
		}

		function onInputLeave(event) {
			onInputUp(event);
		}

		function onInputUp(event) {
			self.stage.removeEventListener('stagemousemove', onInputMove);
			self.stage.removeEventListener('stagemouseup', onInputUp);
			self.stage.removeEventListener('mouseleave', onInputLeave);

			marker.graphics.endStroke();
			points.push(new createjs.Point(event.stageX, event.stageY));

			var clonedMarker = marker.clone(true);
			clonedMarker.stroke = marker.stroke;
			self.triggerInputUp(points, clonedMarker);
			self.getLayer('input').removeAllChildren();
		}

		return this;
	},

	/**
	 * @method fadeLayer
	 * @param {String} layerName
	 * @param {Object} [options]
	 * @param {Function} [callback]
	 */
	fadeLayer: function(layerName, options, callback) {
		var layer = this.getLayer(layerName);
		options = options || {};
		options.easing = options.easing || this.defaultFadeEasing;
		options.milliseconds = options.milliseconds || this.defaultFadeSpeed;
		createjs.Tween
			.get(layer).to({alpha: 0}, options.milliseconds, options.easing)
			.call(function() {
				layer.removeAllChildren();
				layer.alpha = 1;
				if (typeof callback === 'function') {
					callback();
				}
			});
	},
	/**
	 * @method fadeShape
	 * @param {String} layerName
	 * @param {createjs.Shape} shape
	 * @param {Object} [options]
	 * @param {Function} [callback]
	 */
	fadeShape: function(layerName, shape, options, callback) {
		var layer = this.getLayer(layerName);
		options = options || {};
		options.easing = options.easing || this.defaultFadeEasing;
		options.milliseconds = options.milliseconds || this.defaultFadeSpeed;
		layer.addChild(shape);
		createjs.Tween
			.get(shape).to({alpha: 0}, options.milliseconds, options.easing)
			.call(function() {
				layer.removeChild(shape);
				shape.alpha = 1;
				if (typeof callback === 'function') {
					callback();
				}
			});
	},
	/**
	 * @method getLayer
	 * @param {String} name
	 * @returns {createjs.Container}
	 */
	getLayer: function(name) {
		return this.stage.getChildByName('layer-' + name);
	},
	/**
	 * @method injectColor
	 * @param {createjs.Container|createjs.Shape} object
	 * @param {String} color
	 */
	injectColor: function(object, color) {
		var customFill = new createjs.Graphics.Fill(color);
		var customStroke = new createjs.Graphics.Stroke(color);
		(function inject(object) {
			if (object.children) {
				for (var i = 0, length = object.children.length; i < length; i++) {
					inject(object.children[i]);
				}
			} else if (object.graphics) {
				if (object.stroke) {
					object.stroke.style = color;
				} else {
					object.graphics._dirty = true;
					object.graphics._fill = customFill;
					object.graphics._stroke = customStroke;
				}
			}
		})(object);
		return this;
	},
	/**
	 * @method injectLayerColor
	 * @param {String} layerName
	 * @param {String} color
	 * @returns {StudyPromptCanvas}
	 */
	injectLayerColor: function(layerName, color) {
		return this.injectColor(this.getLayer(layerName), color);
	},
	/**
	 * @method remove
	 * @returns {StudyPrompt}
	 */
	remove: function() {
		return GelatoComponent.prototype.remove.call(this);
	},
	/**
	 * @method reset
	 * @returns {StudyPromptCanvas}
	 */
	reset: function() {
		clearTimeout(this.mouseTapTimeout);
		this.getLayer('character-grid').removeAllChildren();
		this.getLayer('character-background').removeAllChildren();
		this.getLayer('character-hint').removeAllChildren();
		this.getLayer('character-reveal').removeAllChildren();
		this.getLayer('character-teach').removeAllChildren();
		this.getLayer('character').removeAllChildren();
		this.getLayer('input-background2').removeAllChildren();
		this.getLayer('input-background1').removeAllChildren();
		this.getLayer('stroke-hint').removeAllChildren();
		this.getLayer('input').removeAllChildren();
		this.resize();
		return this;
	},
	/**
	 * @method resize
	 * @returns {StudyPromptCanvas}
	 */
	resize: function() {
		var size = this.prompt.getInputSize();
		this.$el.height(size);
		this.$el.width(size);
		this.stage.canvas.height = size;
		this.stage.canvas.width = size;
		this.stage.update();
		this.size = size;
		if (this.grid) {
			this.drawGrid();
		}
		//TODO: depreciate usage of global canvas size
		app.set('canvasSize', size);
		return this;
	},
	/**
	 * @method tracePath
	 * @param {String} layerName
	 * @param {Array} path
	 * @param {Object} [options]
	 */
	tracePath: function(layerName, path, options) {
		options = options || {};
		options.fill = options.fill || this.defaultTraceFill;
		var size = this.size;
		var circle = this.drawCircle(layerName, path[0].x, path[0].y, 10, {alpha: 0.6, fill: options.fill});
		var tween = createjs.Tween.get(circle, {loop: true});
		for (var i = 1, length = path.length; i < length; i++) {
			var adjustedPoint = new createjs.Point(path[i].x - path[0].x, path[i].y - path[0].y);
			var throttle = (app.fn.getDistance(path[i], path[i - 1]) / size) * 2000;
			if (path.length < 3) {
				tween.to({x: adjustedPoint.x, y: adjustedPoint.y}, 1000);
			} else {
				tween.to({x: adjustedPoint.x, y: adjustedPoint.y}, throttle);
			}
			if (i === length - 1) {
				tween.wait(1000);
			}
		}
	},
	/**
	 * @method triggerCanvasMouseDown
	 * @param {Object} event
	 */
	triggerCanvasMouseDown: function(event) {
		event.preventDefault();
		this.trigger('mousedown', event);
		this.mouseDownEvent = event;
	},
	/**
	 * @method triggerCanvasMouseUp
	 * @param {Object} event
	 */
	triggerCanvasMouseUp: function(event) {
		event.preventDefault();
		this.trigger('mouseup', event);
		this.mouseLastDownEvent = this.mouseDownEvent;
		this.mouseLastUpEvent = this.mouseUpEvent;
		this.mouseUpEvent = event;
		var linePositionStart = {x: this.mouseDownEvent.stageX, y: this.mouseDownEvent.stageY};
		var linePositionEnd = {x: this.mouseUpEvent.stageX, y: this.mouseUpEvent.stageY};
		var lineAngle = app.fn.getAngle(linePositionStart, linePositionEnd);
		var lineDistance = app.fn.getDistance(linePositionStart, linePositionEnd);
		var lineDuration = this.mouseUpEvent.timeStamp - this.mouseDownEvent.timeStamp;
		if (this.mouseLastUpEvent) {
			var lineLastPositionStart = {x: this.mouseLastDownEvent.stageX, y: this.mouseLastDownEvent.stageY};
			var lineLastPositionEnd = {x: this.mouseLastUpEvent.stageX, y: this.mouseLastUpEvent.stageY};
			var lineLastDistance = app.fn.getDistance(lineLastPositionStart, lineLastPositionEnd);
			var lineLastDuration = this.mouseUpEvent.timeStamp - this.mouseLastUpEvent.timeStamp;
			if (lineLastDistance < 5 && lineLastDuration > 50 && lineLastDuration < 200) {
				clearTimeout(this.mouseTapTimeout);
				this.trigger('doubletap', event);
				return;
			}
		}
		if (this.mouseDownEvent) {
			if (lineDistance > this.size / 2 && lineAngle < -70 && lineAngle > -110) {
				this.trigger('swipeup', event);
				return;
			}
			if (lineDuration > 1000) {
				this.trigger('clickhold', event);
				return;
			}
		}
		if (this.mouseUpEvent) {
			if (lineDistance < 5 && lineDuration < 1000) {
				this.mouseTapTimeout = setTimeout((function() {
					this.trigger('tap', event);
				}).bind(this), 200);
			}
		}
		this.trigger('click', event);
	},
	/**
	 * @method triggerInputDown
	 * @param {createjs.Point} point
	 */
	triggerInputDown: function(point) {
		this.trigger('input:down', point);
	},
	/**
	 * @method triggerInputMove
	 * @param {createjs.Point} point
	 */
	triggerInputMove: function(point) {
		this.trigger('input:move', point);
	},
	/**
	 * @method triggerInputUp
	 * @param {Array} points
	 * @param {createjs.Shape} shape
	 */
	triggerInputUp: function(points, shape) {
		this.trigger('input:up', points, shape);
	},
	/**
	 * @method triggerNavigateNext
	 * @param {Event} event
	 */
	triggerNavigateNext: function(event) {
		event.preventDefault();
		this.trigger('navigate:next');
	},
	/**
	 * @method triggerNavigatePrevious
	 * @param {Event} event
	 */
	triggerNavigatePrevious: function(event) {
		event.preventDefault();
		this.trigger('navigate:previous');
	},
	/**
	 * @method tweenShape
	 * @param {String} layerName
	 * @param {createjs.Shape} fromShape
	 * @param {createjs.Shape} toShape
	 * @param {Object} [options]
	 * @param {Function} [callback]
	 * @returns {StudyPromptCanvas}
	 */
	tweenShape: function(layerName, fromShape, toShape, options, callback) {
		this.getLayer(layerName).addChild(fromShape);
		options = options === undefined ? {} : options;
		options = options || {};
		options.easing = options.easing || createjs.Ease.quadIn;
		options.speed = options.speed || 200;
		createjs.Tween.get(fromShape).to({
			x: toShape.x,
			y: toShape.y,
			scaleX: toShape.scaleX,
			scaleY: toShape.scaleY
		}, options.speed, options.easing).call(function() {
			if (typeof callback === 'function') {
				callback();
			}
		});
		return this;
	}
});
