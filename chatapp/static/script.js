var socket = io();
var full = [];
var currentuser = { name: "", type: 0 };
var copyid = new ClipboardJS("#copyid");
var currentcalling;
var currentcallingname;
var accepteduser;
var incall;
var allmessages = {};

copyid.on("success", function(e) {
  toastr["success"]("Channel ID copied to clipboard", "Success!");

  e.clearSelection();
});

var addusertip = tippy.one("#adduser", {
  onShown() {
    $("#adduser-input").focus();
  }
});

var addusertop = tippy.one("#makechan", {
  onShown() {
    $("#makechan-input").focus();
  }
});

function adduser(user) {
  $.ajax({
    url: "/add",
    type: "POST",
    data: { user: user },
    success: data => {
      if (data === "success") {
        full.push({ name: user, type: 1 });
        $("#channels").append(
          `
				<div class="row channelitemrow">
					<div class="col-md-12 channelitem" id="privatem_${user}" target-user="` +
            user +
            `">` +
            user +
            `</div>
				</div>`
        );
        $(".chatarea").show();
        currentuser = { name: user.trim(), type: 1 };
        $("#messages").html("");
        $(".channel").text(user);
        $("#adduser-input").val("");
        addusertip.hide();
        $(".channels").removeClass("inchannel");
        $(".chatarea").addClass("inpm");
      } else if (data === "noexist") {
        toastr["error"]("User does not exist!", "Error!");

        toastr.options = {
          closeButton: false,
          debug: false,
          newestOnTop: false,
          progressBar: false,
          positionClass: "toast-bottom-right",
          preventDuplicates: false,
          onclick: null,
          showDuration: "300",
          hideDuration: "1000",
          timeOut: "5000",
          extendedTimeOut: "1000",
          showEasing: "swing",
          hideEasing: "linear",
          showMethod: "fadeIn",
          hideMethod: "fadeOut"
        };
        console.log("a");
      } else if (data === "already") {
        toastr["error"]("Already added that user!", "Error!");

        toastr.options = {
          closeButton: false,
          debug: false,
          newestOnTop: false,
          progressBar: false,
          positionClass: "toast-bottom-right",
          preventDuplicates: false,
          onclick: null,
          showDuration: "300",
          hideDuration: "1000",
          timeOut: "5000",
          extendedTimeOut: "1000",
          showEasing: "swing",
          hideEasing: "linear",
          showMethod: "fadeIn",
          hideMethod: "fadeOut"
        };
      }
    }
  });
}

function getmessages(targt) {
  console.log("this", targt);
  let target = targt.name;
  let channel;
  let alrdystored = false;
  let data;

  if (targt.type == 1) {
    channel = [selfuser, target].sort().join(";");
    if (allmessages["privatem_" + target].length > 0) {
      alrdystored = true;
      data = allmessages["privatem_" + target];
    }
  } else {
    channel = targt.name;
    if (allmessages["channel_" + target].length > 0) {
      alrdystored = true;
      data = allmessages["channel_" + target];
    }
  }

  if (alrdystored) {
    $("#messages").html("");
    for (let i in data) {
      obj = data[i];
      let time = bettertime(new Date(obj.time * 1));
      let response = obj.message;
      let sender = obj.sender;

      if (obj.you) {
        sender = "You";
      }

      $("#messages").append(
        $("<li>").html(`${time} <br>${sender}: ${response}`)
      );
    }
    $("#msgscroll")[0].scrollTo(0, $("#msgscroll")[0].scrollHeight);
    return;
  }

  console.log("tee", channel);

  $.ajax({
    url: "/messages",
    type: "POST",
    data: { channel: channel, limit: 15, channeltype: targt.type },
    success: json => {
      json = JSON.parse(json);

      data = json.messages;

      $("#messages").html("");
      if (targt.type == 1) {
        allmessages["privatem_" + target] = [];
      } else {
        allmessages["channel_" + channel] = [];
      }

      for (let i in data) {
        obj = data[i];
        let time = bettertime(new Date(obj.time * 1));
        let response = obj.data;
        let sender;

        if (targt.type == 1) {
          sender = target;
          allmessages["privatem_" + sender].push({
            message: response,
            time: obj.time * 1,
            sender: sender,
            you: obj.you
          });
        } else {
          sender = obj.sender;
          allmessages["channel_" + channel].push({
            message: response,
            time: obj.time * 1,
            sender: sender,
            you: obj.you
          });
        }

        if (obj.you) {
          sender = "You";
        }

        $("#messages").append(
          $("<li>").html(`${time} <br>${sender}: ${response}`)
        );
      }

      $("#msgscroll")[0].scrollTo(0, $("#msgscroll")[0].scrollHeight);
    }
  });
}

window.onload = () => {};

$("body").on("mousedown", ".channelitem", ef => {
  $(".chatarea").show();

  try {
    if (
      currentuser.name === $(ef.currentTarget).text() &&
      $(".channels").hasClass("inchannel")
    ) {
      return;
    }
  } catch {}

  currentuser = {
    name: $(ef.currentTarget)
      .text()
      .trim(),
    type: 1
  };

  if ($(ef.currentTarget).attr("target-chan")) {
    currentuser.title = currentuser.name;
    currentuser.name = $(ef.currentTarget).attr("target-chan");
    currentuser.type = 0;
    $(".channels").addClass("inchannel");
    $(".chatarea").removeClass("inpm");
    $("#copyid").attr(
      "data-clipboard-text",
      window.location.href + "join/" + currentuser.name
    );
  } else {
    $(".channels").removeClass("inchannel");
    $(".chatarea").addClass("inpm");
  }

  $(ef.currentTarget).removeClass("unread");

  $(".channel").text($(ef.currentTarget).attr("target-user"));

  console.log("fick", currentuser.name);

  getmessages(currentuser);
});

$(".msgform").submit(e => {
  e.preventDefault();
  msg = $("#m").val();

  if (msg === "") {
    return false;
  }
  let time = bettertime(new Date());
  if (currentuser.type === 1) {
    allmessages["privatem_" + currentuser.name].push({
      message: msg,
      sender: selfuser,
      time: Date.now(),
      you: true
    });
    socket.emit("message", {
      message: msg,
      user: currentuser.name,
      channeltype: 1
    });
  } else {
    allmessages["channel_" + currentuser.name].push({
      message: msg,
      sender: selfuser,
      time: Date.now(),
      you: true
    });
    socket.emit("message", {
      message: msg,
      user: currentuser.name,
      channelid: currentuser.name,
      channeltype: 0
    });
  }
  $("#messages").append($("<li>").html(`${time} <br>You: ${msg}`));
  $("#m").val("");
  $("#msgscroll")[0].scrollTo(0, $("#msgscroll")[0].scrollHeight);
  return false;
});

$("body").on("keyup", "#adduser-input", e => {
  if (e.keyCode == 13) {
    let intendeduser = $("#adduser-input").val();

    if (intendeduser == selfuser) {
      toastr["error"]("You can't add yourself!", "Error!");

      toastr.options = {
        closeButton: false,
        debug: false,
        newestOnTop: false,
        progressBar: false,
        positionClass: "toast-bottom-right",
        preventDuplicates: false,
        onclick: null,
        showDuration: "300",
        hideDuration: "1000",
        timeOut: "5000",
        extendedTimeOut: "1000",
        showEasing: "swing",
        hideEasing: "linear",
        showMethod: "fadeIn",
        hideMethod: "fadeOut"
      };

      return;
    }

    adduser(intendeduser);
  }
});

$("body").on("keyup", "#makechan-input", e => {
  if (e.keyCode == 13) {
    let channame = $("#makechan-input").val();

    $.ajax({
      url: "/createchannel",
      type: "POST",
      data: { channelname: channame },
      success: data => {
        if (data.split("$$")[0] === "success") {
          channelid = data.split("$$")[1];
          full.push({ id: channelid, name: channame, type: 0 });
          $("#channels").append(
            `
					<div class="row channelitemrow">
						<div class="col-md-12 channelitem public" type="0" target-user="${channame}" target-chan="${channelid}">` +
              channame +
              `</div>
					</div>`
          );
          $(".chatarea").show();
          currentuser = { name: channelid, title: channame.trim(), type: 0 };
          $("#messages").html("");
          $(".channel").text(title);

          $("#makechan-input").val("");
          addusertop.hide();

          $(".channels").addClass("inchannel");
          $(".chatarea").removeClass("inpm");
          $("#copyid").attr(
            "data-clipboard-text",
            window.location.href + "join/" + currentuser.name
          );
        }
      }
    });
  }
});

function getall(obj, thing) {
  let ree = [];
  for (let i in obj) {
    ree.push(obj[i][thing]);
  }
  return ree;
}

socket.on("pm", msg => {
  if (!msg.webcall) {
    let response = msg.data;
    let user = msg.from;
    let time = bettertime(new Date(msg.time));

    console.log(currentuser.name, user);
    if (allmessages["privatem_" + user].length > 0) {
      allmessages["privatem_" + user].push({
        message: response,
        time: msg.time,
        sender: user
      });
    }

    if (currentuser.type == 0 || currentuser.name != user) {
      $("#privatem_" + user).addClass("unread");
      return false;
    }

    if (getall(full, "name").indexOf(user) != -1) {
      $("#messages").append($("<li>").html(`${time} <br>${user}: ${response}`));
      $("#msgscroll")[0].scrollTo(0, $("#msgscroll")[0].scrollHeight);
    } else {
      $("#channels").prepend(
        `<div class="row channelitemrow">
          <div class="col-md-12 channelitem unread" id="privatem_${user}" target-user="${user}">${user}</div>
		    </div>`
      );
      full.push({ name: user, type: 1 });
    }
  } else if (msg.webcall) {
    currentuser = { name: msg.from.trim(), type: 1 };

    msg = JSON.parse(msg.data);

    if (msg.offerSDP) {
      currentcalling = msg.offerSDP;
      currentcallingname = currentuser.name;
      $(".calluser").text(currentuser.name);
      $(".calltab").show();
      // acceptcall(msg.offerSDP)
    } else if (msg.answerSDP) {
      var remoteDescription = new RTCSessionDescription(msg.answerSDP);
      peer.setRemoteDescription(
        remoteDescription,
        () => {
          incall = true;
          console.log("finished signaling offers and answers!");
        },
        () => {
          console.log("error signaling offers and answers");
        }
      );
    } else if (msg.candidate) {
      console.log("D");
      var candidate = msg.candidate.candidate;
      var sdpMLineIndex = msg.candidate.sdpMLineIndex;

      peer.addIceCandidate(
        new RTCIceCandidate({
          sdpMLineIndex: sdpMLineIndex,
          candidate: candidate
        })
      );
    }
  }
});

function acceptcall(e) {
  accepteduser = currentcallingname;
  console.log("e");
  $(".calltab").hide();

  var remoteDescription = new RTCSessionDescription(e);
  peer.setRemoteDescription(
    remoteDescription,
    function() {
      console.log("Call accepted");
      createAnswer(e);
    },
    function() {
      console.log("error setting remote description");
    }
  );
}

function declinecall() {
  $(".calltab").hide();
}

socket.on("servermsg", msg => {
  let response = msg.data;
  let user = msg.from;
  let channel = msg.channel;
  let time = bettertime(new Date(msg.time));

  if (allmessages["channel_" + channel].length > 0) {
    allmessages["channel_" + channel].push({
      message: response,
      time: msg.time,
      sender: user
    });
  }

  if (
    user == selfuser ||
    currentuser.name !== channel ||
    currentuser.type === 1
  ) {
    console.log(currentuser.name, channel);
    console.log("#channel_" + channel);
    $("#channel_" + channel).addClass("unread");
    return;
  }

  $("#messages").append($("<li>").html(`${time} <br>${user}: ${response}`));
  $("#msgscroll")[0].scrollTo(0, $("#msgscroll")[0].scrollHeight);
});

socket.on("concurrent", ful => {
  console.log(ful);
  if (Object.entries(allmessages).length > 0 && obj.constructor === Object) {
    return;
  }
  document.querySelector("#channels").innerHTML = "";

  full = ful;
  console.log("EE", ful);
  for (var i in ful) {
    targetchan = "";

    if (ful[i].type === 0) {
      allmessages["channel_" + ful[i].id] = [];
      $("#channels").append(`
      <div class="row channelitemrow">
        <div class="col-md-12 channelitem public" id="channel_${
          ful[i].id
        }" target-user="${ful[i].name}" target-chan="${ful[i].id}">${
        ful[i].name
      }</div>
      </div>`);
    } else {
      allmessages["privatem_" + ful[i].name] = [];
      $("#channels").append(`
      <div class="row channelitemrow">
        <div class="col-md-12 channelitem" id="privatem_${
          ful[i].name
        }" target-user="${ful[i].name}">${ful[i].name}</div>
      </div>`);
    }
  }
});

function bettertime(time) {
  let hours = time.getHours();
  let mins = time.getMinutes().toString();

  if (hours >= 12) {
    ampm = "PM";
    if (hours >= 14) {
      hours -= 12;
    }
  } else {
    ampm = "AM";
    if (hours == 0) {
      hours += 12;
    }
  }

  if (mins.length == 1) {
    mins = "0" + mins;
  }

  return `Today at ${hours}:${mins} ${ampm}`;
}

function startaudio() {
  startvolumelvl();
  $("#privatem_" + currentuser.name).append(`
  <div id="incallicon">
    <svg id="circle" height="60" width="60" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" >
      <image x="0" y="0" height="60" width="60"  xlink:href="/static/icon.svg" />
   </svg>
  </div>`);
}

function stopaudio() {}
