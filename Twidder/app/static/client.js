/* when window object (page) is loaded */
window.onload=function(){

	getContent();

  /* hide notification to user when he or she starts to write sth */
  document.getElementById("pageBody").onkeydown=function(){
    clearMessages();
  }

  // onclick events for elements just in profile view
  if(localStorage.getItem("tokenID")!= null){
    if(document.getElementById('tab1').checked){
      tab1Func();
    }

  }
    
};


var liveInfo = {}
var myBarChart;
var barCreated = false;

function createStatistics(){
  
  var data = {
    labels: ["Online users", "Number of Views", "Number of Posts"],
    datasets: [
        {
            label: "Data",
            fillColor: "rgba(220,220,220,0.5)",
            strokeColor: "rgba(220,220,220,0.8)",
            highlightFill: "rgba(220,220,220,0.75)",
            highlightStroke: "rgba(220,220,220,1)",
            data: [liveInfo['onlineUsers'], liveInfo['numberOfViews'], liveInfo['numberOfPosts']]
        },
    ]
  };

  // Get the context of the canvas element we want to select
  var ctx = document.getElementById("myChart").getContext("2d");
  myBarChart = new Chart(ctx).Bar(data);
  barCreated = true;

// just redraw not create a new chart!!!

}

function fillStatistics(variable, value){
  myBarChart.datasets[0].bars[variable].value = value;
  // Would update the first dataset's value of 'March' to be 50
  myBarChart.update();
  // Calling update now animates the position of March from 90 to 50.
}


// ------------------------------------------------------
// ------------- SECURITY ------------------
//-- HMAC-SHA1
function generateHash(message, tokenID){

  var hmac = CryptoJS.HmacSHA1(message, tokenID);
  return hmac;
}

// -------------END OF SECURITY PART---------------------



// -------------------------------------------------------
// -------------------- DRAG AND DROP --------------------

function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function drop(ev) {
    ev.preventDefault();
    var data = ev.dataTransfer.getData("text");
    var textMsg = document.getElementById(data).innerHTML;
    //console.log(textMsg);
    ev.target.value = textMsg;
}

// -------------------------------------------------------

function logOutButton(){
  var tokenID = localStorage.getItem("tokenID");
  var pub_key = localStorage.getItem("email");
  var message = pub_key + tokenID;
  var hash = generateHash(message, tokenID);

  var serverResponse = ""
  var xhttp = createRequestObject();
  xhttp.open("POST", "/signout", true);
  xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  
  xhttp.onreadystatechange = function(){
    if (xhttp.readyState === 4){ 
      serverResponse = xhttp.responseText;
      //alert("LOGOUT - serverResponse" + serverResponse);
      var object = JSON.parse(serverResponse);
      //alert("LOGOUT - object.success: " + object.success);

      //all parametres as string
      //var object = serverstub.signOut(tokenID);
      if(object.success === 'true'){
        localStorage.removeItem("tokenID");
        localStorage.removeItem("email");
        sessionStorage.removeItem("searchedUser");
        getContent();
        writeToUser("<p>You've been successfully logged out.</p>", false);
      } //else should not ever happenned

    }
  };
  // email instead of tokenID!!!
  xhttp.send("pub_key=" + pub_key + "&hash=" + hash);
  //xhttp.send("token=" + tokenID);
  return false;
}




function createRequestObject(){

  var xhttp;
  if (window.XMLHttpRequest){
      xhttp = new XMLHttpRequest();
      } else {
      // code for IE6, IE5
      xhttp = new ActiveXObject("Microsoft.XMLHTTP");
  }
  return xhttp;
}


/* fill in information to profile template */
//email - whose profile we want to show
//viewID - ID of div where we want to store these information
function showProfileInformation(email, viewID){
  refreshTheWall(email);
  var userTemplate = document.getElementById("userTemplate");
  var userProfile = document.getElementById(viewID);
  userProfile.innerHTML = userTemplate.innerHTML;
}

/* fill in information about the user */
function fillInUserData(user){
  //alert("fillInUserData: " + user);
  var iFirstName = document.getElementById("iFirstName");
  iFirstName.innerHTML = user.firstname; 
  var iFamilyName = document.getElementById("iFamilyName");
  iFamilyName.innerHTML = user.familyname;
  var iGender = document.getElementById("iGender");
  iGender.innerHTML = user.gender;
  var iCity = document.getElementById("iCity");
  iCity.innerHTML = user.city;
  var iCountry = document.getElementById("iCountry");
  iCountry.innerHTML = user.country;
  var iEmail = document.getElementById("iEmail");
  iEmail.innerHTML = user.email;
}

/* refresh the wall (messages) */
function refreshTheWall(email){
  var wall = document.getElementById("wall");
  var wallContent = "<h3>WALL</h3>";
  var tokenID = localStorage.getItem("tokenID");
  var pub_key = localStorage.getItem("email");
  var message = pub_key + email + tokenID;
  var hash = generateHash(message, tokenID);

  var serverResponse = ""

  var xhttp = createRequestObject();
  xhttp.open("GET", "/getMessagesByEmail?pub_key=" + pub_key + "&email=" + email + "&hash=" + hash, true);

  xhttp.onreadystatechange = function(){
    if (xhttp.readyState === 4){ 
      serverResponse = xhttp.responseText;

      var object = JSON.parse(serverResponse);

      var messages = object.data;

      if (messages !== null){
        for (i = 0; i < messages.length; i++){ 
          var msgID = "msg" + i; 
          wallContent += "<strong>" + messages[i].writer + "</strong><br><p draggable=\"true\" ondragstart=\"drag(event)\" id=\"" + msgID + "\">" + messages[i].content + "</p>";
        }
      } 
      wall.innerHTML = wallContent;

    }
  };

  xhttp.send();

}

function post(tokenID, email, content, form){

  if(email != null){
    var pub_key = localStorage.getItem("email");
    var message = pub_key + content + email + tokenID;
    var hash = generateHash(message, tokenID);
    
    var serverResponse = "";
    xhttp = createRequestObject();
    xhttp.open("POST", "/post", true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    //var object = serverstub.postMessage(tokenID, form.post.value, email);

    xhttp.onreadystatechange = function(){
      if (xhttp.readyState === 4){ 
        serverResponse = xhttp.responseText;
        //alert("postMessage - serverResponse: " + serverResponse);
        var object = JSON.parse(serverResponse);
        //alert("postMessage - object.success:" + object.success);

        refreshTheWall(email);
        clearForms(form);

      }
    };

    xhttp.send("pub_key=" + pub_key + "&content=" + content + "&emailTo=" + email + "&hash=" + hash);
  }
  

}


/* post on a wall form */
function postOnWall(form){

  var email = null;
  // checking empty post
  if(form.post.value === ""){
    return false;
  }

  var tokenID = localStorage.getItem("tokenID");
  if(document.getElementById('tab1').checked){
    var pub_key = localStorage.getItem("email");
    var message = pub_key + tokenID;
    var hash = generateHash(message, tokenID);


    //I am posting on my wall
    var serverResponse = "";

    var xhttp = createRequestObject();
    xhttp.open("GET", "/getDataByToken?pub_key=" + pub_key + "&hash=" + hash, true);

    xhttp.onreadystatechange = function(){
      if (xhttp.readyState === 4){ 
        serverResponse = xhttp.responseText;
        //alert("postOnWall - serverResponse: " + serverResponse);
        var object = JSON.parse(serverResponse);
        //alert("postOnWall - object.success:" + object.success);

        email = object.data.email;
        post(tokenID, email, form.post.value, form);
        //alert("postOnWall - email:" + object.data.email);

      }
    };

    xhttp.send();
    //var user = serverstub.getUserDataByToken(tokenID);
  }else if(document.getElementById('tab2').checked){
    //I am posting on others wall
    email = sessionStorage.getItem("searchedUser");
    post(tokenID, email, form.post.value, form);
    // email of the user whose wall we are posting on
  }
  //alert("aaaaa");
  return false; 
}

/* search user form */
function searchUser(form){

  var tokenID = localStorage.getItem("tokenID");
  var pub_key = localStorage.getItem("email");
  var email = form.search.value;
  var message = pub_key + email + tokenID;
  var hash = generateHash(message, tokenID);

  // searched email should not be empty validated by html5
  /*if(form.search.value === ""){
    return false;
  }*/

  var serverResponse = "";

  var xhttp = createRequestObject();
  xhttp.open("GET", "/getDataByEmail?pub_key=" + pub_key + "&email=" + email + "&hash=" + hash, true);

  xhttp.onreadystatechange = function(){
    if (xhttp.readyState === 4){ 
      serverResponse = xhttp.responseText;
      var object = JSON.parse(serverResponse);

      if(object.success === 'false'){
        writeToUser("<p>User does not exist.</p>", false);
        sessionStorage.removeItem("searchedUser");
        document.getElementById("searchedProfile").style.display = 'none';
      }else{

        sessionStorage.setItem("searchedUser", object.data.email);
        //instead of tab2Func, added from there!
        fillSearchedUserProfile(object.data);
        //end of code added from tab2Func()
      }
      
      clearForms(form);
    }
  };

  xhttp.send();

  return false;
}

/* when first tab has been checked */
function tab1Func(){

  //console.log(liveInfo);
  if(barCreated == false){
    createStatistics();
  }else{
    myBarChart.update();
  }
  
  var profileTemplate = document.getElementById("userTemplate");
  var userProfile = document.getElementById("userProfile");  

  // delete content of searchedProfile
  var searchedProfile = document.getElementById("searchedProfile");
  searchedProfile.innerHTML = "";

  // fill in current data
  userProfile.innerHTML = profileTemplate.innerHTML;
  var tokenID = localStorage.getItem("tokenID");
  var pub_key = localStorage.getItem("email");
  var message = pub_key + tokenID;
  var hash = generateHash(message, tokenID);

  var serverResponse = ""

  var xhttp = createRequestObject();
  xhttp.open("GET", "/getDataByToken?pub_key=" + pub_key + "&hash=" + hash, true);
  //xhttp.open("GET", "/getDataByToken?token=" + tokenID, true);

  xhttp.onreadystatechange = function(){
    if (xhttp.readyState === 4){ 
      serverResponse = xhttp.responseText;
      var object = JSON.parse(serverResponse);
      var user = object.data;
      fillInUserData(user);
      refreshTheWall(user.email);
      clearMessages();
    }
  };

  xhttp.send();

}


function fillSearchedUserProfile(user){

  var profileTemplate = document.getElementById("userTemplate");
  // searchedProfile
  var searchedProfile = document.getElementById("searchedProfile");
  // userProfile
  var userProfile = document.getElementById("userProfile");

  document.getElementById("searchedProfile").style.display = 'block';
  userProfile.innerHTML = "";
  searchedProfile.innerHTML = profileTemplate.innerHTML;
  
  fillInUserData(user);
  refreshTheWall(user.email);
  clearMessages();
  
}


/* when second tab has been checked */
function tab2Func(){
  //show the user profile just if it is searched and hide it after tab change
  document.getElementById("searchedProfile").style.display = 'none';
}


/* get current view */
function getContent(){
  //console.log("getContent!!!");
	var tokenID = localStorage.getItem("tokenID");

  /* get IDs of all needed views */
	var welcomeView = document.getElementById("welcomeView");
	var profileView = document.getElementById("profileView");
	var view = document.getElementById("view");

	if(tokenID === null){
    // if no one is logged in
		view.innerHTML = welcomeView.innerHTML;
		document.getElementById("pageBody").style.backgroundColor = "#3498db";
	}else{
    // if a user is logged in
    //websocket initialization
    //console.log("get content");
    init();
		view.innerHTML = profileView.innerHTML;
    document.getElementById("tab1").checked = true;
		document.getElementById("pageBody").style.background = "#fff";
    if(document.getElementById('tab2').checked || document.getElementById('tab3').checked){
      document.getElementById("userMessages1").style.display = 'none';
    }   

	}
  document.getElementById("userMessages").style.display = 'none';
}


//--------------------------------------------------------------
//----- WEB SOCKET ---------------------------------------------

var wsUri = 'ws://127.0.0.1:5000/api';
var output;

function init()
{
  output = document.getElementById("output");
  testWebSocket();
}

function testWebSocket()
{
  websocket = new WebSocket(wsUri);
  websocket.onopen = function(evt) { onOpen(evt) };
  websocket.onclose = function(evt) { onClose(evt) };
  websocket.onmessage = function(evt) { onMessage(evt) };
  websocket.onerror = function(evt) { onError(evt) };
}

function onOpen(evt)
{
  console.log("CONNECTED");
  var tokenID = localStorage.getItem("tokenID");
  doSend(tokenID);
}

function onClose(evt)
{
  console.log("DISCONNECTED");
}

function onMessage(evt)
{
  var response = JSON.parse(evt.data);
  console.log('RESPONSE: ' + response);
  if(response == "log_out"){
    localStorage.removeItem("tokenID");
    localStorage.removeItem("email");
    sessionStorage.removeItem("searchedUser");
    getContent();
    writeToUser("<p>You've been logged out.</p>", false);
  }else{

    if(response.hasOwnProperty('onlineUsers')){
      //console.log("onlineUsers: " + response["onlineUsers"]);
      liveInfo['onlineUsers'] = response["onlineUsers"];
      if(document.getElementById('tab1').checked){
        //console.log("aaaaa_tab1");
        fillStatistics(0, liveInfo['onlineUsers']);
      } 
    }

    if(response.hasOwnProperty('numberOfPosts')){
      //console.log("numberOfPosts: " + response["numberOfPosts"]);
      liveInfo['numberOfPosts'] = response["numberOfPosts"];
      if(document.getElementById('tab1').checked){
        //console.log("aaaaa_tab1");
        fillStatistics(2, liveInfo['numberOfPosts']);
      } 
    } 

    if(response.hasOwnProperty('numberOfViews')){
      //console.log("numberOfViews: " + response["numberOfViews"]);
      liveInfo['numberOfViews'] = response["numberOfViews"];
      if(document.getElementById('tab1').checked){
        //console.log("aaaaa_tab1");
        fillStatistics(1, liveInfo['numberOfViews']);
      } 
    } 
  }   

  
}

function onError(evt)
{
  console.log('ERROR:' + evt.data);
}

function doSend(message)
{
  console.log("SENT: " + message);
  websocket.send(message);
}

function writeToScreen(message)
{
  var pre = document.createElement("p");
  pre.style.wordWrap = "break-word";
  pre.innerHTML = message;
  output.appendChild(pre);
}



//--------------------------------------------------------------- 



/* clear div with messages for user */
function clearMessages(){
	var userMessages = document.getElementById("userMessages");
	userMessages.innerHTML = "";
	userMessages.style.display = 'none';
  var tokenID = localStorage.getItem("tokenID");
  if(tokenID !== null){
    if(document.getElementById('tab2').checked || document.getElementById('tab3').checked){
      var userMessages1 = document.getElementById("userMessages1");
      userMessages1.innerHTML = "";
      userMessages1.style.display = 'none';
    }
  }
}

/* clear form after data are not needed anymore  */
function clearForms(form){

    // clearing inputs
    var inputs = form.getElementsByTagName('input');
    for (var i = 0; i<inputs.length; i++) {
        switch (inputs[i].type) {
            // case 'hidden':
            case 'text':
                inputs[i].value = '';
                break;
            case 'password':
            	inputs[i].value = '';
                break;
            case 'email':
            	inputs[i].value = '';
                break;
            case 'radio':
            case 'checkbox':
                inputs[i].checked = false;   
        }
    }

    // clearing selects
    var selects = form.getElementsByTagName('select');
    for (var i = 0; i<selects.length; i++)
        selects[i].selectedIndex = 0;

    //return false;
}

/* write notification to user */
function writeToUser(msg, pswd){
  if(pswd===true){
    var userMessages = document.getElementById("userMessages1");
    userMessages.innerHTML = msg;
    userMessages.style.display = 'block';
  }else{
    var userMessages = document.getElementById("userMessages");
    userMessages.innerHTML = msg;
    userMessages.style.display = 'block';
  }
  return true;
}

/* check if password is at least 6 characters long */
function checkPassword(password, pswd){
  if(password.length < 6){
    writeToUser("<p>Password must contain at least six characters!</p>", pswd);
    return false;
  }
  return true;
}

/* user is logged in */
function logIn(email, password){

  var serverResponse = "";
  var xhttp = createRequestObject();
  xhttp.open("POST", "/login", true);
  xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  

  xhttp.onreadystatechange = function(){
    if (xhttp.readyState === 4){ 
      serverResponse = xhttp.responseText;
      //alert("LOGIN - serverResponse" + serverResponse);
      var object = JSON.parse(serverResponse);
      //alert("LOGIN - object.success: " + object.success);

      //all parametres as string
      if(object.success === 'true'){
        //alert("LOGIN - object.data: " + object.data);
        localStorage.setItem("tokenID", object.data);
        localStorage.setItem("email", email);
        getContent();
        tab1Func();
      }else{
        writeToUser("<p>"+ object.message +"</p>", false);
      }

    }
  };

  xhttp.send("email=" + email + "&passwd=" + password);

}

/* log in form function */
function loginFunc(form){

  // check length of password
	if(checkPassword(form.passwd.value, false)===false){
      form.passwd.focus();
      return false;
   }
   
  // log in
  logIn(form.email.value,form.passwd.value);
 
  return false;
}


/* sign up form function */
function signupFunc(form){
  
  var flag = "";
  // check passwords
  if(form.pwd1.value === form.pwd2.value){
    // check length of password
    if(checkPassword(form.pwd1.value, false)===false){
      form.pwd1.focus();
      return false;
    }
  }else{
    writeToUser("<p>Please check that you've entered and confirmed your password!</p>", false);
    form.pwd1.focus();
    return false;
  }

  // creating object of user
  var user = {
          'email': form.mail.value,
          'password': form.pwd1.value,
          'firstname': form.firstname.value,
          'familyname': form.familyname.value,
          'gender': form.gender.value,
          'city': form.city.value,
          'country': form.country.value,
        };


  var serverResponse = ""
  var xhttp = createRequestObject();
  xhttp.open("POST", "/signup", true);
  xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  

  xhttp.onreadystatechange = function(){
    if (xhttp.readyState === 4){ 
      serverResponse = xhttp.responseText;
      //alert("signup - serverResponse" + serverResponse);
      var object = JSON.parse(serverResponse);
      //alert("signUp - object.success: " + object.success);


      // in case of success
      if(object.success === 'true'){
        // log in user
        logIn(user.email,user.password);

      }else{
        writeToUser("<p>" + object.message + "</p>", false);
      }

    }
  };

  xhttp.send("mail=" + user.email + "&pwd1=" + user.password + 
    "&firstname=" + user.firstname + "&familyname=" + user.familyname + "&gender=" + user.gender + 
    "&city=" + user.city + "&country=" + user.country);

  // call server function
  //var object = serverstub.signUp(user);
  return false;
}

/* change password form function */
function changePSWForm(form){

	var tokenID = localStorage.getItem("tokenID");
  var pub_key = localStorage.getItem("email");
  var message = pub_key + form.pswd1.value + form.pswd2.value + tokenID;
  var hash = generateHash(message, tokenID);

  // check passwords
  if(form.pswd2.value != "" && form.pswd2.value == form.pswd3.value){
    // check length of password
    if(checkPassword(form.pswd2.value, true)===false) {
      form.pswd2.focus();
      return false;
    }
  }else{
    writeToUser("<p>Please check that you've entered and confirmed your password!</p>", true);
    form.pswd2.focus();
    return false;
  }
  // call server function
  // var object = serverstub.changePassword(tokenID, form.pswd1.value, form.pswd2.value);

  var serverResponse = ""
  var xhttp = createRequestObject();
  xhttp.open("POST", "/change", true);
  xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  

  xhttp.onreadystatechange = function(){
    if (xhttp.readyState === 4){ 
      serverResponse = xhttp.responseText;
      //alert("signup - serverResponse" + serverResponse);
      var object = JSON.parse(serverResponse);
      //alert("signUp - object.success: " + object.success);

      // write notification to user about success or failure
      writeToUser("<p>" + object.message + "</p>", true);
      clearForms(form);

    }
  };

  xhttp.send("pub_key=" + pub_key + "&pswd1=" + form.pswd1.value + "&pswd2=" + form.pswd2.value + "&hash=" + hash);

  return false;
}

/* reload wall */
function reloadFunction(form){

  var tokenID = localStorage.getItem("tokenID");
  var pub_key = localStorage.getItem("email");
  var message = pub_key + tokenID;
  var hash = generateHash(message, tokenID);

  // first tab (my profile)
  if(document.getElementById('tab1').checked){

    var serverResponse = ""

    var xhttp = createRequestObject();
    xhttp.open("GET", "/getDataByToken?pub_key=" + pub_key + "&hash=" + hash, true);
    //xhttp.open("GET", "/getDataByToken?token=" + tokenID, true);

    xhttp.onreadystatechange = function(){
      if (xhttp.readyState === 4){ 
        serverResponse = xhttp.responseText;
        //alert("postOnWall - serverResponse: " + serverResponse);
        var object = JSON.parse(serverResponse);
        //alert("postOnWall - object.success:" + object.success);

        email = object.data.email;
        //var user = serverstub.getUserDataByToken(tokenID);
        refreshTheWall(email);


      }
    };

    xhttp.send();
    return false;

  }else{
    // second tab (searched profile)
    var email = sessionStorage.getItem("searchedUser");
    if(email != null){
      refreshTheWall(email);
    }
  }
  return false;
}









