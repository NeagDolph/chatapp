var iceServers = [
  { url: "stun:stun1.l.google.com:19302" },
  {
    url: "turn:numb.viagenie.ca",
    credential: "muazkh",
    username: "webrtc@live.com"
  }
];

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

var peer = new webkitRTCPeerConnection({
  iceServers: iceServers,
  optional
});

function getAudio(successCallback, errorCallback) {
  navigator.webkitGetUserMedia(
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
  SocketService.emit("message", {
    conversation_id: me.conversation_id,
    targetUser: to,
    sdp: peer.localDescription
  });
}

function startCall() {
  getAudio(
    function(stream) {
      console.log("peer");
      console.log(peer);

      console.log("adding local stream");
      peer.addStream(stream);

      peer.createOffer(
        function(offerSDP) {
          console.log("now creating offer");
          peer.setLocalDescription(
            offerSDP,
            function() {
              console.log("local description is set. now informing peer");

              SocketService.emit("message", {
                conversation_id: me.conversation_id,
                targetUser: to,
                offerSDP: offerSDP
              });
            },
            function() {
              console.log("error setting local description");
            }
          );
          console.log("now emitting offerSDP message");
        },
        function() {
          console.log("error occured while creating offer");
        },
        sdpConstraints
      );

      console.log("now calling " + to);
    },
    function(err) {
      console.log("an error occured while getting the audio");
    }
  );
}

function createAnswer(offerSDP) {
  getAudio(
    function(stream) {
      console.log("now creating answer");
      console.log(stream);

      console.log("NOW ADDING STREAM");
      peer.addStream(stream);

      var remoteDescription = new RTCSessionDescription(offerSDP);
      peer.setRemoteDescription(remoteDescription);

      peer.createAnswer(
        function(answerSDP) {
          peer.setLocalDescription(
            answerSDP,
            function() {
              console.log("done setting local description");
              console.log("now emitting answer sdp message");
              socket.emit("message", {
                message: JSON.stringify({
                  conversation_id: me.conversation_id,
                  targetUser: to,
                  answerSDP: answerSDP
                }),
                user: currentuser.name,
                channelid: currentuser.name,
                channeltype: 0,
                webcall: true
              });
            },
            function() {
              console.log("error setting local description");
            }
          );
        },
        function(err) {
          alert("error occured while creating answer");
          console.log(err);
        },
        sdpConstraints
      );
    },
    function(err) {
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

peer.onaddstream = function(stream) {
  console.log("now adding remote stream");
  console.log(stream);
  audio.src = window.URL.createObjectURL(stream); //this is where the error occurs
};

peer.onicecandidate = function(event) {
  console.log("on ice candidate");
  var candidate = event.candidate;
  console.log(candidate);
  console.log("after ice candidate");
  if (candidate) {
    console.log("now emitting candidate message");
    SocketService.emit("message", {
      conversation_id: me.conversation_id,
      targetUser: to,
      candidate: candidate
    });
  }

  console.log(typeof candidate);
  if (typeof candidate == "undefined") {
    console.log("now sending sdp");
    send_SDP();
  }
};

peer.ongatheringchange = function(e) {
  if (e.currentTarget && e.currentTarget.iceGatheringState === "complete") {
    send_SDP();
  }
};
