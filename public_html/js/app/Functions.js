define([
    'function/Bootstrap',
    'function/ChineseMap',
    'function/PinyinMap',
    'function/Recognizer',
    'function/Shortstraw',
    'function/StrokeShapeMap'
], function(Bootstrap, ChineseMap, PinyinMap, Recognizer, Shortstraw, StrokeShapeMap) {
    /**
     * @property {Object} bootstrap
     */
    var bootstrap = Bootstrap;
    /**
     * @method convertArrayToInt
     * @param {Array} array
     * @returns {Array}
     */
    var convertArrayToInt = function(array) {
        return array.map(function(value) {
            return parseInt(value, 10);
        });
    };
    /**
     * @method convertBytesToSize
     * @param {Number} bytes
     * @returns {String}
     */
    var convertBytesToSize = function(bytes) {
        var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes > 0) {
            var value = window.parseFloat(Math.floor(Math.log(bytes) / Math.log(1024)));
            return (bytes / Math.pow(1024, value)).toFixed(2) + ' ' + sizes[value];
        }
    };
    /**
     * @method getAngle
     * @param {Array|Object} point1 An array of point values
     * @param {Object} point2 An array of point values
     * @return {Number} The angle formed by the first and last points
     */
    var getAngle = function(point1, point2) {
        var p1 = Array.isArray(point1) ? point1[0] : point1;
        var p2 = Array.isArray(point1) ? point1[point1.length - 1] : point2;
        var xDiff = p2.x - p1.x;
        var yDiff = p2.y - p1.y;
        return (Math.atan2(yDiff, xDiff)) * (180 / Math.PI);
    };
    /**
     * @method getBoundingRectangle
     * @param {Array} points An array of point values
     * @param {Number} areaWidth The width of the canvas area
     * @param {Number} areaHeight The height of the canvas area
     * @param {Number} pointRadius The radius of
     * @return {Object} The bounds of the calculated rectangle
     */
    var getBoundingRectangle = function(points, areaWidth, areaHeight, pointRadius) {
        var left = areaWidth;
        var top = 0.0;
        var right = 0.0;
        var bottom = areaHeight;
        for (var i = 0, length = points.length; i < length; i++) {
            var x = points[i].x;
            var y = points[i].y;
            if (x - pointRadius < left)
                left = x - pointRadius;
            if (y + pointRadius > top)
                top = y + pointRadius;
            if (x + pointRadius > right)
                right = x + pointRadius;
            if (y - pointRadius < bottom)
                bottom = y - pointRadius;
        }
        var width = right - left;
        var height = top - bottom;
        var center = {x: width / 2 + left, y: height / 2 + bottom};
        return {x: left, y: bottom, w: width, h: height, c: center};
    };
    /**
     * @method getDate
     * @returns {String}
     */
    var getDate = function() {
        return moment(skritter.fn.getUnixTime() * 1000).format('YYYY-MM-DD');
    };
    /**
     * @method getDistance
     * @param {Point} point1
     * @param {Point} point2
     * @return {Number} The distance between the first and last points
     */
    var getDistance = function(point1, point2) {
        var xs = point2.x - point1.x;
        xs = xs * xs;
        var ys = point2.y - point1.y;
        ys = ys * ys;
        return Math.sqrt(xs + ys);
    };
    /**
     * @method getDistanceToLineSegment
     * @param {Object} start The starting point of a line segment
     * @param {Object} end The ending point of a line segment
     * @param {Object} point Point to measure distance from the line segment
     * @return {Number} The distance from the point and line segment
     */
    var getDistanceToLineSegment = function(start, end, point) {
        var px = end.x - start.x;
        var py = end.y - start.y;
        var segment = (px * px) + (py * py);
        var z = ((point.x - start.x) * px + (point.y - start.y) * py) / parseFloat(segment);
        if (z > 1) {
            z = 1;
        } else if (z < 0) {
            z = 0;
        }
        var x = start.x + z * px;
        var y = start.y + z * py;
        var dx = x - point.x;
        var dy = y - point.y;
        return Math.sqrt((dx * dx) + (dy * dy));
    };
    /**
     * @method getGuid
     * @returns {String}
     */
    var getGuid = function() {
        return Math.floor((1 + Math.random()) * 0x100000000).toString(16).substring(1);
    };
    /**
     * @method getUnixTime
     * @param {Boolean} formatMilliseconds
     * @returns {Number}
     */
    var getUnixTime = function(formatMilliseconds) {
        return formatMilliseconds ? new Date().getTime() : Math.round(new Date().getTime() / 1000);
    };
    /**
     * @method getRandomNumber
     * @param {Number} min
     * @param {Number} max
     * @returns {Number}
     */
    var getRandomNumber = function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    /**
     * @method hasCordova
     * @returns {Boolean}
     */
    var hasCordova = function() {
        return window.cordova ? true : false;
    };
    /**
     * @method isKana
     * @param {String} text
     * @returns {Boolean}
     */
    var isKana = function(text) {
        var chars = text.split('');
        if (chars.length === 0) {
            return false;
        } else {
            for (var i = 0, length = chars.length; i < length; i++) {
                var charCode = text.charCodeAt(i);
                if (!(charCode >= 12353 && charCode <= 12436) && !(charCode >= 12449 && charCode <= 12540) && charCode !== 65374) {
                    return false;
                }
            }
        }
        return true;
    };
    /**
     * @method isNumber
     * @param {Number} number
     * @returns {Boolean}
     */
    var isNumber = function(number) {
        return !isNaN(parseFloat(number)) && isFinite(number);
    };
    /**
     * @property {Object} mapper
     */
    var mapper = ChineseMap;
    /**
     * @method mergeObjectArray
     * @param {Object} object1
     * @param {Object} object2
     * @returns {Object}
     */
    var mergeObjectArray = function(object1, object2) {
        for (var key in object2) {
            if (object1[key]) {
                if (Array.isArray(object1[key])) {
                    object1[key] = object1[key].concat(object2[key]);
                } else {
                    object1[key] = object2[key];
                }
            } else {
                object1[key] = object2[key];
            }
        }
        return object1;
    };
    /**
     * @method pad
     * @param {String} text The text requiring padding
     * @param {String} value The value to be applied as padding
     * @param {Number} size The number of spaces of padding to be applied
     * @return {String}
     */
    var pad = function(text, value, size) {
        value = '' + value;
        var string = text + '';
        while (string.length < size) {
            string = value + '' + string;
        }
        return string;
    };
    /**
     * @property {Object} pinyin
     */
    var pinyin = PinyinMap;
    /**
     * @property {Object} strokes
     */
    var recognizer = new Recognizer();
    /**
     * @property {Object} strokes
     */
    var shortstraw = new Shortstraw();
    /**
     * @property {Object} strokes
     */
    var strokes = StrokeShapeMap;    
    /**
     * @method textToHTML
     * @param {String} text
     */
    var textToHTML = function(text) {
        text = text.replace(/img:(http:\/\/\S+)/gi, '<img src="$1"/>')
                .replace(/_([^ _][^_]*)_(?!\S{4})/gi, '<em>$1</em>')
                .replace(/\n/gi, '<br/>')
                .replace(/\*([^*]+)\*/gi, '<strong>$1</strong>');
        return text;
    };
    
    return {
        bootstrap: bootstrap,
        convertArrayToInt: convertArrayToInt,
        convertBytesToSize: convertBytesToSize,
        getAngle: getAngle,
        getBoundingRectangle: getBoundingRectangle,
        getDistance: getDistance,
        getDistanceToLineSegment: getDistanceToLineSegment,
        getGuid: getGuid,
        getUnixTime: getUnixTime,
        getRandomNumber: getRandomNumber,
        getDate: getDate,
        hasCordova: hasCordova,
        isKana: isKana,
        isNumber: isNumber,
        mapper: mapper,
        mergeObjectArray: mergeObjectArray,
        pad: pad,
        pinyin: pinyin,
        recognizer: recognizer,
        shortstraw: shortstraw,
        strokes: strokes,
        textToHTML: textToHTML
    };
});