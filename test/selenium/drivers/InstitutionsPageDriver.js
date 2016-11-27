"use strict";
const SeleniumWebdriver = require('selenium-webdriver');
const By = SeleniumWebdriver.By;
const until = SeleniumWebdriver.until;
const Config = require('../Config');
const browser = Config.driver;
const helpers = require('../helpers');

/**
 * A static helper object with commands and interactions that can be performed
 * with the home page.
 * @type {Object<String, Function>}
 */
const ContactPageDriver = {

  navigate: function() {
    return new Promise(function(resolve, reject) {
      browser.get(Config.server + '/institutions');
      browser.wait(until.titleIs('Institutions - Skritter'), Config.TIMEOUT_DEFAULT).then(() => {

        // to avoid screenloader fadeout when testing for element visibility
        setTimeout(() => {
          resolve();
        }, 50);
      });
    });
  },

  fillInInstitutionInfo: function(contactInfo) {
    const p1 = browser.findElement(By.id('institution-name')).sendKeys(contactInfo.schoolName);
    const p2 = browser.findElement(By.id('institution-contact-email')).sendKeys(contactInfo.email);
    const p3 = browser.findElement(By.id('institution-message')).sendKeys(contactInfo.message);

    return Promise.all([p1, p2, p3]);
  },

  submitContactForm: function() {
    return browser.findElement(By.id('request-submit')).click();
  },

  waitForSubmissionFeedback: function() {
    return new Promise(function(resolve, reject) {
      helpers.waitForElementVisible(By.id("request-message")).getText().then(function(text) {
        if (!text) {
          reject();
        } else {
          resolve(text);
        }
      });
    });
  }
};

module.exports = ContactPageDriver;
