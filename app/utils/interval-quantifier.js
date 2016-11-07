/**
 * @class IntervalQuantifier
 * @constructor
 */
function IntervalQuantifier() {
  this.initialWrongInterval = 600;
  this.initialRightInterval = 604800;
  this.rightFactors = [2.2, 2.2, 2.2, 2.2];
  this.wrongFactors = [0.25, 0.25, 0.25, 0.25];
}

/**
 * @method quantify
 * @param {Object} item
 * @param {Number} score
 * @returns {Number}
 */
IntervalQuantifier.prototype.quantify = function(item, score) {
  var newInterval = 0;
  var now = moment().unix();

  //return new items with randomized default config values
  if (!item.last) {
    switch (score) {
      case 1:
        newInterval = this.initialWrongInterval;
        break;
      case 2:
        newInterval = this.initialRightInterval / 5;
        break;
      case 3:
        newInterval = this.initialRightInterval;
        break;
      case 4:
        newInterval = this.initialRightInterval * 4;
        break;
    }
    return this.randomizeInterval(newInterval);
  }

  //set values for further calculations
  var actualInterval = now - item.last;
  var factor = 0.9;
  var pctRight = item.successes / item.reviews;
  var scheduledInterval = item.next - item.last;

  //get the factor
  if (score === 2) {
    factor = 0.9;
  } else if (score === 4) {
    factor = 3.5;
  } else {
    var factorsList = (score === 1) ? this.wrongFactors : this.rightFactors;
    var divisions = [2, 1200, 18000, 691200];
    var index;
    for (var i in divisions) {
      if (item.interval > divisions[i]) {
        index = i;
      }
    }
    factor = factorsList[index];
  }

  //adjust the factor based on readiness
  if (score > 2) {
    factor -= 1;
    factor *= actualInterval / scheduledInterval;
    factor += 1;
  }

  //accelerate new items that appear to be known
  if (item.successes === item.reviews && item.reviews < 5) {
    factor *= 1.5;
  }

  //decelerate hard items consistently marked wrong
  if (item.reviews > 8) {
    if (pctRight < 0.5) {
      factor *= Math.pow(pctRight, 0.7);
    }
  }

  //multiple by the factor and randomize the interval
  newInterval = this.randomizeInterval(item.interval * factor);

  //bound the interval
  if (score === 1) {
    if (newInterval > 604800) {
      newInterval = 604800;
    } else if (newInterval < 30) {
      newInterval = 30;
    }

  } else {
    if (newInterval > 315569260) {
      newInterval = 315569260;
    } else if (score === 2 && newInterval < 300) {
      newInterval = 300;
    } else if (newInterval < 30) {
      newInterval = 30;
    }
  }

  //accelerate recently studied correct items
  if (score > 2 && (item.next - item.last) < 7200) {
    newInterval = this.randomizeInterval(43200 * factor);
  }

  return newInterval;
};

/**
 * @method randomizeInterval
 * @param {Number} value
 */
IntervalQuantifier.prototype.randomizeInterval = function(value) {
  return Math.round(value * (0.925 + (Math.random() * 0.15)));
};

module.exports = IntervalQuantifier;
