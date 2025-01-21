/* when window object (page) is loaded */
window.onload=function(){

	var view = getContent();

  /* hide notification to user when he or she starts to write sth */
  document.getElementById("pageBody").onkeydown=function(){
    clearMessages();
  }

  // onclick events for elements just in profile view
  if(localStorage.getItem("tokenID")!= null){
  	document.getElementById("logOut").onclick=function(){
      var tokenID = localStorage.getItem("tokenID");
  		var object = serverstub.signOut(tokenID);
  		if(object.success === true){
  			localStorage.removeItem("tokenID");
        sessionStorage.removeItem("searchedUser");
  			getContent();
        writeToUser("<p>You've been successfully logged out.</p>");
  		} //else should not ever happenned
    }

    if(document.getElementById('tab1').checked){
      tab1Func();
    }

  }
    
};

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
  var iFirstName = document.getElementById("iFirstName");
  iFirstName.innerHTML = user.data.firstname; 
  var iFamilyName = document.getElementById("iFamilyName");
  iFamilyName.innerHTML = user.data.familyname;
  var iGender = document.getElementById("iGender");
  iGender.innerHTML = user.data.gender;
  var iCity = document.getElementById("iCity");
  iCity.innerHTML = user.data.city;
  var iCountry = document.getElementById("iCountry");
  iCountry.innerHTML = user.data.country;
  var iEmail = document.getElementById("iEmail");
  iEmail.innerHTML = user.data.email;
}

/* refresh the wall (messages) */
function refreshTheWall(email){
  var wall = document.getElementById("wall");
  var wallContent = "<h3>WALL</h3>";
  var tokenID = localStorage.getItem("tokenID");
  var object = serverstub.getUserMessagesByEmail(tokenID, email);

  /*if(object.success === false){
    // this case should not ever happenned
    //console.log("STH is wrong");
    return false;
  }*/

  var messages = object.data;

  for (i = 0; i < messages.length; i++){ 
    wallContent += "<strong>" + messages[i].writer + "</strong><br><p>" + messages[i].content + "</p>";
  }

  wall.innerHTML = wallContent;
}

/* post on a wall form */
function postOnWall(form){

  // checking empty post
  if(form.post.value === ""){
    return false;
  }

  var tokenID = localStorage.getItem("tokenID");
  if(document.getElementById('tab1').checked){
    //I am posting on my wall
    var user = serverstub.getUserDataByToken(tokenID);
    var email = user.data.email;
  }else if(document.getElementById('tab2').checked){
    //I am posting on others wall
    var email = sessionStorage.getItem("searchedUser");
  }

  // email of the user whose wall we are posting on
  if(email != null){
    var object = serverstub.postMessage(tokenID, form.post.value, email);
    refreshTheWall(email);
  }
  clearForms(form);
  return false;
}

/* search user form */
function searchUser(form){

  var tokenID = localStorage.getItem("tokenID");
  // searched email should not be empty
  if(form.search.value === ""){
    return false;
  }

  var email = form.search.value;
  var user = serverstub.getUserDataByEmail(tokenID,email);
  if(user.success === false){
    writeToUser("<p>User does not exist.</p>");

  }else{
    sessionStorage.setItem("searchedUser", user.data.email);
    tab2Func();
  }

  clearForms(form);
  return false;
}



/* when first tab has been checked */
function tab1Func(){
  var profileTemplate = document.getElementById("userTemplate");
  var userProfile = document.getElementById("userProfile");

  // delete content of searchedProfile
  var searchedProfile = document.getElementById("searchedProfile");
  searchedProfile.innerHTML = "";

  // fill in current data
  userProfile.innerHTML = profileTemplate.innerHTML;
  var tokenID = localStorage.getItem("tokenID");
  var user = serverstub.getUserDataByToken(tokenID);

  fillInUserData(user);
  refreshTheWall(user.data.email);
}

/* when second tab has been checked */
function tab2Func(){
  var profileTemplate = document.getElementById("userTemplate");
  // searchedProfile
  var searchedProfile = document.getElementById("searchedProfile");
  // userProfile
  var userProfile = document.getElementById("userProfile");

  var searchedUser = sessionStorage.getItem("searchedUser");

  if(searchedUser != null){
    document.getElementById("searchedProfile").style.display = 'block';
    userProfile.innerHTML = "";
    searchedProfile.innerHTML = profileTemplate.innerHTML;
    var tokenID = localStorage.getItem("tokenID");
    var user = serverstub.getUserDataByEmail(tokenID,searchedUser);
    fillInUserData(user);
    refreshTheWall(user.data.email);
  
  }else{
    document.getElementById("searchedProfile").style.display = 'none';
  }
}

/* check another tab (radio input) */
function checkTab(id){
  document.getElementById(id).checked = true;
  if(id === 'tab1') tab1Func();
  if(id === 'tab2') tab2Func();
}

/* get current view */
function getContent(){
	var tokenID = localStorage.getItem("tokenID");
  var user = serverstub.getUserDataByToken(tokenID);

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
		view.innerHTML = profileView.innerHTML;
    document.getElementById("tab1").checked = true;
		document.getElementById("pageBody").style.background = "#fff";

	}
  document.getElementById("userMessages").style.display = 'none';
}

/* clear div with messages for user */
function clearMessages(){
	var userMessages = document.getElementById("userMessages");
	userMessages.innerHTML = "";
	userMessages.style.display = 'none';
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

    return false;
}

/* write notification to user */
function writeToUser(msg){
	var userMessages = document.getElementById("userMessages");
	userMessages.innerHTML = msg;
	userMessages.style.display = 'block';
  return true;
}

/* check if password is at least 6 characters long */
function checkPassword(password){
  if(password.length < 6){
    writeToUser("<p>Password must contain at least six characters!</p>");
    return false;
  }
  return true;
}

/* user is logged in */
function logIn(email, password){
  var object = serverstub.signIn(email,password);
  
    if(object.success === true){
      localStorage.setItem("tokenID", object.data);
      getContent();
      return true;
    }else{
      writeToUser("<p>"+ object.message +"</p>");
      return false;
    }
}

/* log in form function */
function loginFunc(form){

  // check length of password
	if(checkPassword(form.passwd.value)===false){
      form.passwd.focus();
      return false;
   }
   
  // log in
  if(logIn(form.email.value,form.passwd.value)===true){
    return true;
  }else{
    return false;
  }
}


/* sign up form function */
function signupFunc(form){
  
  // check passwords
  if(form.pwd1.value === form.pwd2.value){
    // check length of password
    if(checkPassword(form.pwd1.value)===false){
      form.pwd1.focus();
      return false;
    }
  }else{
    writeToUser("<p>Please check that you've entered and confirmed your password!</p>");
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

  // call server function
  var object = serverstub.signUp(user);

  // in case of success
  if(object.success === true){
    // log in user
    if(logIn(user.email,user.password)===true){
      return true;
    }else{
      return false;
    }
  }else{
    writeToUser("<p>" + object.message + "</p>");
    return false;
  }
  return false;
}

/* change password form function */
function changePSWForm(form){

	var tokenID = localStorage.getItem("tokenID");

  // check passwords
  if(form.pswd2.value != "" && form.pswd2.value == form.pswd3.value){
    // check length of password
    if(checkPassword(form.pswd2.value)===false) {
      form.pswd2.focus();
      return false;
    }
  }else{
    writeToUser("<p>Please check that you've entered and confirmed your password!</p>");
    form.pswd2.focus();
    return false;
  }
  // call server function
  var object = serverstub.changePassword(tokenID, form.pswd1.value, form.pswd2.value);

  // write notification to user about success or failure
  writeToUser("<p>" + object.message + "</p>");
  clearForms(form);
  return false;
}

/* reload wall */
function reloadFunction(form){

  var tokenID = localStorage.getItem("tokenID");

  // first tab (my profile)
  if(document.getElementById('tab1').checked){

    var user = serverstub.getUserDataByToken(tokenID);
    refreshTheWall(user.data.email);
  }else{
    // second tab (searched profile)
    var email = sessionStorage.getItem("searchedUser");
    if(email != null){
      refreshTheWall(email);
    }
  }
  return false;
}









