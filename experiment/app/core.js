var RootView = require('app/views/Root');
var AudioManager = require('app/audio/AudioManager');
var StateManager = require('app/util/StateManager');
var style = require('app/styles/experiment.css');
var audioSpriteDefault = require('app/data/normalaudiosprite.json');
var audioSpriteCat = require('app/data/cataudiosprite.json');
var audioLoopsDefault = require('app/data/loops.json');
var audioLoopsCat = require('app/data/catloops.json');
var {Promise} = require('es6-promise');

/**
 * Main entry point into the experiment.
 * @constructor
 */
module.exports = function Experiment() {
  'use strict';

  var audioManager;
  var rootView;
  var stateManager;

  var d = new Date();
  var isAprilFools = (d.getMonth() === 3) && (d.getDate() === 1);
  var isCatMode = isAprilFools || window.location.href.match(/meow/);

  var self = {
    load,
    start,
    serialize,
    tearDown,
    pause,
    play,
    didEnterRecordingMode,
    didExitRecordingMode
  };

  /**
   * Load the experiment data and audio files.
   */
  function load(audioSprite = audioSpriteDefault, audioLoops = audioLoopsDefault) {
    // Prepare experiment-specific styles.
    style.use();

    if (isCatMode) {
      audioSprite = audioSpriteCat;
      audioLoops = audioLoopsCat;
    }

    // Create the AudioManager, which controls all sound in the experiment.
    audioManager = new AudioManager();
    audioManager.init();

    stateManager = new StateManager(audioManager);

    // Create the RootView, which controls all visuals in the experiment.
    rootView = new RootView(audioManager, stateManager);

    // Define the mapping of sound names to their location in the audio sprite.
    audioManager.defineSounds(audioSprite.spritemap, audioManager);

    // Define looping sounds, which are made up of sounds defined above.
    audioManager.defineSoundLoops(audioLoops, audioManager);

    // Load the audio sprite.
    audioManager.load(audioSprite.resources[0]).then(function() {
      // If the `window.experiment` variable exists, wait for it to initialize us.
      // Otherwise, auto-start.
      if (window.experiment && ('function' === typeof window.experiment.didFinishLoading)) {
        window.experiment.didFinishLoading(self);
      } else {
        start();
      }
    });
  }

  /**
   * Start animating and playing sound.
   * @param {string} instrumentSelector - The means of gathering large instrument boxes on the base page.
   * @param {string} visualizerSelector - The means of gathering smaller visualizer cards on the base page.
   * @param {array<number>} fromPos - The origin point of the transition in (FAB).
   */
  function start(instrumentSelector = '.row', visualizerSelector = '.box', fromPos = [0,0]) {
    // Start sound engine.
    audioManager.start();

    // Find base elements and layout views.
    rootView.init(instrumentSelector, visualizerSelector);

    // Load either serialized state or default state.
    stateManager.init();
    stateManager.loadSerializedOrDefault();

    // Start requestAnimationFrame
    rootView.start();

    // Animate transition in.
    rootView.animateIn(fromPos);
  }

  const SHORTENER_API_URL = 'https://www.googleapis.com/urlshortener/v1/url';
  const SHORTENER_API_KEY = 'AIzaSyBRMm_PwR1cfjT_yLxBiV9PDrwZPRIRLxg';

  // Serialize the entire experiment to URL encoded data.
  function serialize() {
    var fullURL = window.location.origin + window.location.pathname + '?composition=' + stateManager.toURL();
    var endpoint = `${SHORTENER_API_URL}?key=${SHORTENER_API_KEY}`;

    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();

      xhr.open('POST', endpoint, true);
      xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');

      var jsonStr = JSON.stringify({
        longUrl: fullURL
      });

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
          try {
            var data = JSON.parse(this.responseText);
            resolve(data.id);
          } catch(e) {
            reject('Parsing URL Shortener result failed.');
          }
        } else if (xhr.status !== 200) {
          reject('Requesting URL Shortener result failed.');
        }
      };

      xhr.send(jsonStr);
    });
  }

  /**
   * Shut down the experiment.
   */
  function tearDown(fromPos = [0,0]) {
    // Stop sound engine.
    audioManager.fadeOut(0.5);

    // Animate transition out.
    rootView.animateOut(fromPos).then(function() {
      // Remove DOM nodes.
      rootView.cleanUp();
    });
  }

  function pause() {
    audioManager.stop();
  }

  function play() {
    audioManager.start();
  }

  function didEnterRecordingMode(cb) {
    rootView.didEnterRecordingMode(cb);
  }

  function didExitRecordingMode(cb) {
    rootView.didExitRecordingMode(cb);
  }

  return self;
};