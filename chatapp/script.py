from flask import *
from flask_socketio import SocketIO, emit, join_room, leave_room, send
from flask_session import Session
import random
import json
import MySQLdb
import base64
import re
import os
import hashlib
import bcrypt
import time
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)
channels = []

SESSION_TYPE = 'filesystem'
app.config.from_object(__name__)
Session(app)

homepage = "index.html"

mydb = MySQLdb.connect(
    host="192.99.212.75",
    user="chatapp",
    passwd="sAnULny57jnT",
    port=3306,
    database="chatapp")

db = mydb.cursor()


def randomString(stringLength=10):
    letters = "abcdefghijklmnopqrstuvwxyz"
    return ''.join(random.choice(letters) for i in range(stringLength))


@app.route("/index_bundle.js")
def bundle():
    return send_from_directory('templates', "index_bundle.js")


@app.route("/add", methods=["POST"])
def add():
    username = session.get("user", False)
    userid = session.get("userid", False)
    added = request.form.get("user", False)

    if added == username:
        return "you"

    channelname = ";".join(sorted([username, added]))
    hashedname = hashlib.md5(channelname.encode()).hexdigest()

    query = "SELECT userid FROM users WHERE user='%s'"
    db.execute(query % added)
    addedid = db.fetchall()
    userexist = len(addedid) > 0

    try:
        addedid = addedid[0][0]
        userexist = True
    except IndexError:
        userexist = False

    try:
        query = "SELECT COUNT(*) FROM direct_%s"
        db.execute(query % (hashedname))
        channelexist = True
    except:
        channelexist = False

    if userexist:
        if not channelexist:
            query = 'CREATE TABLE IF NOT EXISTS direct_%s (message TEXT, date TEXT, userid TEXT, id INTEGER Primary Key auto_increment)'
            db.execute(query % hashedname)

            # query = 'insert into linkedchan values(%s, %s, %s, true)'
            # db.execute(query, (
            #     username,
            #     userid,
            #     channelname,
            # ))

            # query = 'insert into linkedchan values(%s, %s, %s, true)'
            # db.execute(query, (
            #     username,
            #     addedid,
            #     channelname,
            # ))

            mydb.commit()

            return "success"
        else:
            return "already"

    else:
        return "noexist"


@app.route("/online", methods=["POST"])
def mess():
    query = "select username, userid from linkedchan where ispm=0 and name like %s"
    db.execute(query, (channel + "%", ))
    result = db.fetchall()
    users = []

    for i in result:
        users.append({"name": i[0], "id": i[1]})


@app.after_request
def after_request(response):
    header = response.headers
    header['Access-Control-Allow-Origin'] = '*'
    header["Access-Control-Allow-Credentials"] = "true"
    header["Access-Control-Allow-Methods"] = "GET,HEAD,OPTIONS,POST,PUT"
    header[
        "Access-Control-Allow-Headers"] = "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers"
    return response


@app.route("/messages", methods=["POST"])
def messy():
    username = session.get("user", False)
    userid = session.get("userid", False)
    print("Okay, this is epic.", username, userid)
    if username:
        channel = request.form.get("channel", False)
        chantype = request.form.get("channeltype", False)
        limit = request.form.get("limit", 10)
        print("ggoo", channel, chantype)
        if not channel:
            return ""

        if chantype == "1":
            if channel.startswith(username +
                                  ";") or channel.endswith(";" + username):
                hashedname = hashlib.md5(channel.encode()).hexdigest()
                query = "select * from direct_" + hashedname + " order by id desc limit %s"
                db.execute(query, (int(limit), ))
                result = db.fetchall()[::-1]

                total = []

                for i in result:
                    isyou = i[2] == userid
                    compiled = {'data': i[0], 'you': isyou, 'time': i[1]}
                    total.append(compiled)

                print(total)
                total = {"messages": total, "members": []}
                return json.dumps(total)
            else:
                return "whoops"
        elif chantype == "0":
            print("eee", '"%s"' % channel)
            query = "select * from channel_" + channel + " order by id desc limit %s"
            db.execute(query, (int(limit), ))
            result = db.fetchall()[::-1]

            total = []

            for i in result:
                isyou = i[2].split("$$")[0] == userid
                compiled = {
                    'data': i[0],
                    'you': isyou,
                    'time': i[1],
                    'sender': i[2].split("$$")[1]
                }
                total.append(compiled)

            total = {"messages": total}

            print(total)
            return json.dumps(total)

    else:
        session.clear()
        return redirect("/")


@app.route('/')
def home():
    if session.get("user", False):
        return render_template(
            homepage,
            username=base64.b64encode(
                session.get("user", "undefined").encode()).decode(),
            userid=session.get("userid", "undefined"))
    else:
        return render_template("login.html")


@app.route("/register", methods=["POST"])
def register():
    username = request.form.get("user", False).lower()
    password = request.form.get("password", False)

    if username and password:
        query = "SELECT COUNT(*) FROM users WHERE user=%s"
        db.execute(query, (username, ))
        userexist = db.fetchall()[0][0] > 0

        if not userexist:
            salt = bcrypt.gensalt().decode()
            salted = salt + ";" + hashlib.sha512(
                (salt + password).encode()).hexdigest()
            userid = randomString(30)

            query = "insert into users values (%s, %s, %s)"
            db.execute(query, (
                username,
                salted,
                userid,
            ))
            mydb.commit()

            session['user'] = username
            session['userid'] = userid
            return redirect("/")
        else:
            return "User exists"
    else:
        return redirect("/")


@app.route("/login", methods=["POST"])
def login():
    username = request.form.get("user", False).lower()
    password = request.form.get("password", False)

    if username and password:
        query = "SELECT password, userid FROM users WHERE user=%s"
        db.execute(query, (username, ))
        storedpassword = db.fetchall()

        if len(storedpassword) > 0:

            storedsalt = storedpassword[0][0].split(";")[0]
            storedpass = storedpassword[0][0].split(";")[1]

            salted = hashlib.sha512(
                (storedsalt + password).encode()).hexdigest()

            if salted == storedpass and storedpassword[0][1]:
                print("a")
                session['user'] = username
                session['userid'] = storedpassword[0][1]
            else:
                return "Wrong username or password"
        else:
            return "Wrong username or password"
        return redirect("/")
    else:
        return redirect("/")


@app.route('/logout')
def logout():
    session.clear()
    return redirect("/")


@socketio.on('connect')
def connect():
    username = session.get("user", False)
    userid = session.get("userid", False)

    print("Okay, this is epic.", username, userid)

    print("connected")

    if username and userid:

        join_room(username)

        query = "select userid, name, ispm from linkedchan where userid = %s"
        db.execute(query, (userid, ))
        result = db.fetchall()
        # print(result)

        concurrent = []

        for i in result:
            if i[2] == 1:
                toapp = i[1].split(";")
                try:
                    toapp.remove(username)
                except:
                    pass
                concurrent.append({"name": toapp[0], "type": 1})
            elif i[2] == 0:
                toapp = i[1].split("$$")
                toapp1 = base64.b64decode(toapp[1].encode()).decode()
                try:
                    toapp.remove(username)
                except:
                    pass
                concurrent.append({"name": toapp1, "type": 0, "id": toapp[0]})
                join_room(toapp[0])

        emit("concurrent", {"data": concurrent, "user": username})

    else:
        session.clear()
        return redirect("/")


@socketio.on("message")
def msg(message):
    if not message:
        return

    if message.get("message") == "":
        return

    msg = message.get("message", False)
    user = message.get("user", False)
    chantype = message.get("channeltype", False)

    thisuser = session.get("user", "undefined")
    userid = session.get("userid", "undefined")
    timing = int(round(time.time() * 1000))

    query = "SELECT userid FROM users WHERE user='%s'"
    db.execute(query % added)
    sqlresult = db.fetchall()

    try:
        query = "SELECT COUNT(*) FROM direct_%s"
        db.execute(query % (hashedname))
    except:
        emit(
            "pmerror", {
                'intended': thisuser,
            },
            room=thisuser,
            json=True)
        return
        

    if chantype == 1:
        if message.get("webcall", False):
            print(json.loads(msg).keys(), "USER: ", user)
            emit(
                "pm", {
                    'data': msg,
                    'from': thisuser,
                    'time': timing,
                    'webcall': True
                },
                room=user,
                json=True)
        else:
            channelname = ";".join(sorted([user, thisuser]))
            hashedname = hashlib.md5(channelname.encode()).hexdigest()
            query = "insert into direct_" + hashedname + \
                " (message, date, userid) values (%s, %s, %s)"
            db.execute(query, (msg, str(timing), userid))
            mydb.commit()

            emit(
                "pm", {
                    'data': msg,
                    'from': thisuser,
                    'time': timing,
                },
                room=user,
                json=True)
    elif chantype == 0:
        # channelname = message.get("channelid", False)

        query = "insert into channel_" + user + \
            " (message, date, userid) values (%s, %s, %s)"
        db.execute(query, (msg, str(timing), userid + "$$" + thisuser))
        mydb.commit()

        emit(
            "servermsg", {
                'data': msg,
                'from': thisuser,
                'time': timing,
                'channel': user
            },
            room=user,
            json=True)


@app.route("/delete")
def delete():
    userid = session.get("userid", False)

    if userid:
        query = "delete from linkedchan where channelid in (select channelid where userid = %s)"
        db.execute(query, (userid, ))

        query = "delete from users where userid = %s"
        db.execute(query, (userid, ))

        query = "delete from users where userid = %s"
        db.execute(query, (userid, ))

        mydb.commit()

        session.clear()

        return redirect("/")


@app.route("/createchannel", methods=["POST"])
def create():
    username = session.get("user", False)
    userid = session.get("userid", False)
    channelname = request.form.get("channelname", False)

    if channelname and userid and username:
        channelid = randomString(29)

        query = 'CREATE TABLE IF NOT EXISTS channel_%s (message TEXT, date TEXT, userid TEXT, id INTEGER Primary Key auto_increment)'
        db.execute(query % channelid)

        query = 'insert into linkedchan values(%s, %s, %s, 0)'
        db.execute(query, (username, userid, channelid + "$$" +
                           base64.b64encode(channelname.encode()).decode()))

        query = 'insert into channels values(%s, %s, %s)'
        db.execute(query, (channelid, channelname, userid))

        mydb.commit()

        return 'success$$' + channelid
    else:
        return 'nologin'


@app.route("/join/<path:path>")
def join(path):

    channelid = path
    userid = session.get("userid", False)
    username = session.get("userid", False)

    query = 'select name from linkedchan where userid = %s'
    db.execute(query, (userid, ))
    result = db.fetchall()

    if not True in [i[0].startswith(channelid) for i in result]:

        query = "SELECT channelname FROM channels WHERE channelid=%s"
        db.execute(query, (channelid, ))
        result = db.fetchall()

        if len(result) > 0:
            query = 'insert into linkedchan values(%s, %s, %s, 0)'
            db.execute(query,
                       (username, userid, channelid + "$$" + base64.b64encode(
                           result[0][0].encode()).decode()))

            mydb.commit()

        return redirect("/")
    else:
        return "E"

@app.route("/acceptfriend")
def acceptfriend():
    query = 'insert into linkedchan values(%s, %s, %s, true)'
    db.execute(query, (
        username,
        userid,
        channelname,
    ))

    query = 'insert into linkedchan values(%s, %s, %s, true)'
    db.execute(query, (
        username,
        addedid,
        channelname,
    ))


if __name__ == '__main__':
    socketio.run(app, host="localhost", port=80, debug=True)
