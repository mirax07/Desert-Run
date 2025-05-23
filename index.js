(function () {
    'use strict';
    function Stremashisya(outerContainerId, opt_config) {
        if (Stremashisya.instance_) {
            return Stremashisya.instance_;
        }
        Stremashisya.instance_ = this;
        this.outerContainerEl = document.querySelector(outerContainerId);
        this.containerEl = null;
        this.detailsButton = this.outerContainerEl.querySelector('#details-button');
        this.config = opt_config || Stremashisya.config;
        this.dimensions = Stremashisya.defaultDimensions;
        this.canvas = null;
        this.canvasCtx = null;
        this.tRex = null;
        this.distanceMeter = null;
        this.distanceRan = 0;
        this.highestScore = 0;
        this.time = 0;
        this.runningTime = 0;
        this.msPerFrame = 1000 / FPS;
        this.currentSpeed = this.config.SPEED;
        this.activated = false;
        this.playing = false;
        this.crashed = false;
        this.paused = false;
        this.inverted = false;
        this.invertTimer = 0;
        this.resizeTimerId_ = null;

        this.playCount = 0;

        this.audioBuffer = null;
        this.soundFx = {};

        this.audioContext = null;

        this.images = {};
        this.imagesLoaded = 0;

        if (this.isDisabled()) {
            this.nastroitDisabledStremashisya();
        } else {
            this.loadImages();
        }
    }
    window['Prusher'] = Stremashisya;

    var DEFAULT_WIDTH = 600;
    var FPS = 60;

    var IS_HIDPI = window.devicePixelRatio > 1;

    var IS_IOS = /iPad|iPhone|iPod/.test(window.navigator.platform);

    var IS_MOBILE = /Android/.test(window.navigator.userAgent) || IS_IOS;

    var IS_TOUCH_ENABLED = 'ontouchstart' in window;

    Stremashisya.config = {
        ACCELERATION: 0.001,
        BG_CLOUD_SPEED: 0.2,
        BOTTOM_PAD: 10,
        CLEAR_TIME: 3000,
        CLOUD_FREQUENCY: 0.5,
        GAMEOVER_CLEAR_TIME: 750,
        GAP_COEFFICIENT: 0.6,
        GRAVITY: 0.6,
        INITIAL_JUMP_VELOCITY: 12,
        INVERT_FADE_DURATION: 12000,
        INVERT_DISTANCE: 700,
        MAX_BLINK_COUNT: 3,
        MAX_CLOUDS: 6,
        MAX_OBSTACLE_LENGTH: 3,
        MAX_OBSTACLE_DUPLICATION: 2,
        MAX_SPEED: 13,
        MIN_JUMP_HEIGHT: 35,
        MOBILE_SPEED_COEFFICIENT: 1.2,
        RESOURCE_TEMPLATE_ID: 'audio-resources',
        SPEED: 6,
        SPEED_DROP_COEFFICIENT: 3,
        ARCADE_MODE_INITIAL_TOP_POSITION: 35,
        ARCADE_MODE_TOP_POSITION_PERCENT: 0.1
    };
    Stremashisya.defaultDimensions = {
        WIDTH: DEFAULT_WIDTH,
        HEIGHT: 150
    };
    Stremashisya.classes = {
        ARCADE_MODE: 'arcade-mode',
        CANVAS: 'runner-canvas',
        CONTAINER: 'runner-container',
        CRASHED: 'crashed',
        ICON: 'icon-offline',
        INVERTED: 'inverted',
        SNACKBAR: 'snackbar',
        SNACKBAR_SHOW: 'snackbar-show',
        TOUCH_CONTROLLER: 'controller'
    };
    Stremashisya.spriteDefinition = {
        LDPI: {
            CACTUS_LARGE: { x: 332, y: 2 },
            CACTUS_SMALL: { x: 228, y: 2 },
            CLOUD: { x: 86, y: 2 },
            HORIZON: { x: 2, y: 54 },
            MOON: { x: 484, y: 2 },
            PTERODACTYL: { x: 134, y: 2 },
            RESTART: { x: 2, y: 2 },
            TEXT_SPRITE: { x: 655, y: 2 },
            TREX: { x: 848, y: 2 },
            STAR: { x: 645, y: 2 }
        },
        HDPI: {
            CACTUS_LARGE: { x: 652, y: 2 },
            CACTUS_SMALL: { x: 446, y: 2 },
            CLOUD: { x: 166, y: 2 },
            HORIZON: { x: 2, y: 104 },
            MOON: { x: 954, y: 2 },
            PTERODACTYL: { x: 260, y: 2 },
            RESTART: { x: 2, y: 2 },
            TEXT_SPRITE: { x: 1294, y: 2 },
            TREX: { x: 1678, y: 2 },
            STAR: { x: 1276, y: 2 }
        }
    };
    Stremashisya.sounds = {
        BUTTON_PRESS: 'offline-sound-press',
        HIT: 'offline-sound-hit',
        SCORE: 'offline-sound-reached'
    };
    Stremashisya.keycodes = {
        JUMP: { '38': 1, '32': 1 },
        DUCK: { '40': 1 },
        RESTART: { '13': 1 }
    };
    Stremashisya.events = {
        ANIM_END: 'webkitAnimationEnd',
        CLICK: 'click',
        KEYDOWN: 'keydown',
        KEYUP: 'keyup',
        MOUSEDOWN: 'mousedown',
        MOUSEUP: 'mouseup',
        RESIZE: 'resize',
        TOUCHEND: 'touchend',
        TOUCHSTART: 'touchstart',
        VISIBILITY: 'visibilitychange',
        BLUR: 'blur',
        FOCUS: 'focus',
        LOAD: 'load'
    };


    Stremashisya.prototype = {
        isDisabled: function () {
            return false;
        },
        nastroitDisabledStremashisya: function () {
            this.containerEl = document.createElement('div');
            this.containerEl.className = Stremashisya.classes.SNACKBAR;
            this.containerEl.textContent = loadTimeData.getValue('disabledEasterEgg');
            this.outerContainerEl.appendChild(this.containerEl);
            document.addEventListener(Stremashisya.events.KEYDOWN, function (e) {
                if (Stremashisya.keycodes.JUMP[e.keyCode]) {
                    this.containerEl.classList.add(Stremashisya.classes.SNACKBAR_SHOW);
                    document.querySelector('.icon').classList.add('icon-disabled');
                }
            }.bind(this));
        },
        updateConfigSetting: function (setting, value) {
            if (setting in this.config && value != undefined) {
                this.config[setting] = value;

                switch (setting) {
                    case 'GRAVITY':
                    case 'MIN_JUMP_HEIGHT':
                    case 'SPEED_DROP_COEFFICIENT':
                        this.tRex.config[setting] = value;
                        break;
                    case 'INITIAL_JUMP_VELOCITY':
                        this.tRex.setJumpVelocity(value);
                        break;
                    case 'SPEED':
                        this.setSpeed(value);
                        break;
                }
            }
        },
        loadImages: function () {
                Stremashisya.imageSprite = document.getElementById('offline-resources-2x');
                this.spriteDef = Stremashisya.spriteDefinition.HDPI;

            if (Stremashisya.imageSprite.complete) {
                this.inicializacia();
            } else {
                Stremashisya.imageSprite.addEventListener(Stremashisya.events.LOAD,
                    this.inicializacia.bind(this));
            }
        },
        loadSounds: function () {
            if (!IS_IOS) {
                this.audioContext = new AudioContext();

                var resourceTemplate =
                    document.getElementById(this.config.RESOURCE_TEMPLATE_ID).content;

                for (var sound in Stremashisya.sounds) {
                    var soundSrc =
                        resourceTemplate.getElementById(Stremashisya.sounds[sound]).src;
                    soundSrc = soundSrc.substr(soundSrc.indexOf(',') + 1);
                    var buffer = decodeBase64ToArrayBuffer(soundSrc);
                    this.audioContext.decodeAudioData(buffer, function (index, audioData) {
                        this.soundFx[index] = audioData;
                    }.bind(this, sound));
                }
            }
        },
        setSpeed: function (opt_speed) {
            var speed = opt_speed || this.currentSpeed;
            if (this.dimensions.WIDTH < DEFAULT_WIDTH) {
                var mobileSpeed = speed * this.dimensions.WIDTH / DEFAULT_WIDTH *
                    this.config.MOBILE_SPEED_COEFFICIENT;
                this.currentSpeed = mobileSpeed > speed ? speed : mobileSpeed;
            } else if (opt_speed) {
                this.currentSpeed = opt_speed;
            }
        },
        inicializacia: function () {
            document.querySelector('.' + Stremashisya.classes.ICON).style.visibility =
                'hidden';

            this.adjustdsfemsis();
            this.setSpeed();

            this.containerEl = document.createElement('div');
            this.containerEl.className = Stremashisya.classes.CONTAINER;
            this.canvas = sozdaemplatf(this.containerEl, this.dimensions.WIDTH,
                this.dimensions.HEIGHT, Stremashisya.classes.PLAYER);

            this.canvasCtx = this.canvas.getContext('2d');
            this.canvasCtx.fillStyle = '#f7f7f7';
            this.canvasCtx.fill();
            Stremashisya.updateCanvasScaling(this.canvas);
            this.horizon = new Loshad(this.canvas, this.spriteDef, this.dimensions,
                this.config.GAP_COEFFICIENT);
            this.distanceMeter = new dalecadoroga(this.canvas,
                this.spriteDef.TEXT_SPRITE, this.dimensions.WIDTH);
            this.tRex = new Spokoynoynoch(this.canvas, this.spriteDef.TREX);

            this.outerContainerEl.appendChild(this.containerEl);

            if (IS_MOBILE) {
                this.createTouchController();
            }

            this.slyshay();
            this.obnovlaem();

            window.addEventListener(Stremashisya.events.RESIZE,
                this.debounceResize.bind(this));

            this.canvasCtx = this.canvas.getContext('2d');
            this.canvasCtx.imageSmoothingEnabled = true;
            this.canvasCtx.imageSmoothingQuality = 'high';
        },
        createTouchController: function () {
            this.touchController = document.createElement('div');
            this.touchController.className = Stremashisya.classes.TOUCH_CONTROLLER;
            this.outerContainerEl.appendChild(this.touchController);
        },
        debounceResize: function () {
            if (!this.resizeTimerId_) {
                this.resizeTimerId_ =
                    setInterval(this.adjustdsfemsis.bind(this), 250);
            }
        },
        adjustdsfemsis: function () {
            clearInterval(this.resizeTimerId_);
            this.resizeTimerId_ = null;

            var boxStyles = window.getComputedStyle(this.outerContainerEl);
            var padding = Number(boxStyles.paddingLeft.substr(0,
                boxStyles.paddingLeft.length - 2));

            this.dimensions.WIDTH = this.outerContainerEl.offsetWidth - padding * 2;
            this.dimensions.WIDTH = Math.min(DEFAULT_WIDTH, this.dimensions.WIDTH);
            if (this.activated) {
                this.setArcadeModeContainerScale();
            }
            if (this.canvas) {
                this.canvas.width = this.dimensions.WIDTH;
                this.canvas.height = this.dimensions.HEIGHT;

                Stremashisya.updateCanvasScaling(this.canvas);

                this.distanceMeter.calcXPos(this.dimensions.WIDTH);
                this.chistim();
                this.horizon.update(0, 0, true);
                this.tRex.update(0);
                if (this.playing || this.crashed || this.paused) {
                    this.containerEl.style.width = this.dimensions.WIDTH + 'px';
                    this.containerEl.style.height = this.dimensions.HEIGHT + 'px';
                    this.distanceMeter.update(0, Math.ceil(this.distanceRan));
                    this.stop();
                } else {
                    this.tRex.draw(0, 0);
                }
                if (this.crashed && this.gameOverPanel) {
                    this.gameOverPanel.updateDimensions(this.dimensions.WIDTH);
                    this.gameOverPanel.draw();
                }
            }
        },
        introdysion: function () {
            if (!this.activated && !this.crashed) {
                this.playingIntro = true;
                this.tRex.playingIntro = true;
                var keyframes = '@-webkit-keyframes intro { ' +
                    'from { width:' + Spokoynoynoch.config.WIDTH + 'px }' +
                    'to { width: ' + this.dimensions.WIDTH + 'px }' +
                    '}';
                var sheet = document.createElement('style');
                var footer =document.querySelector('.footer');
                sheet.innerHTML = keyframes;
                document.head.appendChild(sheet);

                this.containerEl.addEventListener(Stremashisya.events.ANIM_END,
                    this.nachinaem.bind(this));

                this.containerEl.style.webkitAnimation = 'intro ease-out 1 both';
                this.containerEl.style.width = this.dimensions.WIDTH + 'px';

                footer.style.display = "flex";
                this.playing = true;
                this.activated = true;
            } else if (this.crashed) {
                this.restart();
            }
        },
        nachinaem: function () {
            this.setArcadeMode();
            this.runningTime = 0;
            this.playingIntro = false;
            this.tRex.playingIntro = false;
            this.containerEl.style.webkitAnimation = '';
            this.playCount++;
            document.addEventListener(Stremashisya.events.VISIBILITY,
                this.onVisibilityChange.bind(this));

            window.addEventListener(Stremashisya.events.BLUR,
                this.onVisibilityChange.bind(this));

            window.addEventListener(Stremashisya.events.FOCUS,
                this.onVisibilityChange.bind(this));
        },

        chistim: function () {
            this.canvasCtx.clearRect(0, 0, this.dimensions.WIDTH,
                this.dimensions.HEIGHT);
        },
        obnovlaem: function () {
            this.updatePending = false;

            var now = getTimeStamp();
            var deltaTime = now - (this.time || now);
            this.time = now;

            if (this.playing) {
                this.chistim();

                if (this.tRex.jumping) {
                    this.tRex.updateJump(deltaTime);
                }

                this.runningTime += deltaTime;
                var hasObstacles = this.runningTime > this.config.CLEAR_TIME
                if (this.tRex.jumpCount == 1 && !this.playingIntro) {
                    this.introdysion();
                }
                if (this.playingIntro) {
                    this.horizon.update(0, this.currentSpeed, hasObstacles);
                } else {
                    deltaTime = !this.activated ? 0 : deltaTime;
                    this.horizon.update(deltaTime, this.currentSpeed, hasObstacles,
                        this.inverted);
                }
                var collision = hasObstacles &&
                    proveraemCollision(this.horizon.obstacles[0], this.tRex);

                if (!collision) {
                    this.distanceRan += this.currentSpeed * deltaTime / this.msPerFrame;

                    if (this.currentSpeed < this.config.MAX_SPEED) {
                        this.currentSpeed += this.config.ACCELERATION;
                    }
                } else {
                    this.progrish();
                }

                var playAchievementSound = this.distanceMeter.update(deltaTime,
                    Math.ceil(this.distanceRan));

                if (playAchievementSound) {
                    this.playSound(this.soundFx.SCORE);
                }
                if (this.invertTimer > this.config.INVERT_FADE_DURATION) {
                    this.invertTimer = 0;
                    this.invertTrigger = false;
                    this.invert();
                } else if (this.invertTimer) {
                    this.invertTimer += deltaTime;
                } else {
                    var actualDistance =
                        this.distanceMeter.getActualDistance(Math.ceil(this.distanceRan));

                    if (actualDistance > 0) {
                        this.invertTrigger = !(actualDistance %
                            this.config.INVERT_DISTANCE);

                        if (this.invertTrigger && this.invertTimer === 0) {
                            this.invertTimer += deltaTime;
                            this.invert();
                        }
                    }
                }
            }

            if (this.playing || (!this.activated &&
                this.tRex.blinkCount < Stremashisya.config.MAX_BLINK_COUNT)) {
                this.tRex.update(deltaTime);
                this.scheduleNextUpdate();
            }
        },
        handleEvent: function (e) {
            return (function (evtType, events) {
                switch (evtType) {
                    case events.KEYDOWN:
                    case events.TOUCHSTART:
                    case events.MOUSEDOWN:
                        this.nazh(e);
                        break;
                    case events.KEYUP:
                    case events.TOUCHEND:
                    case events.MOUSEUP:
                        this.onKeyUp(e);
                        break;
                }
            }.bind(this))(e.type, Stremashisya.events);
        },
        slyshay: function () {
            document.addEventListener(Stremashisya.events.KEYDOWN, this);
            document.addEventListener(Stremashisya.events.KEYUP, this);

            if (IS_MOBILE) {
                this.touchController.addEventListener(Stremashisya.events.TOUCHSTART, this);
                this.touchController.addEventListener(Stremashisya.events.TOUCHEND, this);
                this.containerEl.addEventListener(Stremashisya.events.TOUCHSTART, this);
            } else {
                document.addEventListener(Stremashisya.events.MOUSEDOWN, this);
                document.addEventListener(Stremashisya.events.MOUSEUP, this);
            }
        },
        stopListening: function () {
            document.removeEventListener(Stremashisya.events.KEYDOWN, this);
            document.removeEventListener(Stremashisya.events.KEYUP, this);

            if (IS_MOBILE) {
                this.touchController.removeEventListener(Stremashisya.events.TOUCHSTART, this);
                this.touchController.removeEventListener(Stremashisya.events.TOUCHEND, this);
                this.containerEl.removeEventListener(Stremashisya.events.TOUCHSTART, this);
            } else {
                document.removeEventListener(Stremashisya.events.MOUSEDOWN, this);
                document.removeEventListener(Stremashisya.events.MOUSEUP, this);
            }
        },
        nazh: function (e) {
            if (IS_MOBILE && this.playing) {
                e.preventDefault();
            }

            if (e.target != this.detailsButton) {
                if (!this.crashed && (Stremashisya.keycodes.JUMP[e.keyCode] ||
                    e.type == Stremashisya.events.TOUCHSTART)) {
                    if (!this.playing) {
                        this.loadSounds();
                        this.playing = true;
                        this.obnovlaem();
                        if (window.errorPageController) {
                            errorPageController.trackEasterEgg();
                        }
                    }
                    if (!this.tRex.jumping && !this.tRex.ducking) {
                        this.playSound(this.soundFx.BUTTON_PRESS);
                        this.tRex.startJump(this.currentSpeed);
                    }
                }

                if (this.crashed && e.type == Stremashisya.events.TOUCHSTART &&
                    e.currentTarget == this.containerEl) {
                    this.restart();
                }
            }

            if (this.playing && !this.crashed && Stremashisya.keycodes.DUCK[e.keyCode]) {
                e.preventDefault();
                if (this.tRex.jumping) {
                    this.tRex.setSpeedDrop();
                } else if (!this.tRex.jumping && !this.tRex.ducking) {
                    this.tRex.setDuck(true);
                }
            }
        },
        onKeyUp: function (e) {
            var keyCode = String(e.keyCode);
            var isjumpKey = Stremashisya.keycodes.JUMP[keyCode] ||
                e.type == Stremashisya.events.TOUCHEND ||
                e.type == Stremashisya.events.MOUSEDOWN;

            if (this.isRunning() && isjumpKey) {
                this.tRex.endJump();
            } else if (Stremashisya.keycodes.DUCK[keyCode]) {
                this.tRex.speedDrop = false;
                this.tRex.setDuck(false);
            } else if (this.crashed) {
                var deltaTime = getTimeStamp() - this.time;

                if (Stremashisya.keycodes.RESTART[keyCode] || this.isLeftClickOnCanvas(e) ||
                    (deltaTime >= this.config.GAMEOVER_CLEAR_TIME &&
                        Stremashisya.keycodes.JUMP[keyCode])) {
                    this.restart();
                }
            } else if (this.paused && isjumpKey) {
                this.tRex.reset();
                this.play();
            }
        },
        isLeftClickOnCanvas: function (e) {
            return e.button != null && e.button < 2 &&
                e.type == Stremashisya.events.MOUSEUP && e.target == this.canvas;
        },
        scheduleNextUpdate: function () {
            if (!this.updatePending) {
                this.updatePending = true;
                this.raqId = requestAnimationFrame(this.obnovlaem.bind(this));
            }
        },
        isRunning: function () {
            return !!this.raqId;
        },
        progrish: function () {
            this.playSound(this.soundFx.HIT);
            vibrate(200);

            this.stop();
            this.crashed = true;
            this.distanceMeter.acheivement = false;

            this.tRex.update(100, Spokoynoynoch.status.CRASHED);
            if (!this.gameOverPanel) {
                this.gameOverPanel = new proigralPanel(this.canvas,
                    this.spriteDef.TEXT_SPRITE, this.spriteDef.RESTART,
                    this.dimensions);
            } else {
                this.gameOverPanel.draw();
            }
            if (this.distanceRan > this.highestScore) {
                this.highestScore = Math.ceil(this.distanceRan);
                this.distanceMeter.setHighScore(this.highestScore);
            }
            this.time = getTimeStamp();
        },

        stop: function () {
            this.playing = false;
            this.paused = true;
            cancelAnimationFrame(this.raqId);
            this.raqId = 0;
        },

        play: function () {
            if (!this.crashed) {
                this.playing = true;
                this.paused = false;
                this.tRex.update(0, Spokoynoynoch.status.RUNNING);
                this.time = getTimeStamp();
                this.obnovlaem();
            }
        },

        restart: function () {
            if (!this.raqId) {
                this.playCount++;
                this.runningTime = 0;
                this.playing = true;
                this.crashed = false;
                this.distanceRan = 0;
                this.setSpeed(this.config.SPEED);
                this.time = getTimeStamp();
                this.containerEl.classList.remove(Stremashisya.classes.CRASHED);
                this.chistim();
                this.distanceMeter.reset(this.highestScore);
                this.horizon.reset();
                this.tRex.reset();
                this.playSound(this.soundFx.BUTTON_PRESS);
                this.invert(true);
                this.obnovlaem();
            }
        },
        setArcadeMode() {
            document.body.classList.add(Stremashisya.classes.ARCADE_MODE);
            this.setArcadeModeContainerScale();
        },
        setArcadeModeContainerScale() {
            const windowHeight = window.innerHeight;
            const scaleHeight = windowHeight / this.dimensions.HEIGHT;
            const scaleWidth = window.innerWidth / this.dimensions.WIDTH;
            const scale = Math.max(1, Math.min(scaleHeight, scaleWidth));
            const scaledCanvasHeight = this.dimensions.HEIGHT * scale;
            const translateY = Math.ceil(Math.max(0, (windowHeight - scaledCanvasHeight -
                        Stremashisya.config.ARCADE_MODE_INITIAL_TOP_POSITION) *
                    Stremashisya.config.ARCADE_MODE_TOP_POSITION_PERCENT)) *
                window.devicePixelRatio;

            const cssScale = scale;
            this.containerEl.style.transform =
                'scale(' + cssScale + ') translateY(' + translateY + 'px)';
        },
        onVisibilityChange: function (e) {
            if (document.hidden || document.webkitHidden || e.type == 'blur' ||
                document.visibilityState != 'visible') {
                this.stop();
            } else if (!this.crashed) {
                this.tRex.reset();
                this.play();
            }
        },
        playSound: function (soundBuffer) {
            if (soundBuffer) {
                var sourceNode = this.audioContext.createBufferSource();
                sourceNode.buffer = soundBuffer;
                sourceNode.connect(this.audioContext.destination);
                sourceNode.start(0);
            }
        },
        invert: function (reset) {
            if (reset) {
                document.body.classList.toggle(Stremashisya.classes.INVERTED, false);
                this.invertTimer = 0;
                this.inverted = false;
            } else {
                this.inverted = document.body.classList.toggle(Stremashisya.classes.INVERTED,
                    this.invertTrigger);
            }
        }
    };
    Stremashisya.updateCanvasScaling = function (canvas, opt_width, opt_height) {
        var context = canvas.getContext('2d');
        var devicePixelRatio = Math.floor(window.devicePixelRatio) || 1;
        var backingStoreRatio = Math.floor(context.webkitBackingStorePixelRatio) || 1;
        var ratio = devicePixelRatio / backingStoreRatio;
        if (devicePixelRatio !== backingStoreRatio) {
            var oldWidth = opt_width || canvas.width;
            var oldHeight = opt_height || canvas.height;

            canvas.width = oldWidth * ratio;
            canvas.height = oldHeight * ratio;

            canvas.style.width = oldWidth + 'px';
            canvas.style.height = oldHeight + 'px';
            context.scale(ratio, ratio);
            return true;
        } else if (devicePixelRatio == 1) {
            canvas.style.width = canvas.width + 'px';
            canvas.style.height = canvas.height + 'px';
        }
        return false;
    };
    function getRandomNum(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    function vibrate(duration) {
        if (IS_MOBILE && window.navigator.vibrate) {
            window.navigator.vibrate(duration);
        }
    }
    function sozdaemplatf(container, width, height, opt_classname) {
        var canvas = document.createElement('canvas');
        canvas.className = opt_classname ? Stremashisya.classes.CANVAS + ' ' +
            opt_classname : Stremashisya.classes.CANVAS;
        canvas.width = width;
        canvas.height = height;
        container.appendChild(canvas);

        return canvas;
    }
    function decodeBase64ToArrayBuffer(base64String) {
        var len = (base64String.length / 4) * 3;
        var str = atob(base64String);
        var arrayBuffer = new ArrayBuffer(len);
        var bytes = new Uint8Array(arrayBuffer);

        for (var i = 0; i < len; i++) {
            bytes[i] = str.charCodeAt(i);
        }
        return bytes.buffer;
    }
    function getTimeStamp() {
        return IS_IOS ? new Date().getTime() : performance.now();
    }
    function proigralPanel(canvas, textImgPos, restartImgPos, dimensions) {
        this.canvas = canvas;
        this.canvasCtx = canvas.getContext('2d');
        this.canvasDimensions = dimensions;
        this.textImgPos = textImgPos;
        this.restartImgPos = restartImgPos;
        this.draw();
    };
    proigralPanel.dimensions = {
        TEXT_X: 0,
        TEXT_Y: 13,
        TEXT_WIDTH: 191,
        TEXT_HEIGHT: 11,
        RESTART_WIDTH: 36,
        RESTART_HEIGHT: 32
    };


    proigralPanel.prototype = {
        updateDimensions: function (width, opt_height) {
            this.canvasDimensions.WIDTH = width;
            if (opt_height) {
                this.canvasDimensions.HEIGHT = opt_height;
            }
        },
        draw: function () {
            var dimensions = proigralPanel.dimensions;

            var centerX = this.canvasDimensions.WIDTH / 2;
            var textSourceX = dimensions.TEXT_X;
            var textSourceY = dimensions.TEXT_Y;
            var textSourceWidth = dimensions.TEXT_WIDTH;
            var textSourceHeight = dimensions.TEXT_HEIGHT;

            var textTargetX = Math.round(centerX - (dimensions.TEXT_WIDTH / 2));
            var textTargetY = Math.round((this.canvasDimensions.HEIGHT - 25) / 3);
            var textTargetWidth = dimensions.TEXT_WIDTH;
            var textTargetHeight = dimensions.TEXT_HEIGHT;

            var restartSourceWidth = dimensions.RESTART_WIDTH;
            var restartSourceHeight = dimensions.RESTART_HEIGHT;
            var restartTargetX = centerX - (dimensions.RESTART_WIDTH / 2);
            var restartTargetY = this.canvasDimensions.HEIGHT / 2;

            if (IS_HIDPI) {
                textSourceY *= 2;
                textSourceX *= 2;
                textSourceWidth *= 2;
                textSourceHeight *= 2;
                restartSourceWidth *= 2;
                restartSourceHeight *= 2;
            }

            textSourceX += this.textImgPos.x;
            textSourceY += this.textImgPos.y;
            this.canvasCtx.drawImage(Stremashisya.imageSprite,
                textSourceX, textSourceY, textSourceWidth, textSourceHeight,
                textTargetX, textTargetY, textTargetWidth, textTargetHeight);
            this.canvasCtx.drawImage(Stremashisya.imageSprite,
                this.restartImgPos.x, this.restartImgPos.y,
                restartSourceWidth, restartSourceHeight,
                restartTargetX, restartTargetY, dimensions.RESTART_WIDTH,
                dimensions.RESTART_HEIGHT);
        }
    };
    function proveraemCollision(obstacle, tRex, opt_canvasCtx) {
        var obstacleBoxXPos = Stremashisya.defaultDimensions.WIDTH + obstacle.xPos;
        var tRexBox = new CollisionBox(
            tRex.xPos + 1,
            tRex.yPos + 1,
            tRex.config.WIDTH - 2,
            tRex.config.HEIGHT - 2);

        var obstacleBox = new CollisionBox(
            obstacle.xPos + 1,
            obstacle.yPos + 1,
            obstacle.typeConfig.width * obstacle.size - 2,
            obstacle.typeConfig.height - 2);
        if (opt_canvasCtx) {
            drawCollisionBoxes(opt_canvasCtx, tRexBox, obstacleBox);
        }
        if (boxCompare(tRexBox, obstacleBox)) {
            var collisionBoxes = obstacle.collisionBoxes;
            var tRexCollisionBoxes = tRex.ducking ?
                Spokoynoynoch.collisionBoxes.DUCKING : Spokoynoynoch.collisionBoxes.RUNNING;
            for (var t = 0; t < tRexCollisionBoxes.length; t++) {
                for (var i = 0; i < collisionBoxes.length; i++) {
                    var adjTrexBox =
                        createAdjustedCollisionBox(tRexCollisionBoxes[t], tRexBox);
                    var adjObstacleBox =
                        createAdjustedCollisionBox(collisionBoxes[i], obstacleBox);
                    var crashed = boxCompare(adjTrexBox, adjObstacleBox);
                    if (opt_canvasCtx) {
                        drawCollisionBoxes(opt_canvasCtx, adjTrexBox, adjObstacleBox);
                    }

                    if (crashed) {
                        return [adjTrexBox, adjObstacleBox];
                    }
                }
            }
        }
        return false;
    };
    function createAdjustedCollisionBox(box, adjustment) {
        return new CollisionBox(
            box.x + adjustment.x,
            box.y + adjustment.y,
            box.width,
            box.height);
    };
    function drawCollisionBoxes(canvasCtx, tRexBox, obstacleBox) {
        canvasCtx.save();
        canvasCtx.strokeStyle = '#f00';
        canvasCtx.strokeRect(tRexBox.x, tRexBox.y, tRexBox.width, tRexBox.height);

        canvasCtx.strokeStyle = '#0f0';
        canvasCtx.strokeRect(obstacleBox.x, obstacleBox.y,
            obstacleBox.width, obstacleBox.height);
        canvasCtx.restore();
    };
    function boxCompare(tRexBox, obstacleBox) {
        var crashed = false;
        var tRexBoxX = tRexBox.x;
        var tRexBoxY = tRexBox.y;

        var obstacleBoxX = obstacleBox.x;
        var obstacleBoxY = obstacleBox.y;
        if (tRexBox.x < obstacleBoxX + obstacleBox.width &&
            tRexBox.x + tRexBox.width > obstacleBoxX &&
            tRexBox.y < obstacleBox.y + obstacleBox.height &&
            tRexBox.height + tRexBox.y > obstacleBox.y) {
            crashed = true;
        }

        return crashed;
    };
    function CollisionBox(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
    };
    function Obastacke(canvasCtx, type, spriteImgPos, dimensions,
                      gapCoefficient, speed, opt_xOffset) {

        this.canvasCtx = canvasCtx;
        this.spritePos = spriteImgPos;
        this.typeConfig = type;
        this.gapCoefficient = gapCoefficient;
        this.size = getRandomNum(1, Obastacke.MAX_OBSTACLE_LENGTH);
        this.dimensions = dimensions;
        this.remove = false;
        this.xPos = dimensions.WIDTH + (opt_xOffset || 0);
        this.yPos = 0;
        this.width = 0;
        this.collisionBoxes = [];
        this.gap = 0;
        this.speedOffset = 0;
        this.currentFrame = 0;
        this.timer = 0;

        this.init(speed);
    };
    Obastacke.MAX_GAP_COEFFICIENT = 1.5;
    Obastacke.MAX_OBSTACLE_LENGTH = 3,


        Obastacke.prototype = {
            init: function (speed) {
                this.cloneCollisionBoxes();
                if (this.size > 1 && this.typeConfig.multipleSpeed > speed) {
                    this.size = 1;
                }

                this.width = this.typeConfig.width * this.size;
                if (Array.isArray(this.typeConfig.yPos)) {
                    var yPosConfig = IS_MOBILE ? this.typeConfig.yPosMobile :
                        this.typeConfig.yPos;
                    this.yPos = yPosConfig[getRandomNum(0, yPosConfig.length - 1)];
                } else {
                    this.yPos = this.typeConfig.yPos;
                }

                this.draw();
                if (this.size > 1) {
                    this.collisionBoxes[1].width = this.width - this.collisionBoxes[0].width -
                        this.collisionBoxes[2].width;
                    this.collisionBoxes[2].x = this.width - this.collisionBoxes[2].width;
                }
                if (this.typeConfig.speedOffset) {
                    this.speedOffset = Math.random() > 0.5 ? this.typeConfig.speedOffset :
                        -this.typeConfig.speedOffset;
                }
                this.gap = this.getGap(this.gapCoefficient, speed);
            },
            draw: function () {
                var sourceWidth = this.typeConfig.width;
                var sourceHeight = this.typeConfig.height;

                if (IS_HIDPI) {
                    sourceWidth = sourceWidth * 2;
                    sourceHeight = sourceHeight * 2;
                }
                var sourceX = (sourceWidth * this.size) * (0.5 * (this.size - 1)) +
                    this.spritePos.x;
                if (this.currentFrame > 0) {
                    sourceX += sourceWidth * this.currentFrame;
                }

                this.canvasCtx.drawImage(Stremashisya.imageSprite,
                    sourceX, this.spritePos.y,
                    sourceWidth * this.size, sourceHeight,
                    this.xPos, this.yPos,
                    this.typeConfig.width * this.size, this.typeConfig.height);
            },
            update: function (deltaTime, speed) {
                if (!this.remove) {
                    if (this.typeConfig.speedOffset) {
                        speed += this.speedOffset;
                    }
                    this.xPos -= Math.floor((speed * FPS / 1000) * deltaTime);
                    if (this.typeConfig.numFrames) {
                        this.timer += deltaTime;
                        if (this.timer >= this.typeConfig.frameRate) {
                            this.currentFrame =
                                this.currentFrame == this.typeConfig.numFrames - 1 ?
                                    0 : this.currentFrame + 1;
                            this.timer = 0;
                        }
                    }
                    this.draw();

                    if (!this.isVisible()) {
                        this.remove = true;
                    }
                }
            },
            getGap: function (gapCoefficient, speed) {
                var minGap = Math.round(this.width * speed +
                    this.typeConfig.minGap * gapCoefficient);
                var maxGap = Math.round(minGap * Obastacke.MAX_GAP_COEFFICIENT);
                return getRandomNum(minGap, maxGap);
            },
            isVisible: function () {
                return this.xPos + this.width > 0;
            },
            cloneCollisionBoxes: function () {
                var collisionBoxes = this.typeConfig.collisionBoxes;

                for (var i = collisionBoxes.length - 1; i >= 0; i--) {
                    this.collisionBoxes[i] = new CollisionBox(collisionBoxes[i].x,
                        collisionBoxes[i].y, collisionBoxes[i].width,
                        collisionBoxes[i].height);
                }
            }
        };
    Obastacke.types = [
        {
            type: 'CACTUS_SMALL',
            width: 17,
            height: 35,
            yPos: 105,
            multipleSpeed: 4,
            minGap: 120,
            minSpeed: 0,
            collisionBoxes: [
                new CollisionBox(0, 7, 5, 27),
                new CollisionBox(4, 0, 6, 34),
                new CollisionBox(10, 4, 7, 14)
            ]
        },
        {
            type: 'CACTUS_LARGE',
            width: 25,
            height: 50,
            yPos: 90,
            multipleSpeed: 7,
            minGap: 120,
            minSpeed: 0,
            collisionBoxes: [
                new CollisionBox(0, 12, 7, 38),
                new CollisionBox(8, 0, 7, 49),
                new CollisionBox(13, 10, 10, 38)
            ]
        },
        {
            type: 'PTERODACTYL',
            width: 46,
            height: 40,
            yPos: [100, 75, 50],
            yPosMobile: [100, 50],
            multipleSpeed: 999,
            minSpeed: 8.5,
            minGap: 150,
            collisionBoxes: [
                new CollisionBox(15, 15, 16, 5),
                new CollisionBox(18, 21, 24, 6),
                new CollisionBox(2, 14, 4, 3),
                new CollisionBox(6, 10, 4, 7),
                new CollisionBox(10, 8, 6, 9)
            ],
            numFrames: 2,
            frameRate: 1000 / 6,
            speedOffset: .8
        }
    ];
    function Spokoynoynoch(canvas, spritePos) {
        this.canvas = canvas;
        this.canvasCtx = canvas.getContext('2d');
        this.spritePos = spritePos;
        this.xPos = 0;
        this.yPos = 0;
        this.groundYPos = 0;
        this.currentFrame = 0;
        this.currentAnimFrames = [];
        this.blinkDelay = 0;
        this.blinkCount = 0;
        this.animStartTime = 0;
        this.timer = 0;
        this.msPerFrame = 1000 / FPS;
        this.config = Spokoynoynoch.config;
        this.status = Spokoynoynoch.status.WAITING;

        this.jumping = false;
        this.ducking = false;
        this.jumpVelocity = 0;
        this.reachedMinHeight = false;
        this.speedDrop = false;
        this.jumpCount = 0;
        this.jumpspotX = 0;

        this.init();
    };
    Spokoynoynoch.config = {
        DROP_VELOCITY: -5,
        GRAVITY: 0.6,
        HEIGHT: 47,
        HEIGHT_DUCK: 25,
        INIITAL_JUMP_VELOCITY: -10,
        INTRO_DURATION: 1500,
        MAX_JUMP_HEIGHT: 30,
        MIN_JUMP_HEIGHT: 30,
        SPEED_DROP_COEFFICIENT: 3,
        SPRITE_WIDTH: 262,
        START_X_POS: 50,
        WIDTH: 44,
        WIDTH_DUCK: 59
    };
    Spokoynoynoch.collisionBoxes = {
        DUCKING: [
            new CollisionBox(1, 18, 55, 25)
        ],
        RUNNING: [
            new CollisionBox(22, 0, 17, 16),
            new CollisionBox(1, 18, 30, 9),
            new CollisionBox(10, 35, 14, 8),
            new CollisionBox(1, 24, 29, 5),
            new CollisionBox(5, 30, 21, 4),
            new CollisionBox(9, 34, 15, 4)
        ]
    };
    Spokoynoynoch.status = {
        CRASHED: 'CRASHED',
        DUCKING: 'DUCKING',
        JUMPING: 'JUMPING',
        RUNNING: 'RUNNING',
        WAITING: 'WAITING'
    };
    Spokoynoynoch.BLINK_TIMING = 7000;
    Spokoynoynoch.animFrames = {
        WAITING: {
            frames: [44, 0],
            msPerFrame: 1000 / 3
        },
        RUNNING: {
            frames: [88, 132],
            msPerFrame: 1000 / 12
        },
        CRASHED: {
            frames: [220],
            msPerFrame: 1000 / 60
        },
        JUMPING: {
            frames: [0],
            msPerFrame: 1000 / 60
        },
        DUCKING: {
            frames: [264, 323],
            msPerFrame: 1000 / 8
        }
    };


    Spokoynoynoch.prototype = {
        init: function () {
            this.groundYPos = Stremashisya.defaultDimensions.HEIGHT - this.config.HEIGHT -
                Stremashisya.config.BOTTOM_PAD;
            this.yPos = this.groundYPos;
            this.minJumpHeight = this.groundYPos - this.config.MIN_JUMP_HEIGHT;

            this.draw(0, 0);
            this.update(0, Spokoynoynoch.status.WAITING);
        },
        setJumpVelocity: function (setting) {
            this.config.INIITAL_JUMP_VELOCITY = -setting;
            this.config.DROP_VELOCITY = -setting / 2;
        },
        update: function (deltaTime, opt_status) {
            this.timer += deltaTime;
            if (opt_status) {
                this.status = opt_status;
                this.currentFrame = 0;
                this.msPerFrame = Spokoynoynoch.animFrames[opt_status].msPerFrame;
                this.currentAnimFrames = Spokoynoynoch.animFrames[opt_status].frames;

                if (opt_status == Spokoynoynoch.status.WAITING) {
                    this.animStartTime = getTimeStamp();
                    this.setBlinkDelay();
                }
            }
            if (this.playingIntro && this.xPos < this.config.START_X_POS) {
                this.xPos += Math.round((this.config.START_X_POS /
                    this.config.INTRO_DURATION) * deltaTime);
            }

            if (this.status == Spokoynoynoch.status.WAITING) {
                this.blink(getTimeStamp());
            } else {
                this.draw(this.currentAnimFrames[this.currentFrame], 0);
            }
            if (this.timer >= this.msPerFrame) {
                this.currentFrame = this.currentFrame ==
                this.currentAnimFrames.length - 1 ? 0 : this.currentFrame + 1;
                this.timer = 0;
            }
            if (this.speedDrop && this.yPos == this.groundYPos) {
                this.speedDrop = false;
                this.setDuck(true);
            }
        },
        draw: function (x, y) {
            var sourceX = x;
            var sourceY = y;
            var sourceWidth = this.ducking && this.status != Spokoynoynoch.status.CRASHED ?
                this.config.WIDTH_DUCK : this.config.WIDTH;
            var sourceHeight = this.config.HEIGHT;

            if (IS_HIDPI) {
                sourceX *= 2;
                sourceY *= 2;
                sourceWidth *= 2;
                sourceHeight *= 2;
            }
            sourceX += this.spritePos.x;
            sourceY += this.spritePos.y;
            if (this.ducking && this.status != Spokoynoynoch.status.CRASHED) {
                this.canvasCtx.drawImage(Stremashisya.imageSprite, sourceX, sourceY,
                    sourceWidth, sourceHeight,
                    this.xPos, this.yPos,
                    this.config.WIDTH_DUCK, this.config.HEIGHT);
            } else {
                if (this.ducking && this.status == Spokoynoynoch.status.CRASHED) {
                    this.xPos++;
                }
                this.canvasCtx.drawImage(Stremashisya.imageSprite, sourceX, sourceY,
                    sourceWidth, sourceHeight,
                    this.xPos, this.yPos,
                    this.config.WIDTH, this.config.HEIGHT);
            }
        },
        setBlinkDelay: function () {
            this.blinkDelay = Math.ceil(Math.random() * Spokoynoynoch.BLINK_TIMING);
        },
        blink: function (time) {
            var deltaTime = time - this.animStartTime;

            if (deltaTime >= this.blinkDelay) {
                this.draw(this.currentAnimFrames[this.currentFrame], 0);

                if (this.currentFrame == 1) {
                    this.setBlinkDelay();
                    this.animStartTime = time;
                    this.blinkCount++;
                }
            }
        },
        startJump: function (speed) {
            if (!this.jumping) {
                this.update(0, Spokoynoynoch.status.JUMPING);
                this.jumpVelocity = this.config.INIITAL_JUMP_VELOCITY - (speed / 10);
                this.jumping = true;
                this.reachedMinHeight = false;
                this.speedDrop = false;
            }
        },
        endJump: function () {
            if (this.reachedMinHeight &&
                this.jumpVelocity < this.config.DROP_VELOCITY) {
                this.jumpVelocity = this.config.DROP_VELOCITY;
            }
        },
        updateJump: function (deltaTime, speed) {
            var msPerFrame = Spokoynoynoch.animFrames[this.status].msPerFrame;
            var framesElapsed = deltaTime / msPerFrame;
            if (this.speedDrop) {
                this.yPos += Math.round(this.jumpVelocity *
                    this.config.SPEED_DROP_COEFFICIENT * framesElapsed);
            } else {
                this.yPos += Math.round(this.jumpVelocity * framesElapsed);
            }

            this.jumpVelocity += this.config.GRAVITY * framesElapsed;
            if (this.yPos < this.minJumpHeight || this.speedDrop) {
                this.reachedMinHeight = true;
            }
            if (this.yPos < this.config.MAX_JUMP_HEIGHT || this.speedDrop) {
                this.endJump();
            }
            if (this.yPos > this.groundYPos) {
                this.reset();
                this.jumpCount++;
            }

            this.update(deltaTime);
        },
        setSpeedDrop: function () {
            this.speedDrop = true;
            this.jumpVelocity = 1;
        },
        setDuck: function (isDucking) {
            if (isDucking && this.status != Spokoynoynoch.status.DUCKING) {
                this.update(0, Spokoynoynoch.status.DUCKING);
                this.ducking = true;
            } else if (this.status == Spokoynoynoch.status.DUCKING) {
                this.update(0, Spokoynoynoch.status.RUNNING);
                this.ducking = false;
            }
        },
        reset: function () {
            this.yPos = this.groundYPos;
            this.jumpVelocity = 0;
            this.jumping = false;
            this.ducking = false;
            this.update(0, Spokoynoynoch.status.RUNNING);
            this.midair = false;
            this.speedDrop = false;
            this.jumpCount = 0;
        }
    };
    function dalecadoroga(canvas, spritePos, canvasWidth) {
        this.canvas = canvas;
        this.canvasCtx = canvas.getContext('2d');
        this.image = Stremashisya.imageSprite;
        this.spritePos = spritePos;
        this.x = 0;
        this.y = 5;

        this.currentDistance = 0;
        this.maxScore = 0;
        this.highScore = 0;
        this.container = null;

        this.digits = [];
        this.acheivement = false;
        this.defaultString = '';
        this.flashTimer = 0;
        this.flashIterations = 0;
        this.invertTrigger = false;

        this.config = dalecadoroga.config;
        this.maxScoreUnits = this.config.MAX_DISTANCE_UNITS;
        this.init(canvasWidth);
    };
    dalecadoroga.dimensions = {
        WIDTH: 10,
        HEIGHT: 13,
        DEST_WIDTH: 11
    };
    dalecadoroga.yPos = [0, 13, 27, 40, 53, 67, 80, 93, 107, 120];
    dalecadoroga.config = {
        MAX_DISTANCE_UNITS: 5,
        ACHIEVEMENT_DISTANCE: 100,
        COEFFICIENT: 0.025,
        FLASH_DURATION: 1000 / 4,
        FLASH_ITERATIONS: 3
    };


    dalecadoroga.prototype = {
        init: function (width) {
            var maxDistanceStr = '';

            this.calcXPos(width);
            this.maxScore = this.maxScoreUnits;
            for (var i = 0; i < this.maxScoreUnits; i++) {
                this.draw(i, 0);
                this.defaultString += '0';
                maxDistanceStr += '9';
            }

            this.maxScore = parseInt(maxDistanceStr);
        },
        calcXPos: function (canvasWidth) {
            this.x = canvasWidth - (dalecadoroga.dimensions.DEST_WIDTH *
                (this.maxScoreUnits + 1));
        },
        draw: function (digitPos, value, opt_highScore) {
            var sourceWidth = dalecadoroga.dimensions.WIDTH;
            var sourceHeight = dalecadoroga.dimensions.HEIGHT;
            var sourceX = dalecadoroga.dimensions.WIDTH * value;
            var sourceY = 0;

            var targetX = digitPos * dalecadoroga.dimensions.DEST_WIDTH;
            var targetY = this.y;
            var targetWidth = dalecadoroga.dimensions.WIDTH;
            var targetHeight = dalecadoroga.dimensions.HEIGHT;
            if (IS_HIDPI) {
                sourceWidth *= 2;
                sourceHeight *= 2;
                sourceX *= 2;
            }

            sourceX += this.spritePos.x;
            sourceY += this.spritePos.y;

            this.canvasCtx.save();

            if (opt_highScore) {
                var highScoreX = this.x - (this.maxScoreUnits * 2) *
                    dalecadoroga.dimensions.WIDTH;
                this.canvasCtx.translate(highScoreX, this.y);
            } else {
                this.canvasCtx.translate(this.x, this.y);
            }

            this.canvasCtx.drawImage(this.image, sourceX, sourceY,
                sourceWidth, sourceHeight,
                targetX, targetY,
                targetWidth, targetHeight
            );

            this.canvasCtx.restore();
        },
        getActualDistance: function (distance) {
            return distance ? Math.round(distance * this.config.COEFFICIENT) : 0;
        },
        update: function (deltaTime, distance) {
            var paint = true;
            var playSound = false;

            if (!this.acheivement) {
                distance = this.getActualDistance(distance);
                if (distance > this.maxScore && this.maxScoreUnits ==
                    this.config.MAX_DISTANCE_UNITS) {
                    this.maxScoreUnits++;
                    this.maxScore = parseInt(this.maxScore + '9');
                } else {
                    this.distance = 0;
                }

                if (distance > 0) {
                    if (distance % this.config.ACHIEVEMENT_DISTANCE == 0) {
                        this.acheivement = true;
                        this.flashTimer = 0;
                        playSound = true;
                    }
                    var distanceStr = (this.defaultString +
                        distance).substr(-this.maxScoreUnits);
                    this.digits = distanceStr.split('');
                } else {
                    this.digits = this.defaultString.split('');
                }
            } else {
                if (this.flashIterations <= this.config.FLASH_ITERATIONS) {
                    this.flashTimer += deltaTime;

                    if (this.flashTimer < this.config.FLASH_DURATION) {
                        paint = false;
                    } else if (this.flashTimer >
                        this.config.FLASH_DURATION * 2) {
                        this.flashTimer = 0;
                        this.flashIterations++;
                    }
                } else {
                    this.acheivement = false;
                    this.flashIterations = 0;
                    this.flashTimer = 0;
                }
            }
            if (paint) {
                for (var i = this.digits.length - 1; i >= 0; i--) {
                    this.draw(i, parseInt(this.digits[i]));
                }
            }

            this.drawHighScore();
            return playSound;
        },
        drawHighScore: function () {
            this.canvasCtx.save();
            this.canvasCtx.globalAlpha = .8;
            for (var i = this.highScore.length - 1; i >= 0; i--) {
                this.draw(i, parseInt(this.highScore[i], 10), true);
            }
            this.canvasCtx.restore();
        },
        setHighScore: function (distance) {
            distance = this.getActualDistance(distance);
            var highScoreStr = (this.defaultString +
                distance).substr(-this.maxScoreUnits);

            this.highScore = ['10', '11', ''].concat(highScoreStr.split(''));
        },
        reset: function () {
            this.update(0);
            this.acheivement = false;
        }
    };
    function Oblacka(canvas, spritePos, containerWidth) {
        this.canvas = canvas;
        this.canvasCtx = this.canvas.getContext('2d');
        this.spritePos = spritePos;
        this.containerWidth = containerWidth;
        this.xPos = containerWidth;
        this.yPos = 0;
        this.remove = false;
        this.cloudGap = getRandomNum(Oblacka.config.MIN_CLOUD_GAP,
            Oblacka.config.MAX_CLOUD_GAP);

        this.init();
    };
    Oblacka.config = {
        HEIGHT: 14,
        MAX_CLOUD_GAP: 400,
        MAX_SKY_LEVEL: 30,
        MIN_CLOUD_GAP: 100,
        MIN_SKY_LEVEL: 71,
        WIDTH: 46
    };


    Oblacka.prototype = {
        init: function () {
            this.yPos = getRandomNum(Oblacka.config.MAX_SKY_LEVEL,
                Oblacka.config.MIN_SKY_LEVEL);
            this.draw();
        },
        draw: function () {
            this.canvasCtx.save();
            var sourceWidth = Oblacka.config.WIDTH;
            var sourceHeight = Oblacka.config.HEIGHT;

            if (IS_HIDPI) {
                sourceWidth = sourceWidth * 2;
                sourceHeight = sourceHeight * 2;
            }

            this.canvasCtx.drawImage(Stremashisya.imageSprite, this.spritePos.x,
                this.spritePos.y,
                sourceWidth, sourceHeight,
                this.xPos, this.yPos,
                Oblacka.config.WIDTH, Oblacka.config.HEIGHT);

            this.canvasCtx.restore();
        },
        update: function (speed) {
            if (!this.remove) {
                this.xPos -= Math.ceil(speed);
                this.draw();
                if (!this.isVisible()) {
                    this.remove = true;
                }
            }
        },
        isVisible: function () {
            return this.xPos + Oblacka.config.WIDTH > 0;
        }
    };
    function balckbode(canvas, spritePos, containerWidth) {
        this.spritePos = spritePos;
        this.canvas = canvas;
        this.canvasCtx = canvas.getContext('2d');
        this.xPos = containerWidth - 50;
        this.yPos = 30;
        this.currentPhase = 0;
        this.opacity = 0;
        this.containerWidth = containerWidth;
        this.stars = [];
        this.drawStars = false;
        this.placeStars();
    };
    balckbode.config = {
        FADE_SPEED: 0.035,
        HEIGHT: 40,
        MOON_SPEED: 0.25,
        NUM_STARS: 2,
        STAR_SIZE: 9,
        STAR_SPEED: 0.3,
        STAR_MAX_Y: 70,
        WIDTH: 20
    };

    balckbode.phases = [140, 120, 100, 60, 40, 20, 0];

    balckbode.prototype = {
        update: function (activated, delta) {
            if (activated && this.opacity == 0) {
                this.currentPhase++;

                if (this.currentPhase >= balckbode.phases.length) {
                    this.currentPhase = 0;
                }
            }
            if (activated && (this.opacity < 1 || this.opacity == 0)) {
                this.opacity += balckbode.config.FADE_SPEED;
            } else if (this.opacity > 0) {
                this.opacity -= balckbode.config.FADE_SPEED;
            }
            if (this.opacity > 0) {
                this.xPos = this.updateXPos(this.xPos, balckbode.config.MOON_SPEED);
                if (this.drawStars) {
                    for (var i = 0; i < balckbode.config.NUM_STARS; i++) {
                        this.stars[i].x = this.updateXPos(this.stars[i].x,
                            balckbode.config.STAR_SPEED);
                    }
                }
                this.draw();
            } else {
                this.opacity = 0;
                this.placeStars();
            }
            this.drawStars = true;
        },

        updateXPos: function (currentPos, speed) {
            if (currentPos < -balckbode.config.WIDTH) {
                currentPos = this.containerWidth;
            } else {
                currentPos -= speed;
            }
            return currentPos;
        },

        draw: function () {
            var moonSourceWidth = this.currentPhase == 3 ? balckbode.config.WIDTH * 2 :
                balckbode.config.WIDTH;
            var moonSourceHeight = balckbode.config.HEIGHT;
            var moonSourceX = this.spritePos.x + balckbode.phases[this.currentPhase];
            var moonOutputWidth = moonSourceWidth;
            var starSize = balckbode.config.STAR_SIZE;
            var starSourceX = Stremashisya.spriteDefinition.LDPI.STAR.x;

            if (IS_HIDPI) {
                moonSourceWidth *= 2;
                moonSourceHeight *= 2;
                moonSourceX = this.spritePos.x +
                    (balckbode.phases[this.currentPhase] * 2);
                starSize *= 2;
                starSourceX = Stremashisya.spriteDefinition.HDPI.STAR.x;
            }

            this.canvasCtx.save();
            this.canvasCtx.globalAlpha = this.opacity;
            if (this.drawStars) {
                for (var i = 0; i < balckbode.config.NUM_STARS; i++) {
                    this.canvasCtx.drawImage(Stremashisya.imageSprite,
                        starSourceX, this.stars[i].sourceY, starSize, starSize,
                        Math.round(this.stars[i].x), this.stars[i].y,
                        balckbode.config.STAR_SIZE, balckbode.config.STAR_SIZE);
                }
            }
            this.canvasCtx.drawImage(Stremashisya.imageSprite, moonSourceX,
                this.spritePos.y, moonSourceWidth, moonSourceHeight,
                Math.round(this.xPos), this.yPos,
                moonOutputWidth, balckbode.config.HEIGHT);

            this.canvasCtx.globalAlpha = 1;
            this.canvasCtx.restore();
        },
        placeStars: function () {
            var segmentSize = Math.round(this.containerWidth /
                balckbode.config.NUM_STARS);

            for (var i = 0; i < balckbode.config.NUM_STARS; i++) {
                this.stars[i] = {};
                this.stars[i].x = getRandomNum(segmentSize * i, segmentSize * (i + 1));
                this.stars[i].y = getRandomNum(0, balckbode.config.STAR_MAX_Y);

                if (IS_HIDPI) {
                    this.stars[i].sourceY = Stremashisya.spriteDefinition.HDPI.STAR.y +
                        balckbode.config.STAR_SIZE * 2 * i;
                } else {
                    this.stars[i].sourceY = Stremashisya.spriteDefinition.LDPI.STAR.y +
                        balckbode.config.STAR_SIZE * i;
                }
            }
        },

        reset: function () {
            this.currentPhase = 0;
            this.opacity = 0;
            this.update(false);
        }

    };
    function vnebeoblaka(canvas, spritePos) {
        this.spritePos = spritePos;
        this.canvas = canvas;
        this.canvasCtx = canvas.getContext('2d');
        this.sourceDimensions = {};
        this.dimensions = vnebeoblaka.dimensions;
        this.sourceXPos = [this.spritePos.x, this.spritePos.x +
        this.dimensions.WIDTH];
        this.xPos = [];
        this.yPos = 0;
        this.bumpThreshold = 0.5;

        this.setSourceDimensions();
        this.draw();
    };
    vnebeoblaka.dimensions = {
        WIDTH: 600,
        HEIGHT: 12,
        YPOS: 127
    };


    vnebeoblaka.prototype = {
        setSourceDimensions: function () {

            for (var dimension in vnebeoblaka.dimensions) {
                if (IS_HIDPI) {
                    if (dimension != 'YPOS') {
                        this.sourceDimensions[dimension] =
                            vnebeoblaka.dimensions[dimension] * 2;
                    }
                } else {
                    this.sourceDimensions[dimension] =
                        vnebeoblaka.dimensions[dimension];
                }
                this.dimensions[dimension] = vnebeoblaka.dimensions[dimension];
            }

            this.xPos = [0, vnebeoblaka.dimensions.WIDTH];
            this.yPos = vnebeoblaka.dimensions.YPOS;
        },
        getRandomType: function () {
            return Math.random() > this.bumpThreshold ? this.dimensions.WIDTH : 0;
        },
        draw: function () {
            this.canvasCtx.drawImage(Stremashisya.imageSprite, this.sourceXPos[0],
                this.spritePos.y,
                this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
                this.xPos[0], this.yPos,
                this.dimensions.WIDTH, this.dimensions.HEIGHT);

            this.canvasCtx.drawImage(Stremashisya.imageSprite, this.sourceXPos[1],
                this.spritePos.y,
                this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
                this.xPos[1], this.yPos,
                this.dimensions.WIDTH, this.dimensions.HEIGHT);
        },
        updateXPos: function (pos, increment) {
            var line1 = pos;
            var line2 = pos == 0 ? 1 : 0;

            this.xPos[line1] -= increment;
            this.xPos[line2] = this.xPos[line1] + this.dimensions.WIDTH;

            if (this.xPos[line1] <= -this.dimensions.WIDTH) {
                this.xPos[line1] += this.dimensions.WIDTH * 2;
                this.xPos[line2] = this.xPos[line1] - this.dimensions.WIDTH;
                this.sourceXPos[line1] = this.getRandomType() + this.spritePos.x;
            }
        },
        update: function (deltaTime, speed) {
            var increment = Math.floor(speed * (FPS / 1000) * deltaTime);

            if (this.xPos[0] <= 0) {
                this.updateXPos(0, increment);
            } else {
                this.updateXPos(1, increment);
            }
            this.draw();
        },
        reset: function () {
            this.xPos[0] = 0;
            this.xPos[1] = vnebeoblaka.dimensions.WIDTH;
        }
    };
    function Loshad(canvas, spritePos, dimensions, gapCoefficient) {
        this.canvas = canvas;
        this.canvasCtx = this.canvas.getContext('2d');
        this.config = Loshad.config;
        this.dimensions = dimensions;
        this.gapCoefficient = gapCoefficient;
        this.obstacles = [];
        this.obstacleHistory = [];
        this.horizonOffsets = [0, 0];
        this.cloudFrequency = this.config.CLOUD_FREQUENCY;
        this.spritePos = spritePos;
        this.nightMode = null;

        this.clouds = [];
        this.cloudSpeed = this.config.BG_CLOUD_SPEED;

        this.horizonLine = null;
        this.init();
    };
    Loshad.config = {
        BG_CLOUD_SPEED: 0.2,
        BUMPY_THRESHOLD: .3,
        CLOUD_FREQUENCY: .5,
        HORIZON_HEIGHT: 16,
        MAX_CLOUDS: 6
    };


    Loshad.prototype = {
        init: function () {
            this.addCloud();
            this.horizonLine = new vnebeoblaka(this.canvas, this.spritePos.HORIZON);
            this.nightMode = new balckbode(this.canvas, this.spritePos.MOON,
                this.dimensions.WIDTH);
        },

        update: function (deltaTime, currentSpeed, updateObstacles, showNightMode) {
            this.runningTime += deltaTime;
            this.horizonLine.update(deltaTime, currentSpeed);
            this.nightMode.update(showNightMode);
            this.updateClouds(deltaTime, currentSpeed);

            if (updateObstacles) {
                this.updateObstacles(deltaTime, currentSpeed);
            }
        },

        updateClouds: function (deltaTime, speed) {
            var cloudSpeed = this.cloudSpeed / 1000 * deltaTime * speed;
            var numClouds = this.clouds.length;

            if (numClouds) {
                for (var i = numClouds - 1; i >= 0; i--) {
                    this.clouds[i].update(cloudSpeed);
                }

                var lastCloud = this.clouds[numClouds - 1];
                if (numClouds < this.config.MAX_CLOUDS &&
                    (this.dimensions.WIDTH - lastCloud.xPos) > lastCloud.cloudGap &&
                    this.cloudFrequency > Math.random()) {
                    this.addCloud();
                }
                this.clouds = this.clouds.filter(function (obj) {
                    return !obj.remove;
                });
            } else {
                this.addCloud();
            }
        },

        updateObstacles: function (deltaTime, currentSpeed) {
            var updatedObstacles = this.obstacles.slice(0);

            for (var i = 0; i < this.obstacles.length; i++) {
                var obstacle = this.obstacles[i];
                obstacle.update(deltaTime, currentSpeed);
                if (obstacle.remove) {
                    updatedObstacles.shift();
                }
            }
            this.obstacles = updatedObstacles;

            if (this.obstacles.length > 0) {
                var lastObstacle = this.obstacles[this.obstacles.length - 1];

                if (lastObstacle && !lastObstacle.followingObstacleCreated &&
                    lastObstacle.isVisible() &&
                    (lastObstacle.xPos + lastObstacle.width + lastObstacle.gap) <
                    this.dimensions.WIDTH) {
                    this.addNewObstacle(currentSpeed);
                    lastObstacle.followingObstacleCreated = true;
                }
            } else {
                this.addNewObstacle(currentSpeed);
            }
        },

        removeFirstObstacle: function () {
            this.obstacles.shift();
        },

        addNewObstacle: function (currentSpeed) {
            var obstacleTypeIndex = getRandomNum(0, Obastacke.types.length - 1);
            var obstacleType = Obastacke.types[obstacleTypeIndex];
            if (this.duplicateObstacleCheck(obstacleType.type) ||
                currentSpeed < obstacleType.minSpeed) {
                this.addNewObstacle(currentSpeed);
            } else {
                var obstacleSpritePos = this.spritePos[obstacleType.type];

                this.obstacles.push(new Obastacke(this.canvasCtx, obstacleType,
                    obstacleSpritePos, this.dimensions,
                    this.gapCoefficient, currentSpeed, obstacleType.width));

                this.obstacleHistory.unshift(obstacleType.type);

                if (this.obstacleHistory.length > 1) {
                    this.obstacleHistory.splice(Stremashisya.config.MAX_OBSTACLE_DUPLICATION);
                }
            }
        },

        duplicateObstacleCheck: function (nextObstacleType) {
            var duplicateCount = 0;

            for (var i = 0; i < this.obstacleHistory.length; i++) {
                duplicateCount = this.obstacleHistory[i] == nextObstacleType ?
                    duplicateCount + 1 : 0;
            }
            return duplicateCount >= Stremashisya.config.MAX_OBSTACLE_DUPLICATION;
        },

        reset: function () {
            this.obstacles = [];
            this.horizonLine.reset();
            this.nightMode.reset();
        },

        resize: function (width, height) {
            this.canvas.width = width;
            this.canvas.height = height;
        },

        addCloud: function () {
            this.clouds.push(new Oblacka(this.canvas, this.spritePos.CLOUD,
                this.dimensions.WIDTH));
        }
    };
})();


function poehali() {
    new Prusher('.interstitial-wrapper');
}

document.addEventListener('DOMContentLoaded', poehali);