var socket = io();

$('.msgform').submit(function(e){
	e.preventDefault()
	msg = $('#m').val()
	socket.emit('message', msg);
	console.log(msg)
	$('#m').val('');
	return false;
});

$('.msgchannel').submit(function(e){
	e.preventDefault()
	msg = $('#c').val()
	socket.emit('channel', msg);
	console.log(msg)
	$('#c').val('');
	return false;
});

socket.on('new', function(msg){
	response = msg['data']
	user = msg['user']
	$('#messages').append($('<li>').text(user + ": " + response));
});

socket.on('change', function(msg){
	channel = msg['data']
	$('.channel').text(channel)
});