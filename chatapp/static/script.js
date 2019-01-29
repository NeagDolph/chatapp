'use strict';


var socket = io();
var full = []
var currentuser;
var copyid = new ClipboardJS('#copyid');

//Storage

// $(() => {
// 	var store = new Persist.Store('messages');


// });

const mediaStreamConstraints = {
	video: true,
};
  
// Video element where stream will be placed.
const localVideo = document.querySelector('video');

// Local stream that will be reproduced on the video.
let localStream;

// Handles success by adding the MediaStream to the video element.
function gotLocalMediaStream(mediaStream) {
	localStream = mediaStream;
	localVideo.srcObject = mediaStream;
}

// Handles error by logging a message to the console with the error message.
function handleLocalMediaStreamError(error) {
	console.log('navigator.getUserMedia error: ', error);
}

// Initializes media stream.
navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
	.then(gotLocalMediaStream).catch(handleLocalMediaStreamError);






copyid.on('success', function(e) {
    toastr["success"]("Channel ID copied to clipboard", "Success!")

    e.clearSelection();
});


var addusertip = tippy.one("#adduser", {
	onShown() {
		$("#adduser-input").focus()
	}
})

var addusertop = tippy.one("#makechan", {
	onShown() {
		$("#makechan-input").focus()
	}
})

function adduser(user) {
	$.ajax({
		url : '/add',
		type:"POST",
		data: {user: user},
		success: data => {
			if (data === "success") {

				full.push(user)
				$("#channels").append(`
				<div class="row channelitemrow">
					<div class="col-md-12 channelitem" target-user="` + user + `">` + user + `</div>
				</div>`)
				$(".chatarea").show()
				currentuser = {name: user, type: 1}
				$('#messages').html("")
				$(".channel").text(user)
				
				$("#adduser-input").val("")
				addusertip.hide();


			} else if (data === "noexist") {
				toastr["error"]("User does not exist!", "Error!")

				toastr.options = {
				"closeButton": false,
				"debug": false,
				"newestOnTop": false,
				"progressBar": false,
				"positionClass": "toast-bottom-right",
				"preventDuplicates": false,
				"onclick": null,
				"showDuration": "300",
				"hideDuration": "1000",
				"timeOut": "5000",
				"extendedTimeOut": "1000",
				"showEasing": "swing",
				"hideEasing": "linear",
				"showMethod": "fadeIn",
				"hideMethod": "fadeOut"
				}
				console.log("a")


			} else if (data === "already") {
				toastr["error"]("Already added that user!", "Error!")

				toastr.options = {
					"closeButton": false,
					"debug": false,
					"newestOnTop": false,
					"progressBar": false,
					"positionClass": "toast-bottom-right",
					"preventDuplicates": false,
					"onclick": null,
					"showDuration": "300",
					"hideDuration": "1000",
					"timeOut": "5000",
					"extendedTimeOut": "1000",
					"showEasing": "swing",
					"hideEasing": "linear",
					"showMethod": "fadeIn",
					"hideMethod": "fadeOut"
				}
			}
		}
	});
}

function getmessages(targt) {
	console.log("this", targt)
	let target = targt.name
	let channel

	if (targt.type == 1) {
		let channel = [selfuser, target].sort().join(";")
	} else {
		channel = targt.name
	}


	$.ajax({
		url : '/messages',
		type:"POST",
		data: {channel: channel, limit: 15, channeltype: targt.type},
		success: data => {
			data = JSON.parse(data)

			$('#messages').html("")

			for (let i in data) {
				obj = data[i]
				let time = bettertime(new Date(obj.time * 1))
				let response = obj.data
				let sender

				if (targt.type == 1) {
					sender = target
				} else {
					sender = obj.sender
				}

				if (obj.you) {
					sender = "You"
				}

				$('#messages').append($('<li>').html(`${time} <br>${sender}: ${response}`));


			}

			$("#msgscroll")[0].scrollTo(0, $("#msgscroll")[0].scrollHeight)
		}
	});
}


window.onload = () => {

}

$("body").on("mousedown", ".channelitem", (ef) => {
	$(".chatarea").show()

	try {
		if (currentuser.name === $(ef.currentTarget).text()) {
			return
		}
	} catch {

	}

	currentuser = {name: $(ef.currentTarget).text(), type: 1}

	if ($(ef.currentTarget).attr("target-chan")) {
		currentuser.title = currentuser.name
		currentuser.name = $(ef.currentTarget).attr("target-chan")
		currentuser.type = 0
		$(".channels").addClass("inchannel")
		$("#copyid").attr("data-clipboard-text", currentuser.name)
	} else {
		$(".channels").removeClass("inchannel")
	}

	$(ef.currentTarget).removeClass("unread")

	$(".channel").text($(ef.currentTarget).attr("target-user"))

	console.log("fick", currentuser.name)

	getmessages(currentuser);
})

$('.msgform').submit(e => {
	e.preventDefault()
	msg = $('#m').val()
	let time = bettertime(new Date());
	if (currentuser.type === 1) {
		socket.emit('message', {message: msg, user: currentuser.name, channeltype: 1});
	} else {
		socket.emit('message', {message: msg, user: currentuser.name, channelid: currentuser.name, channeltype: 0});
	}
	$('#messages').append($('<li>').html(`${time} <br>You: ${msg}`));
	$('#m').val('');
	$("#msgscroll")[0].scrollTo(0, $("#msgscroll")[0].scrollHeight)
	return false;
});

$("body").on("keyup", "#adduser-input", e => {
    if(e.keyCode == 13) {
		let intendeduser = $("#adduser-input").val();

		if (intendeduser == selfuser) {
			toastr["error"]("You can't add yourself!", "Error!")

			toastr.options = {
				"closeButton": false,
				"debug": false,
				"newestOnTop": false,
				"progressBar": false,
				"positionClass": "toast-bottom-right",
				"preventDuplicates": false,
				"onclick": null,
				"showDuration": "300",
				"hideDuration": "1000",
				"timeOut": "5000",
				"extendedTimeOut": "1000",
				"showEasing": "swing",
				"hideEasing": "linear",
				"showMethod": "fadeIn",
				"hideMethod": "fadeOut"
			}

			return;

		}

		adduser(intendeduser);
	}
});

$("body").on("keyup", "#makechan-input", e => {
    if(e.keyCode == 13) {
		let channame = $("#makechan-input").val();

		$.ajax({
			url : '/createchannel',
			type:"POST",
			data: {channelname: channame},
			success: data => {
				if (data.split("$$")[0] === "success") {
					channelid = data.split("$$")[1]
					full.push({id: channelid, name: channame, type: 0})
					$("#channels").append(`
					<div class="row channelitemrow">
						<div class="col-md-12 channelitem public" type="0" target-user="${channame}" target-chan="${channelid}">` + channame + `</div>
					</div>`)
					$(".chatarea").show()
					currentuser = {id: channelid, name: channame, type: 0}
					$('#messages').html("")
					$(".channel").text(channelid)
					
					$("#makechan-input").val("")
					addusertop.hide();
	
	
				}
			}
		});
	}
});

socket.on('pm', msg => {
	let response = msg['data'];
	let user = msg['from'];
	let time = bettertime(new Date(msg['time']));

	if (full.indexOf(user) != -1) {
		$('#messages').append($('<li>').html(`${time} <br>${user}: ${response}`));
		$("#msgscroll")[0].scrollTo(0, $("#msgscroll")[0].scrollHeight)
	} else {
		$("#channels").prepend(`
		<div class="row channelitemrow">
			<div class="col-md-12 channelitem unread" target-user="` + user + `">` + user + `</div>
		</div>`)
		full.push(user)
	}
});


socket.on('servermsg', msg => {
	let response = msg['data'];
	let user = msg['from'];
	let time = bettertime(new Date(msg['time']));

	if (user == selfuser) {
		return
	}

	$('#messages').append($('<li>').html(`${time} <br>${user}: ${response}`));
	$("#msgscroll")[0].scrollTo(0, $("#msgscroll")[0].scrollHeight)
});

socket.on('concurrent', full => {
	document.querySelector("#channels").innerHTML = ""

	console.log(full)
	for (var i in full) {
		targetchan = ""
		let publicz = ""

		if (full[i].type === 0) {
			targetchan = " target-chan='" + full[i].id + "'>"
			publicz = "public"
		} else {
			targetchan = ">"
		}


		$("#channels").append(`
		<div class="row channelitemrow">
			<div class="col-md-12 channelitem ${publicz}" target-user="${full[i].name}"${targetchan}${full[i].name}</div>
		</div>`)
	}
});

function bettertime(time) {
	let hours = time.getHours()
	let mins = time.getMinutes().toString()

	if (hours >= 12) {
		ampm = "PM"
		if (hours >= 14) {
			hours -= 12
		}
	} else {
		ampm = "AM"
		if (hours == 0) {
			hours += 12
		}
	}

	if (mins.length == 1) {
		mins = "0" + mins
	}

	return `Today at ${hours}:${mins} ${ampm}`



}