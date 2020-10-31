'use strict';
const CAMERA_FRAME_RATE = 1000 / 20;
const BELL_SERVER = "https://bellhouse.eu.ngrok.io";


var request = require('request');

var largeGridDim, smallGridDim;
var sampling = false;
var recording = false;
var playing = false;
var threshold = 5;
var samplingInterval, sampleLoop, sample, sampleDiv;
var videoCanvas, videoCanvasCtx;
var videoHeight, videoWidth;

var video = document.createElement('video');

/*Setup event listeners for controls on homepage */
initControls();
initVideo();


function initVideo() {
    const height = videoHeight ? videoHeight: 400;
    const width = videoWidth ? videoWidth : 600;
    console.log(width);
    video.width = width;
    video.height = height;
    videoCanvas = document.getElementById('videoCanvas');
    videoCanvas.width = width;
    videoCanvas.height = height;

    videoCanvasCtx = videoCanvas.getContext('2d');

    setInterval(function () {
        videoCanvasCtx.clearRect(0, 0, width, height);
        videoCanvasCtx.drawImage(video, 0, 0, width, height, 0, 0, width, height);
    }, CAMERA_FRAME_RATE);
}

function initControls() {
    var dim1 = document.getElementById('grid-dim-1');
    var dim2 = document.getElementById('grid-dim-2');
    var width = document.getElementById('video-width');
    var height = document.getElementById('video-height');
    var sampleInterval = document.getElementById('sample-interval');
    var sampleThreshold = document.getElementById('sample-threshold');
    var samplingButton = document.getElementById('sampling-button');
    var recordingButton = document.getElementById('record-button');
    var playRecordingButton = document.getElementById('play-record-button')
    var setupButton = document.getElementById('setup-button');


    dim1.addEventListener('change', function (evt) {
        var value1 = evt.target.value;
        var value2 = dim2.value;
        setGridDims(value1, value2);
        if (sampling) {
            createSamples();
        }
    });

    dim2.addEventListener('change', function (evt) {
        var value2 = evt.target.value;
        var value1 = dim1.value;
        setGridDims(value1, value2);
        if (sampling) {
            createSamples();
        }
    });

    height.addEventListener('change', function (evt) {
        var width = videoWidth;
        var newHeight = height.value;
        setVideoDims(newHeight, width);
        if (sampling) {
            createSamples();
        }
    });

    width.addEventListener('change', function (evt) {
        var height = videoHeight;
        var newWidth = width.value;
        setVideoDims(height, newWidth);
        if (sampling) {
            createSamples();
        }
    });

    sampleInterval.addEventListener('change', function (evt) {
        var value = evt.target.value;
        samplingInterval = value * 1000;
        if (sampling) {
            createSamples();
        }
    });

    sampleThreshold.addEventListener('change', function(evt){
        var value = evt.target.value;
        threshold = value;
        if(sampling) {
            createSamples();
        }
    });

    samplingButton.addEventListener('click', function(evt) {
        if(!sampling) {
            sampling = true;
            createSamples();
            samplingButton.innerHTML = "<i class=\"fa fa-video-camera\" aria-hidden=\"true\"></i> Stop Sampling";
            samplingButton.style.backgroundColor = "#c83d2a";
        } else {
            sampling = false;
            clearSamples();
            samplingButton.innerHTML = "<i class=\"fa fa-video-camera\" aria-hidden=\"true\"></i> Start Sampling";

        }
    });

    recordingButton.addEventListener('click', function(evt) {
       if(!recording) {
           var recordName = prompt("Please enter a name for this recording");
           request
               .post(BELL_SERVER+'/recording')
               .json({record_filename: recordName})
               .on('response', function(response) {
                   alert("Now Recording...");
                   recording = true;
                   recordingButton.innerHTML = "<i class=\"fa fa-stop-circle\" aria-hidden=\"true\"></i> Stop Recording";
               });
       } else {
           request
               .get(BELL_SERVER+'/recording/stop')
               .on('response', function(response) {
                    alert("Recording Stopped");
                    recording = false;
                   recordingButton.innerHTML = "<i class=\"fa fa-play-circle\" aria-hidden=\"true\"></i> Start Recording";
                });
                listRecordings();
       }
    });

    playRecordingButton.addEventListener('click', function(evt) {
        if(!playing) {
            var record = document.getElementById('records-list').value;
            request
                .get(BELL_SERVER+'/records/'+record.replace('.json', '')+'/play')
                .on('response', function(response) {
                    playRecordingButton.innerHTML = "<i class=\"fa fa-stop-circle\" aria-hidden=\"true\"></i>";
                    playing = true;
                });
        } else {
            request
                .get(BELL_SERVER+'/records/stop')
                .on('response', function(response) {
                     playRecordingButton.innerHTML = "<i class=\"fa fa-play-circle\" aria-hidden=\"true\"></i>";
                     playing = false;
            });
        }
    });

    setupButton.addEventListener('click', function(evt) {
       window.location.href="setup.html"
    });


    listRecordings();
    sampleDiv = document.getElementById('samples');
    setGridDims(dim1.value, dim2.value);
    samplingInterval = sampleInterval.value * 1000;
}

function setGridDims(val1, val2) {
    if (val1 > val2) {
        largeGridDim = val1;
        smallGridDim = val2
    } else {
        largeGridDim = val2;
        smallGridDim = val1;
    }
}

function setVideoDims(height, width) {
    videoHeight = height;
    videoWidth = width;
    initVideo();
}

function createSamples() {
    console.log("Initialising sample, sampling at " + samplingInterval + " millis");

    clearSamples();

    const width = videoWidth ? videoWidth : 600;
    const height = videoHeight ? videoHeight : 400;

    var clickPattern = {
                            topLeft: {
                                x : 0,
                                y : 0
                            },
                            bottomRight : {
                                x : width,
                                y : height
                            }
                        };

    var grid = getSampleGrid(clickPattern);
    sampleDiv.setAttribute('style', 'width:' + (grid.totalWidth + (grid.numColumns * 8)) + "px");
    var sampleContexts = [];
    for (var i = 0; i < grid.numCells; i++) {
        var sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = grid.cellWidth;
        sampleCanvas.height = grid.cellHeight;
        sampleContexts.push(sampleCanvas.getContext('2d'));
        sampleDiv.appendChild(sampleCanvas);
    }

    sampleLoop = setInterval(function () {

        if (sample) {
            sample = {
                previous: sample.current,
                current: [],
                diff: []
            };
        } else {
            sample = {
                current: []
            };
        }

        var i = 0;
        sampleContexts.forEach(function (ctx) {
            ctx.clearRect(0, 0, grid.cellWidth, grid.cellHeight);
            ctx.drawImage(video,
                grid.sampleCoordOrigins[i].x,
                grid.sampleCoordOrigins[i].y,
                grid.cellWidth,
                grid.cellHeight,
                0,
                0,
                grid.cellWidth,
                grid.cellHeight);

            var sampleData = videoCanvasCtx.getImageData(grid.sampleCoordOrigins[i].x,
                grid.sampleCoordOrigins[i].y,
                grid.cellWidth,
                grid.cellHeight);

            sample.current.push(evaluateData(sampleData));

            if (sample.previous) {
                sample.diff.push(sample.current[i] - sample.previous[i]);
            }
            i++;
        });

        // we now have our complete sample data
        // if diff number is positive cell pixels have become lighter
        // if diff number is negative cell pixels have become darker
        if(sample.diff) {
            sampleToRequest(sample.diff);
            console.log("DIFF:\n",sample.diff);
        }
    }, samplingInterval);

};

function evaluateData(data) {
    function add(a, b) {
        return a + b;
    }

    return data.data.reduce(add, 0) / data.data.length;
}

function clearSamples() {
    while (sampleDiv.hasChildNodes()) {
        sampleDiv.removeAttribute('style');
        sampleDiv.removeChild(sampleDiv.lastChild);
    }
    if (sampleLoop) {
        clearInterval(sampleLoop)
    }
    if (sample) {
        sample = {};
    }
}

function getSampleGrid(clickPattern) {

    var originX = clickPattern.topLeft.x;
    var originY = clickPattern.topLeft.y;
    var totalWidth = clickPattern.bottomRight.x - clickPattern.topLeft.x;
    var totalHeight = clickPattern.bottomRight.y - clickPattern.topLeft.y;

    var rows, columns, cellWidth, cellHeight;

    if (totalWidth > totalHeight) {
        //landscape
        rows = smallGridDim;
        columns = largeGridDim;
    } else {
        //portrait
        rows = largeGridDim;
        columns = smallGridDim;
    }

    cellWidth = Math.floor(totalWidth / columns);
    cellHeight = Math.floor(totalHeight / rows);

    var sampleCoordOrigins = [];
    for (var i = 0; i < rows; i++) {
        var y = originY + (i * cellHeight);
        for (var j = 0; j < columns; j++) {
            var x = originX + (j * cellWidth);
            var coord = {
                x: x,
                y: y
            };
            sampleCoordOrigins.push(coord);
        }
    }

    return {
        originX: originX,
        originY: originY,
        totalWidth: totalWidth,
        totalHeight: totalHeight,
        numRows: rows,
        numColumns: columns,
        numCells: rows * columns,
        cellWidth: cellWidth,
        cellHeight: cellHeight,
        sampleCoordOrigins: sampleCoordOrigins
    };
}

function handleSuccess(stream) {
    video.srcObject = stream;
    video.play();
}

function handleError(error) {
    console.log("Problem with camera: " + error)
}

function sampleToRequest(sampleArray) {
    var JSONArray = [];
    sampleArray.forEach(function (sample, index) {
        if(Math.abs(sample) > threshold) {
            JSONArray.push(index);
        }
    });
    if(JSONArray.length > 0) {
        request.post(BELL_SERVER + '/strike').json(JSONArray);
    }
}

function listRecordings() {
    request(BELL_SERVER+'/records', function(error, response, body) {
        var recordSelector = document.getElementById('records-list');
        while (recordSelector.firstChild) {
            recordSelector.removeChild(recordSelector.firstChild)
        }
        var records = JSON.parse(body).records;
            records.forEach(function(record) {
                var option = document.createElement('option');
                option.value = record;
                option.innerHTML = record;
                recordSelector.appendChild(option);
            });
    });
};


navigator.webkitGetUserMedia({audio: false, video: true}, handleSuccess, handleError);
