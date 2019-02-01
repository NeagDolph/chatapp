var audioContext;
var mediaStreamSource;
var meter;
var v;
var processor;

function startvolumelvl() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  mediaStreamSource = null;
  meter = null;
  v = 0;

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      mediaStreamSource = audioContext.createMediaStreamSource(stream);
      meter = createAudioMeter(audioContext);
      mediaStreamSource.connect(meter);
    });
  }

  function createAudioMeter(audioContext, clipLevel, averaging, clipLag) {
    processor = audioContext.createScriptProcessor(512);
    processor.onaudioprocess = volumeAudioProcess;
    processor.clipping = false;
    processor.lastClip = 0;
    processor.volume = 0;
    processor.clipLevel = clipLevel || 0.98;
    processor.averaging = averaging || 0.95;
    processor.clipLag = clipLag || 750;

    // this will have no effect, since we don't copy the input to the output,
    // but works around a current Chrome bug.
    processor.connect(audioContext.destination);

    processor.checkClipping = function() {
      if (!this.clipping) {
        return false;
      }
      if (this.lastClip + this.clipLag < window.performance.now()) {
        this.clipping = false;
      }
      return this.clipping;
    };

    processor.shutdown = function() {
      this.disconnect();
      this.onaudioprocess = null;
    };

    return processor;
  }

  function volumeAudioProcess(event) {
    const buf = event.inputBuffer.getChannelData(0);
    const bufLength = buf.length;
    let sum = 0;
    let x;

    // Do a root-mean-square on the samples: sum up the squares...
    for (var i = 0; i < bufLength; i++) {
      x = buf[i];
      if (Math.abs(x) >= this.clipLevel) {
        this.clipping = true;
        this.lastClip = window.performance.now();
      }
      sum += x * x;
    }

    // ... then take the square root of the sum.
    const rms = Math.sqrt(sum / bufLength);

    // Now smooth this out with the averaging factor applied
    // to the previous sample - take the max here because we
    // want "fast attack, slow release."
    this.volume = Math.max(rms, this.volume);
    if (strem) {
      if (this.volume < 0.009) {
        strem.getAudioTracks()[0].enabled = false;
        // console.log("false")
      } else {
        strem.getAudioTracks()[0].enabled = true;
        // console.log("true")
      }
    }
  }
}
