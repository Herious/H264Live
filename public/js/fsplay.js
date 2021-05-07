var FSPlay = {
  Player: null,
  Source: {}
};

FSPlay.Player = function() {
    "use strict";
    var Player = function(url, options) {
        this.options = options || {};
        this.source = new FSPlay.Source.WebSocket(url, options);
        
        if (this.wasmModule) {
            if (JSMpeg.WASM_BINARY_INLINED) {
				//初始化webAssembly 
                var wasm = JSMpeg.Base64ToArrayBuffer(JSMpeg.WASM_BINARY_INLINED); 
                this.wasmModule.loadFromBuffer(wasm, this.startLoading.bind(this)) 
            } else {
                this.wasmModule.loadFromFile("jsmpeg.wasm", this.startLoading.bind(this))
            }
        } else {
            this.startLoading()
        }
    };
    Player.prototype.startLoading = function() {
        this.source.start();
        if (this.autoplay) {
            this.play()
        }
    };
    Player.prototype.showHide = function(ev) {
        if (document.visibilityState === "hidden") {
            this.unpauseOnShow = this.wantsToPlay;
            this.pause()
        } else if (this.unpauseOnShow) {
            this.play()
        }
    };
    Player.prototype.play = function(ev) {
        if (this.animationId) {
            return
        }
        this.animationId = requestAnimationFrame(this.update.bind(this));
        this.wantsToPlay = true;
        this.paused = false
    };
    Player.prototype.pause = function(ev) {
        if (this.paused) {
            return
        }
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
        this.wantsToPlay = false;
        this.isPlaying = false;
        this.paused = true;
        if (this.audio && this.audio.canPlay) {
            this.audioOut.stop();
            this.seek(this.currentTime)
        }
        if (this.options.onPause) {
            this.options.onPause(this)
        }
    };
    Player.prototype.getVolume = function() {
        return this.audioOut ? this.audioOut.volume: 0
    };
    Player.prototype.setVolume = function(volume) {
        if (this.audioOut) {
            this.audioOut.volume = volume
        }
    };
    Player.prototype.stop = function(ev) {
        this.pause();
        this.seek(0);
        if (this.video && this.options.decodeFirstFrame !== false) {
            this.video.decode()
        }
    };

    Player.prototype.destroy = function() {
        this.pause();
        this.source.destroy();
    };
    Player.prototype.seek = function(time) {
        var startOffset = this.audio && this.audio.canPlay ? this.audio.startTime: this.video.startTime;
        if (this.video) {
            this.video.seek(time + startOffset)
        }
        if (this.audio) {
            this.audio.seek(time + startOffset)
        }
        this.startTime = JSMpeg.Now() - time
    };
    Player.prototype.getCurrentTime = function() {
        return this.audio && this.audio.canPlay ? this.audio.currentTime - this.audio.startTime: this.video.currentTime - this.video.startTime
    };
    Player.prototype.setCurrentTime = function(time) {
        this.seek(time)
    };
    Player.prototype.update = function() {
        this.animationId = requestAnimationFrame(this.update.bind(this));
        if (!this.source.established) {
            if (this.renderer) {
                this.renderer.renderProgress(this.source.progress)
            }
            return
        }
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.startTime = JSMpeg.Now() - this.currentTime;
            if (this.options.onPlay) {
                this.options.onPlay(this)
            }
        }
        if (this.options.streaming) {
            this.updateForStreaming()
        } else {
            this.updateForStaticFile()
        }
    };
	//更新canvas显示的图片;
    Player.prototype.updateForStreaming = function() {
        if (this.video) {
            this.video.decode()
        }
    };
    Player.prototype.nextFrame = function() {
        if (this.source.established && this.video) {
            return this.video.decode()
        }
        return false
    };
    Player.prototype.updateForStaticFile = function() {
        var notEnoughData = false,
        headroom = 0;
        if (this.audio && this.audio.canPlay) {
            while (!notEnoughData && this.audio.decodedTime - this.audio.currentTime < .25) {
                notEnoughData = !this.audio.decode()
            }
            if (this.video && this.video.currentTime < this.audio.currentTime) {
                notEnoughData = !this.video.decode()
            }
            headroom = this.demuxer.currentTime - this.audio.currentTime
        } else if (this.video) {
            var targetTime = JSMpeg.Now() - this.startTime + this.video.startTime,
            lateTime = targetTime - this.video.currentTime,
            frameTime = 1 / this.video.frameRate;
            if (this.video && lateTime > 0) {
                if (lateTime > frameTime * 2) {
                    this.startTime += lateTime
                }
                notEnoughData = !this.video.decode()
            }
            headroom = this.demuxer.currentTime - targetTime
        }
        this.source.resume(headroom);
        if (notEnoughData && this.source.completed) {
            if (this.loop) {
                this.seek(0)
            } else {
                this.pause();
                if (this.options.onEnded) {
                    this.options.onEnded(this)
                }
            }
        } else if (notEnoughData && this.options.onStalled) {
            this.options.onStalled(this)
        }
    };
    return Player
} ();

JSMpeg.Source.WebSocket = function() {
    "use strict";
	
    var WSSource = function(url, options) {
        this.url = url;
        this.options = options;
        this.socket = null;
        this.streaming = true;
        this.callbacks = {
            connect: [],
            data: []
        };
        this.destination = null;
        this.reconnectInterval = options.reconnectInterval !== undefined ? options.reconnectInterval: 5;
        this.shouldAttemptReconnect = !!this.reconnectInterval;
        this.completed = false;
        this.established = false;
        //新增属性
        this.lprCanvas = document.getElementById('lpr-canvas');
		this.fsCanvas = document.getElementById('rects-canvas');
		this.lineWidth = 3;
        this.frStrokeStyle = "#00FF99";
        this.ftStrokeStyle = "#ff0000";
        this.scale = 1280 / 1920;
        this.frCount = 0;
        this.frList = [];
		
        this.progress = 0;
        this.reconnectTimeoutId = 0;
        this.onEstablishedCallback = options.onSourceEstablished;
        this.onCompletedCallback = options.onSourceCompleted
    };
	//prototype:添加属性；
    WSSource.prototype.connect = function(destination) {
        this.destination = destination
    };
    WSSource.prototype.destroy = function() {
        clearTimeout(this.reconnectTimeoutId);
        this.shouldAttemptReconnect = false;
        this.socket.close()
    };
    //start 
    WSSource.prototype.start = function() {
        this.shouldAttemptReconnect = !!this.reconnectInterval;
        this.progress = 0;
        this.established = false;
        // this.socket = new WebSocket(this.url, this.options.protocols || null);
		
        this.socket = new WebSocket(this.url);
		
        this.socket.binaryType = "arraybuffer";
        this.socket.onmessage = this.onMessage.bind(this);
        this.socket.onopen = this.onOpen.bind(this);
        this.socket.onerror = this.onClose.bind(this);
        this.socket.onclose = this.onClose.bind(this)
    };
    WSSource.prototype.resume = function(secondsHeadroom) {};

    WSSource.prototype.onOpen = function() {
        this.progress = 1
    };
    WSSource.prototype.onClose = function() {
        if (this.shouldAttemptReconnect) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = setTimeout(function() {
                this.start()
            }.bind(this), this.reconnectInterval * 1e3)
        }
    };
    WSSource.prototype.onMessage = function(ev) {
        var isFirstChunk = !this.established;
        this.established = true;
        this.FSShow = true;
        var nowTime = (new Date()).getTime();
        if((nowTime - this.lprStartTime) > 3 * 1000) {
			FSDrawCanvas.CanvasClear(this.lprCanvas);
		}
        $('#loading').remove();
        if (ev.data instanceof Object) {
            if (isFirstChunk && this.onEstablishedCallback) {
                this.onEstablishedCallback(this)
            }
            if (this.destination) {
                this.destination.write(ev.data)
            }
        } else {
            var lprCanvas = document.getElementById('lpr-canvas');
            var fsCanvas = document.getElementById('rects-canvas');
            var evJsonData = JSON.parse(ev.data);
            if (evJsonData.hasOwnProperty("FS_RECTS")) {
                FSDrawCanvas.CanvasClear(fsCanvas);
                var rects = evJsonData.FS_RECTS;
                // rects.length > 0 && console.log(rects);
                var scale = 1280 / 1920;
                FSDrawCanvas.CanvasDrawRects(fsCanvas, rects, scale)
            };

            if (evJsonData.hasOwnProperty("FR_RESULTS")) {
                var frResult = evJsonData.FR_RESULTS;
                FSDrawCanvas.FaceRecognition(frResult)
            };

            if (evJsonData.hasOwnProperty("LPR_Result")) {
                var LPR_Results = evJsonData.LPR_Result;
                if (LPR_Results.length == 0) {
                    return
                }
                lprStartTime = (new Date()).getTime();
                FSDrawCanvas.CanvasClear(lprCanvas);
                FSDrawCanvas.CanvasDrawWords(lprCanvas, LPR_Results);
            } 
        }
    };
    return WSSource
} ();


JSMpeg.Source.Ajax = function() {
    "use strict";
    var AjaxSource = function(url, options) {
        this.url = url;
        this.destination = null;
        this.request = null;
        this.streaming = false;
        this.completed = false;
        this.established = false;
        this.progress = 0;
        this.onEstablishedCallback = options.onSourceEstablished;
        this.onCompletedCallback = options.onSourceCompleted
    };
    AjaxSource.prototype.connect = function(destination) {
        this.destination = destination
    };
    AjaxSource.prototype.start = function() {
        this.request = new XMLHttpRequest;
        this.request.onreadystatechange = function() {
            if (this.request.readyState === this.request.DONE && this.request.status === 200) {
                this.onLoad(this.request.response)
            }
        }.bind(this);
        this.request.onprogress = this.onProgress.bind(this);
        this.request.open("GET", this.url);
        this.request.responseType = "arraybuffer";
        this.request.send()
    };
    AjaxSource.prototype.resume = function(secondsHeadroom) {};
    AjaxSource.prototype.destroy = function() {
        this.request.abort()
    };
    AjaxSource.prototype.onProgress = function(ev) {
        this.progress = ev.loaded / ev.total
    };
    AjaxSource.prototype.onLoad = function(data) {
        this.established = true;
        this.completed = true;
        this.progress = 1;
        if (this.onEstablishedCallback) {
            this.onEstablishedCallback(this)
        }
        if (this.onCompletedCallback) {
            this.onCompletedCallback(this)
        }
        if (this.destination) {
            this.destination.write(data)
        }
    };
    return AjaxSource
} ();