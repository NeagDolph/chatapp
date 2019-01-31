var candidate;
var strem;

var iceServers = [
  { url: "stun:stun1.l.google.com:19302" },
  {
    urls: [
      "turn:webrtcweb.com:7788",
      "turn:webrtcweb.com:8877",
      "turn:webrtcweb.com:4455"
    ],
    username: "muazkh",
    credential: "muazkh"
  }
];

audio = $("#audio1")[0];

var sdpConstraints = {
  optional: [],
  mandatory: {
    OfferToReceiveAudio: true,
    OfferToReceiveVideo: false
  }
};

var DtlsSrtpKeyAgreement = {
  DtlsSrtpKeyAgreement: true
};

var optional = {
  optional: [DtlsSrtpKeyAgreement]
};

var peer = new RTCPeerConnection({
  iceServers: iceServers,
  optional
});

navigator.getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia ||
  navigator.msGetUserMedia;

function getAudio(successCallback, errorCallback) {
  navigator.getUserMedia(
    {
      audio: true,
      video: false
    },
    successCallback,
    errorCallback
  );
}

function send_SDP() {
  console.log("now emitting send sdp message");

  socket.emit("message", {
    message: JSON.stringify({
      sdp: peer.localDescription
    }),
    user: currentuser.name,
    channelid: currentuser.name,
    channeltype: 1,
    webcall: true
  });
}

function startCall() {
  getAudio(
    stream => {
      startaudio();
      console.log("peer");
      console.log(peer);
      console.log(stream);
      strem = stream;
      accepteduser = currentuser.name;

      console.log("adding local stream");
      peer.addStream(stream);

      peer.createOffer(
        offerSDP => {
          console.log("now creating offer");
          peer.setLocalDescription(
            offerSDP,
            () => {
              console.log("local description is set. now informing peer");

              socket.emit("message", {
                message: JSON.stringify({
                  offerSDP: offerSDP
                }),
                user: currentuser.name,
                channelid: currentuser.name,
                channeltype: 1,
                webcall: true
              });
            },
            () => {
              console.log("error setting local description");
            }
          );
          console.log("now emitting offerSDP message");
        },
        () => {
          console.log("error occured while creating offer");
        },
        sdpConstraints
      );

      // console.log("now calling " + to);
    },
    err => {
      console.log("an error occured while getting the audio");
    }
  );
}

function createAnswer(offerSDP) {
  getAudio(
    stream => {
      console.log("now creating answer");
      console.log(stream);
      strem = stream;
      startaudio();

      console.log("NOW ADDING STREAM");
      peer.addStream(stream);

      var remoteDescription = new RTCSessionDescription(offerSDP);
      peer.setRemoteDescription(remoteDescription);

      peer.createAnswer(
        answerSDP => {
          peer.setLocalDescription(
            answerSDP,
            () => {
              console.log("now emitting answer sdp message", answerSDP);
              socket.emit("message", {
                message: JSON.stringify({
                  answerSDP: answerSDP
                }),
                user: currentuser.name,
                channelid: currentuser.name,
                channeltype: 1,
                webcall: true
              });
            },
            () => {
              console.log("error setting local description");
            }
          );
        },
        err => {
          alert("error occured while creating answer");
          console.log(err);
        },
        sdpConstraints
      );
    },
    err => {
      alert("error occured while getting the audio for answer");
    }
  );
}

// SocketService.on("message", function(msg) {
//   if (msg.offerSDP) {
//     var remoteDescription = new RTCSessionDescription(msg.offerSDP);
//     peer.setRemoteDescription(
//       remoteDescription,
//       function() {
//         console.log("done setting remote description");
//         createAnswer(msg.offerSDP);
//       },
//       function() {
//         console.log("error setting remote description");
//       }
//     );
//   }

//   if (msg.answerSDP) {
//     var remoteDescription = new RTCSessionDescription(msg.answerSDP);
//     peer.setRemoteDescription(
//       remoteDescription,
//       function() {
//         console.log("finished signaling offers and answers!");
//       },
//       function() {
//         console.log("error signaling offers and answers");
//       }
//     );
//   }

//   if (msg.candidate) {
//     var candidate = msg.candidate.candidate;
//     var sdpMLineIndex = msg.candidate.sdpMLineIndex;

//     peer.addIceCandidate(
//       new RTCIceCandidate({
//         sdpMLineIndex: sdpMLineIndex,
//         candidate: candidate
//       })
//     );
//   }
// });

peer.onaddstream = event => {
  console.log("now adding remote stream");
  console.log(event);
  console.log("yeet", event.stream);
  audio.srcObject = event.stream;
};

peer.onicecandidate = event => {
  console.log("on ice candidate");
  candidate = event.candidate;
  console.log(candidate);
  console.log(event);
  console.log("after ice candidate");
  if (candidate) {
    console.log("now emitting candidate message");
    socket.emit("message", {
      message: JSON.stringify({
        candidate: candidate
      }),
      user: currentuser.name,
      channelid: currentuser.name,
      channeltype: 1,
      webcall: true
    });
  }

  console.log(typeof candidate);
  if (typeof candidate == "undefined") {
    console.log("now sending sdp");
    send_SDP();
  }
};

peer.ongatheringchange = e => {
  console.log("EEEEEEEEEEEE");
  if (e.currentTarget && e.currentTarget.iceGatheringState === "complete") {
    send_SDP();
  }
};
