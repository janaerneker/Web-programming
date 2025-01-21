from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello_world():
    return 'Hello World!'

"""
Description:​Authenticates the username by the provided password.
Input:​Two string values representing the username (email address) and password.
Returned data: A text string containing a randomly generated access token if the authentication is
successful.
"""
@app.route('/')
def sign_in(email, password):
    return 'Hello World!'

if __name__ == '__main__':
    app.run()