from flask import *
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_session import Session
import random

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)
channels = []

SESSION_TYPE = 'redis'
app.config.from_object(__name__)
Session(app)


def randomString(stringLength=10):
	letters = "abcdefghijklmnopqrstuvwxyz"
	return ''.join(random.choice(letters) for i in range(stringLength))

@app.route('/')
def home():
	if session.get("key", False):
		return render_template("index.html", room=session.get("room", "mains"))
	else:
		return render_template("login.html")

@app.route("/login", methods=["POST"])
def login():
	if not session.get("key", False):
		username = request.form.get("user", False).lower()
		if username:
			session['user'] = request.form.get("user", False).lower()
			session['key'] = randomString(69)
			session['room'] = "mains"
			return redirect("/")
		else:
			session.clear()
			return redirect("/")
		

@app.route('/logout')
def logout():
	session.clear()
	return redirect("/")


@socketio.on('connect')
def connect():
	 print("CONNECTED")
	 join_room(session.get("room", "mains"))


@socketio.on("message")
def msg(message):
	if session.get("key", False):
		msg = message
		user = session.get("user", "undefined")
		if session.get("room", "mains") == "mains":
			join_room("mains")
			emit('new', {'data': message, 'user': user}, room="mains")
			print(user)
		else:
			print(session.get("room", "mains"))
			join_room(session.get("room", "mains"))
			emit('new', {'data': message, 'user': user}, room=session.get("room", "mains"))
	else:
		session.clear()

@socketio.on("channel")
def chnl(channel):
	channel = channel.lower()
	if session.get("key", False):
		print(channels)
		if channel == "mains":
			user = session.get("user", "undefined")
			join_room("mains")
			session["room"] = "mains"
			emit('change', {'data': "mains"})
		else:
			if True in [channel in i for i in channels] and channel != session.get("user", False):
				user = session.get("user", "undefined")
				roomname = ";".join( sorted([user, channel]) )
				print(roomname)
				join_room(roomname)
				session["room"] = roomname
				emit('change', {'data': channel})
			elif channel != session.get("user", False):
				user = session.get("user", "undefined")
				roomname = ";".join( sorted([user, channel]) )
				channels.append(sorted([user, channel]))
				print(roomname)
				join_room(roomname)
				session["room"] = roomname
				emit('change', {'data': channel})
	else:
		session.clear()
		return redirect("/")

if __name__ == '__main__':
	socketio.run(app, host="149.56.100.99", port=5040, debug=True)
