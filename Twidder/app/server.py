#!/usr/bin/python
##!flask/bin/python
# -*- coding: utf-8 -*-

from gevent import pywsgi
from geventwebsocket.handler import WebSocketHandler
from flask import Flask
from flask import render_template, flash, redirect, request
import json
import database_helper as db

app = Flask(__name__, static_url_path='')
app.config.from_object('config')
app.debug = True

runningWS = {} #tokenID: ws


@app.route('/')
@app.route('/index')
def index():
    #return "Welcome to Twidder"
    return app.send_static_file('client.html')


@app.route('/api')
def api():
    if request.environ.get('wsgi.websocket'):
        ws = request.environ['wsgi.websocket']
        while True:
            try: 
                tokenID = ws.receive()
                runningWS[tokenID] = ws

                #get once the statistical information here !!!! (at the beginning)
                success, message, user = db.DB_get_user_data_by_token(tokenID)
                email = user['email'] 
                tmpObject = {}


                #prepare data
                onlineUsers = db.getNumberOfOnlineUsers()
                numberOfPosts = db.getNumberOfPost(email)
                numberOfViews = db.getNumberOfViews(email)

                tmpObject['onlineUsers'] = onlineUsers
                tmpObject['numberOfPosts'] = numberOfPosts
                tmpObject['numberOfViews'] = numberOfViews
                JSONobject = json.dumps(tmpObject)

                try: 
                    #send
                    ws.send(JSONobject)
                except:
                    print "api: websocket closed"

            except:
                break
    return app.send_static_file('client.html')

#done
@app.route('/login', methods=['POST'])
def sign_in():
#email, password

    email = request.form['email']
    password = request.form['passwd'] 
    
    tmpObject = {}

    success, token, flag, loggedIn = db.DB_log_in(email, password)

    if success == True:
        if flag == True:
            #send loggedIn to user to sign the user out from other browsers
            if loggedIn in runningWS:
                ws = runningWS[loggedIn]
                try:
                    ws.send("log_out")
                    ws.close()
                except:
                    print "login1: websocket closed"
                # do in all cases either id error is catched or not 
                del runningWS[loggedIn]

        #send the information to all online users!!!


        #prepare the information
        onlineUsers = db.getNumberOfOnlineUsers()
        tmpObject['onlineUsers'] = onlineUsers
        JSONobject = json.dumps(tmpObject)

        if runningWS:
            for key,value in runningWS.items():
                if key:
                    ws = runningWS[key]
                    try:
                        ws.send(JSONobject)
                    except:
                        print "login2: websocket closed ", key


        tmpObject['data'] = token
        tmpObject['message'] = 'Successfully signed in.'
        tmpObject['success'] = 'true'
    else:
        tmpObject['message'] = 'Wrong username or password.'
        tmpObject['success'] = 'false'

    JSONobject = json.dumps(tmpObject)

    return JSONobject



#done
@app.route('/signup', methods=['POST'])
def sign_up():
    #/<email>/<password>/<firstname>/<familyname>/<gender>/<city>/<country>

    email = request.form['mail']
    password = request.form['pwd1'] 
    firstname = request.form['firstname']
    familyname = request.form['familyname']
    gender = request.form['gender']
    city = request.form['city']
    country = request.form['country']

    tmpObject = {}

    if email:
        success = db.DB_sign_up(firstname, familyname, gender, city, country, email, password)
        #print success

        if success == True:
            tmpObject['message'] = 'Successfully created a new user.'
            tmpObject['success'] = 'true'
        else:
            tmpObject['message'] = 'User already exists.'
            tmpObject['success'] = 'false'
    else:
        tmpObject['message'] = 'Form data missing or incorrect type.'
        tmpObject['success'] = 'false'

    JSONobject = json.dumps(tmpObject)

    return JSONobject

#done
@app.route('/signout', methods=['POST'])
def sign_out():
    #/<token>
    #var message = pub_key + tokenID;
    
    pub_key = request.form['pub_key']
    hashReceived = request.form['hash']
    parameters = [pub_key]
    trust, token = db.authenticate_request(pub_key, parameters, hashReceived)

    tmpObject = {}

    if trust == True:

        success = db.DB_log_out(token)
        if token in runningWS:
            ws = runningWS[token]
            # do in all cases either id error is catched or not 
            del runningWS[token]
            try:
                ws.close()
            except:
                print "signout1: websocket closed"

        #again send all the online users the number of currently online users
        #prepare the information
        onlineUsers = db.getNumberOfOnlineUsers()
        tmpObject['onlineUsers'] = onlineUsers
        JSONobject = json.dumps(tmpObject)

        if runningWS:
            for key,value in runningWS.items():
                if key:
                    ws = runningWS[key]
                    try:
                        ws.send(JSONobject)
                    except:
                        print "signout2: websocket closed ", key


        if success == True:
            tmpObject['message'] = 'Successfully signed out.'
            tmpObject['success'] = 'true'
        else:
            tmpObject['message'] = 'You are not signed in.'
            tmpObject['success'] = 'false'

    else:

        tmpObject['message'] = 'I do not trust you.'
        tmpObject['success'] = 'false'
    
    JSONobject = json.dumps(tmpObject)
    return JSONobject


#done
@app.route('/change', methods=['POST'])
def change_password():
    #/<token>/<old_password>/<new_password>
    #var message = pub_key + form.pswd1.value + form.pswd2.value + tokenID;

    old_password = request.form['pswd1']
    new_password = request.form['pswd2']

    pub_key = request.form['pub_key']
    hashReceived = request.form['hash']
    parameters = [pub_key, old_password, new_password]
    trust, token = db.authenticate_request(pub_key, parameters, hashReceived)

    tmpObject = {}

    if trust == True:

        success, message = db.DB_change_pswd(token, old_password, new_password)
        tmpObject['message'] = message

        if success == True:
            tmpObject['success'] = 'true'
        else:
            tmpObject['success'] = 'false'

    else:
        tmpObject['message'] = 'I do not trust you.'
        tmpObject['success'] = 'false'
    
    JSONobject = json.dumps(tmpObject)
    return JSONobject

#done
@app.route('/getDataByToken', methods=['GET'])
def get_user_data_by_token():
#/<token>
#var message = pub_key + tokenID;

    tmpObject = {}

    pub_key = request.args['pub_key']
    hashReceived = request.args['hash']
    parameters = [pub_key]
    trust, token = db.authenticate_request(pub_key, parameters, hashReceived)

    if trust == True:
        success, message, user = db.DB_get_user_data_by_token(token)
        
        tmpObject['data'] = user
        tmpObject['message'] = message

        if success == True:
            tmpObject['success'] = 'true'
        else:
            tmpObject['success'] = 'false'

    else:
        tmpObject['message'] = 'I do not trust you.'
        tmpObject['success'] = 'false'
    
    JSONobject = json.dumps(tmpObject)
    return JSONobject

# done
@app.route('/getDataByEmail', methods=['GET'])
def get_user_data_by_email():
#/<token>/<email>
#var message = pub_key + email + tokenID;

    email = request.args['email']

    tmpObject = {}

    pub_key = request.args['pub_key']
    hashReceived = request.args['hash']
    parameters = [pub_key, email]
    trust, token = db.authenticate_request(pub_key, parameters, hashReceived)
    #print "trust: ", trust

    if trust == True:

        success, message, user, tokenMsg, dataMsg = db.DB_get_user_data_by_email(token, email, True)
        
        #prepare the information
        tmpMsg = {}
        tmpMsg['numberOfViews'] = db.getNumberOfViews(email)
        #tmpObject['numberOfViews'] = dataMsg
        JSONmessage = json.dumps(tmpMsg)

        #send new data to user who is interested...
        if tokenMsg in runningWS:
            ws = runningWS[tokenMsg]
            try:
                ws.send(JSONmessage)
            except:
                print "getDataByEmail: websocket closed", tokenMsg

        tmpObject = {}
        tmpObject['data'] = user
        tmpObject['message'] = message

        if success == True:
            tmpObject['success'] = 'true'
        else:
            tmpObject['success'] = 'false'

    else:

        tmpObject['message'] = 'I do not trust you.'
        tmpObject['success'] = 'false'
    
    JSONobject = json.dumps(tmpObject)
    return JSONobject

#done
@app.route('/getMessagesByToken', methods=['GET'])
def get_user_messages_by_token():
#/<token>

    pub_key = request.args['pub_key']
    hashReceived = request.args['hash']
    parameters = [pub_key]
    trust, token = db.authenticate_request(pub_key, parameters, hashReceived)

    tmpObject = {}

    if trust == True:

        success, message, messages = db.DB_get_user_messages_by_token(token)

        tmpObject['data'] = messages
        tmpObject['message'] = message

        if success == True:
            tmpObject['success'] = 'true'
        else:
            tmpObject['success'] = 'false'

    else:

        tmpObject['message'] = 'I do not trust you.'
        tmpObject['success'] = 'false'
    
    JSONobject = json.dumps(tmpObject)
    return JSONobject

#done
@app.route('/getMessagesByEmail', methods=['GET'])
def get_user_messages_by_email():
#/<token>/<email>
#var message = pub_key + email + tokenID;

    email = request.args['email']

    pub_key = request.args['pub_key']
    hashReceived = request.args['hash']
    parameters = [pub_key, email]
    trust, token = db.authenticate_request(pub_key, parameters, hashReceived)

    tmpObject = {}

    if trust == True:

        success, message, messages = db.DB_get_user_messages_by_email(token, email)
        
        tmpObject['data'] = messages
        tmpObject['message'] = message

        if success == True:
            tmpObject['success'] = 'true'
        else:
            tmpObject['success'] = 'false'

    else:

        tmpObject['message'] = 'I do not trust you.'
        tmpObject['success'] = 'false'
    

    JSONobject = json.dumps(tmpObject)
    return JSONobject

#done
@app.route('/post', methods=['POST'])
def post_message():
    #/<token>/<message>/<email>
    #var message = pub_key + content + email + tokenID;

    content = request.form['content']
    email = request.form['emailTo']

    pub_key = request.form['pub_key']
    hashReceived = request.form['hash']
    parameters = [pub_key, content, email]
    trust, token = db.authenticate_request(pub_key, parameters, hashReceived)

    #trust = True
    tmpObject = {}

    if trust == True:
    
        success, message, flag, tokenMsg = db.DB_post_message(token, content, email)

        if flag == True:
            #prepare the information
            tmpMsg = {}
            tmpMsg['numberOfPosts'] = db.getNumberOfPost(email)
            #tmpObject['numberOfViews'] = dataMsg
            JSONmessage = json.dumps(tmpMsg)

            #send new data to user who is interested...
            if tokenMsg in runningWS:
                ws = runningWS[tokenMsg]
                try:
                    ws.send(JSONmessage)
                except:
                    print "post: websocket closed"

        tmpObject = {}
        tmpObject['message'] = message

        if success == True:
            tmpObject['success'] = 'true'
        else:
            tmpObject['success'] = 'false'

    else:

        tmpObject['message'] = 'I do not trust you.'
        tmpObject['success'] = 'false'
    

    JSONobject = json.dumps(tmpObject)
    return JSONobject

if __name__ == '__main__':
    
    http_server = pywsgi.WSGIServer(('', 5000), app, handler_class=WebSocketHandler)
    http_server.serve_forever()







