#!/usr/bin/python
# -*- coding: utf-8 -*-

import sqlite3 as lite
import sys
import math
import random
import hmac
import hashlib
from flask.ext.bcrypt import Bcrypt
from server import app
bcrypt = Bcrypt(app)

sqlite_file = 'twidder_db.sqlite'
init_sql_script = 'init_database.sql'


#numberOfViews = {} #tokenID: numberOfViews

class OperationalError(Exception):
    def __init__(self, value):
        self.value = value
        def __str__(self):
            return repr(self.value)

def connect(sqlite_file):
    """ Make connection to an SQLite database file """
    conn = lite.connect(sqlite_file)
    c = conn.cursor()
    return conn, c

def close(conn):
    """ Commit changes and close connection to the database """
    # conn.commit()
    conn.close()

def init():
    """ Create tables and initialize the database """

    conn, c = connect(sqlite_file)

    # Open and read the file as a single buffer
    fd = open(init_sql_script, 'r')
    sqlFile = fd.read()
    fd.close()

    # all SQL commands (split on ';')
    sqlCommands = sqlFile.split(';')

    # Execute every command from the input file
    for command in sqlCommands:
        # This will skip and report errors
        # For example, if the tables do not yet exist, this will skip over
        # the DROP TABLE commands
        try:
            c.execute(command)
            conn.commit()
        except OperationalError, command:
            print "Command skipped: ", command
    close(conn)

def find_user(email):
    """ find user in DB """
    conn, c = connect(sqlite_file)
    
    c.execute("SELECT * FROM Users WHERE Email=?", [email])
    tmpUser = c.fetchall()

    if tmpUser: 
        success = True
        user = {'email': email, 'password': tmpUser[0][1], 'firstname': tmpUser[0][2], 'familyname': tmpUser[0][3], \
                'gender': tmpUser[0][4], 'city': tmpUser[0][5], 'country': tmpUser[0][6]};
    else:
        success = False
        user = None

    return success, user

def authenticate_request(pub_key, parameters, hashReceived):

    # create message
    message = ""

    for i in range(len(parameters)):
        message = message + parameters[i]
    
    conn, c = connect(sqlite_file)
    
    #get the private key
    c.execute("SELECT * FROM Signed_in WHERE Email=?", [pub_key])
    tmpData = c.fetchall()
    close(conn)

    if tmpData: 
        tokenID = tmpData[0][0]
        message = message + tokenID

        #just for now
        hashMessage = hmac.new(str(tokenID), str(message), digestmod=hashlib.sha1).hexdigest()
        if hashReceived == hashMessage:
            success = True
        else:
            print "hash is not equal"
            success = False
    else:
        success = False


    return success, tokenID


def check_user_logged_in(tokenID):

    conn, c = connect(sqlite_file)
    
    c.execute("SELECT * FROM Signed_in WHERE Token=?", [tokenID])
    tmpData = c.fetchall()
    close(conn)

    if tmpData: 
        success = True
        email = tmpData[0][1]
    else:
        success = False
        email = None
        
    return success, email

def getNumberOfOnlineUsers():

    conn, c = connect(sqlite_file)

    c.execute("SELECT Count(*) FROM Signed_in")

    tmpData = c.fetchone()
    close(conn)

    if tmpData:
        data = tmpData[0]
    else:
        data = None

    return data

#on the wall of user identified by email
def getNumberOfPost(email):

    conn, c = connect(sqlite_file)

    c.execute("SELECT Count(*) FROM Messages WHERE EmailTo=?", [email])
    tmpData = c.fetchone()
    close(conn)

    if tmpData:
        data = tmpData[0]
    else:
        data = None

    return data

def getNumberOfViews(email):

    conn, c = connect(sqlite_file)

    c.execute("SELECT Number_of_Views FROM Users WHERE Email=?", [email])
    tmpData = c.fetchall()
    close(conn)

    if tmpData:
        data = tmpData[0][0]
    else:
        data = None

    return data


def remove_user_from_signed_in(email):
    """ check if user is already signed in by email """

    flag = False
    tokenID = None
    conn, c = connect(sqlite_file)
    
    c.execute("SELECT * FROM Signed_in WHERE Email=?", [email])
    tmpData = c.fetchall()

    if tmpData: 
        flag = True
        tokenID = tmpData[0][0]
        #print "tmpData: "
        #print tmpData[0][0]
        c.execute("DELETE FROM Signed_in WHERE Email=?", [email])
        conn.commit()
        
    close(conn)
    return flag, tokenID


def DB_get_user_data_by_email(tokenID, email, flagCount):
    """ Get user data by email """

    tokenMsg = None
    dataMsg = None
    #check if user is logged in
    loggedIn, tmpEmail = check_user_logged_in(tokenID)

    if loggedIn == False:
        return False, 'You are not signed in.', None, None, None

    success, user = find_user(email)

    if success == True:

        if flagCount == True:
            conn, c = connect(sqlite_file)
            c.execute("SELECT Number_of_Views FROM Users WHERE Email=?", [email])
            tmpData = c.fetchall()

            if tmpData:
                newNumber = tmpData[0][0]+1

                c.execute("UPDATE Users SET Number_of_Views=? WHERE Email=?", (newNumber, email))
                conn.commit() 

                # number of views + 1
                # if email in numberOfViews:
                #     tmpData = numberOfViews[email]
                #     numberOfViews[email] = tmpData + 1
                # else:
                #     numberOfViews[email] = 1

                #find token of that user and send him new data
                
                c.execute("SELECT * FROM Signed_in WHERE Email=?", [email])
                tmpData = c.fetchall()
                close(conn)

                if tmpData: 
                    tokenMsg = tmpData[0][0]
                    dataMsg = newNumber  
        
        message = 'User data retrieved.'
        del user['password'];
    else:
        message = 'No such user.'

    return success, message, user, tokenMsg, dataMsg

def DB_get_user_data_by_token(tokenID):
    """ Get user data by token """

    #check if user is logged in and get his email
    loggedIn, email = check_user_logged_in(tokenID)

    if loggedIn == False:
        return False, 'You are not signed in.', None
    else:
        success, message, user, tokenMsg, dataMsg = DB_get_user_data_by_email(tokenID, email, False)

    return success, message, user


def DB_log_in(email, password):
    """ User log in """

    #find user in database by email 
    flag = False
    loggedIn = None
    success, user = find_user(email)

    if success == True:
        #user found -> checking password
        pw_hash = user['password'] 
        if bcrypt.check_password_hash(pw_hash, password) == True:
            #random token
            token = ""
            letters = "abcdefghiklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
            for i in range(0, 36):
                token += letters[random.randint(0,len(letters)-1)];

            #maybe user has been already logged in
            flag, loggedIn = remove_user_from_signed_in(email)

            #add user to Signed_in
            conn, c = connect(sqlite_file)
            c.execute("INSERT INTO Signed_in VALUES(?, ?)", (token, email))
            conn.commit()
            close(conn)
            success = True

        else:
            #passwords does not match
            return False, None, False, None
    else:
        #user not found 
        return False, None, False, None
        
    return success, token, flag, loggedIn 


def DB_sign_up(firn, famn, gen, city, country, mail, pswd):
    """ User sign up """

    #check if the mail is unique, if yes insert new user to Users table
    success, user = find_user(mail)
 
    if success == True:
        return False
    else:
        #hash the password
        pw_hash = bcrypt.generate_password_hash(pswd)
        newUser = (mail, pw_hash, firn, famn, gen, city, country, 0)
        conn, c = connect(sqlite_file)
        c.execute("INSERT INTO Users VALUES(?, ?, ?, ?, ?, ?, ?, ?)", (newUser))
        conn.commit()
        close(conn)
        #log in the user?
        return True


def DB_log_out(tokenID):
    """ User log out """
    
    #if found => remove from Signed_in table, success true
    loggedIn, email = check_user_logged_in(tokenID)

    if loggedIn == True:
        conn, c = connect(sqlite_file)
        c.execute("DELETE FROM Signed_in WHERE Token=?", [tokenID])
        conn.commit()
        close(conn)

        success = True
    else:
        success = False

    return success


def DB_change_pswd(tokenID, oldPSW, newPSW):
    """ Change user password """
    
    #check if user is logged in and get his email
    loggedIn, email = check_user_logged_in(tokenID)

    if loggedIn == False:
        return False, 'You are not logged in.'

    #find user
    success, user = find_user(email)

    #if not found or oldPSW doesn't match pswd in db => success false

    #if not found
    if success == False:
        return False, 'No such user.'
    else:
        pw_hash = user['password'] 
        if bcrypt.check_password_hash(pw_hash, oldPSW) == True:
            #change password in DB
            #hash the password
            pw_new_hash = bcrypt.generate_password_hash(newPSW)
            conn, c = connect(sqlite_file)
            c.execute("UPDATE Users SET Password=? WHERE Email=?", (pw_new_hash, user['email']))
            conn.commit()
            close(conn)
            return True, 'Password changed.'
        else:
            return False, 'Wrong password.'

def DB_get_user_messages_by_email(tokenID, email):
    """ Get user messages by email """

    #check if user is logged in
    success, emailFrom = check_user_logged_in(tokenID)

    if success==False:
        return False, 'You are not signed in.', None

    success, user = find_user(email)

    if success==False:
        return False, 'No such user.', None

    conn, c = connect(sqlite_file)
    c.execute("SELECT EmailFrom, Content FROM Messages WHERE EmailTo=?", [email])
    tmpMessages = c.fetchall()
    close(conn)

    if tmpMessages:
        messages = []
        for msg in tmpMessages:
            tmpMsg = {}
            tmpMsg['writer'] = msg[0]
            tmpMsg['content'] = msg[1]
            messages.insert(0,tmpMsg)
    else:
        messages = None

    return True, 'User messages retrieved.', messages

def DB_get_user_messages_by_token(tokenID):
    """ Get user messages by token """

    #check if user is logged in
    success, email = check_user_logged_in(tokenID)

    if success==False:
        return False, 'You are not signed in.', None

    return DB_get_user_messages_by_email(tokenID, email)



def DB_post_message(tokenID, content, emailTo):
    """ Post message on the wall """

    #check the user is signed in
    loggedIn, emailFrom = check_user_logged_in(tokenID)

    if loggedIn == False:
        return False, 'You are not signed in.', False, None
    
    success, user = find_user(emailTo)
    if success == False:
        return False, 'No such user.', False, None

    conn, c = connect(sqlite_file)
    c.execute("INSERT INTO Messages(EmailFrom, Content, EmailTo) VALUES(?, ?, ?)", (emailFrom, content, emailTo))
    conn.commit()

    #if user emailTo is online => find him in Signed_in table
    c.execute("SELECT * FROM Signed_in WHERE Email=?", [emailTo])
    tmpData = c.fetchall()
    close(conn)

    if tmpData: 
        tokenID = tmpData[0][0]
        flag = True

    return True, 'Message posted', flag, tokenID
    


