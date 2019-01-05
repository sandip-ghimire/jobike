/*------------------------------------------------------------------------------------
JOBIKE
--------------------------------------------------------------------------------------
A web application to assist buying, selling and maintenance of bikes in Joensuu area.
Developed for Location Aware Mobile Applications Development.
University of Eastern Finland

Developed by : Sandip Ghimire & Antonio Serrano
Version : 1.0  25.11.2018
---------------------------------------------------------------------------------------*/

var map = null; // Google map
var infowindow = null; // Window for bikes/shops
var iconBikes = null; // Icon for bikes
var iconShops = null; // Icon for shops
var shops = []; // Bikes shops
var bikes = []; // Bikes on sale
var img_file = null; //image file
var file_name = null; //image name
var current_tag = null; // Current selected tag
var flightPath = null; // Route to destinations
var default_marker; //marker for your current position
var share_link = null; // Link to share bikes/shops
var bikeOwner = null; // Owner of selected marker
var bikeCode = null; // Bike code of selected marker
var loggin = false; // State of login
var user_logged = null; // Name of logged user
var searchkey = null; //searchkey
var filterDistance = 300; // initial filter value
var showSellForm = false; //toggle sell form
var destPoint = null; //destination point

// Current users location
var geolocation = null;
var currentPosition = {
	lat: 0,
	lng: 0
};
// Joensuu location
var JOENSUU = {
	lat: 62.60,
	lng: 29.76
}

var EARTH_RADIUS = 6371; // Earth radius in Km

// API keys and URL
var APP_URL = window.location.href;

var GOOGLE_KEY = "AIzaSyC2YXHpksnAc5JXUEF1M0yFxy9xqWr-XYw";
var GOOGLE_SERVER = "https://maps.googleapis.com/maps/api/";

var APP_KEY = "8QVHXXI5sxyGmXMs9yn6JbNXld33T5nHgVd2g3Ar";
var JAVASCRIPT_KEY = "lCol4VlZiFjDmqkRBe8wUQQ0eARIdZbGiMEIDhU0";
var CLIENT_KEY = "30qHiFzAnZtNZBfCFhBqydTUxazq1kFmoX1SG2u8";

var URL_SHOPS = "https://parseapi.back4app.com/classes/Shop/";
var URL_BIKES = "https://parseapi.back4app.com/classes/JOdb/";

var OSRM_SERVER = "https://router.project-osrm.org/route/v1/driving/";
var IMG_SERVER = "https://jobike.back4app.io/files/";
var CS_OSRM = "https://cs.uef.fi/o-mopsi/api/server.php?";


//ICON SIZE
var BIWIDTH = 42; //bike icon width
var BIHEIGHT = 42; //bike icon height
var BAWIDTH = 21; //bike anchor width
var BAHEIGHT = 21; //bike anchor height

var LIWIDTH = 152; //mylocation icon width
var LIHEIGHT = 130; //mylocation icon height
var LAWIDTH = 76; //mylocation anchor width
var LAHEIGHT = 65; //mylocation anchor height

// Parse server initialization (Free server for database)
Parse.initialize("8QVHXXI5sxyGmXMs9yn6JbNXld33T5nHgVd2g3Ar",
                 "e78YiFjZqazbpO8GNySMewEGZJE5kr52tQGcLnpQ");
Parse.serverURL = "https://parseapi.back4app.com";


// --------------------------------------------
// Main funciton
// --------------------------------------------

function initMap() {
	map = new google.maps.Map(document.getElementById('map'), {
			center: JOENSUU,
			zoom: 13,
			gestureHandling : 'greedy', 
			mapTypeControlOptions: {
				mapTypeIds: ['roadmap', 'satellite',
					'styled_map']
			}
		});

	// Setting icon for shops
	iconShops = {
		url: "./images/repair.png",
		size: new google.maps.Size(BIWIDTH, BIHEIGHT),
		scaledSize: new google.maps.Size(BIWIDTH, BIHEIGHT),
		origin: new google.maps.Point(0, 0),
		anchor: new google.maps.Point(BAWIDTH, BAHEIGHT)
	};

	// Setting icon for bikes
	iconBikes = {
		url: "./images/bikegreenlogo.png",
		size: new google.maps.Size(BIWIDTH, BIHEIGHT),
		scaledSize: new google.maps.Size(BIWIDTH, BIHEIGHT),
		origin: new google.maps.Point(0, 0),
		anchor: new google.maps.Point(BAWIDTH, BAHEIGHT)
	};

	iconOwnBike = {
		url: "./images/bikeyellow.png",
		size: new google.maps.Size(BIWIDTH, BIHEIGHT),
		scaledSize: new google.maps.Size(BIWIDTH, BIHEIGHT),
		origin: new google.maps.Point(0, 0),
		anchor: new google.maps.Point(BAWIDTH, BAHEIGHT)
	};

	// Setting icon for current location
	iconMyloc = {
		url: "./images/myLoc.gif",
		size: new google.maps.Size(LIWIDTH, LIHEIGHT),
		scaledSize: new google.maps.Size(LIWIDTH, LIHEIGHT),
		origin: new google.maps.Point(0, 0),
		anchor: new google.maps.Point(LAWIDTH, LAHEIGHT)
	};

	// Setting marker for current position
	default_marker = new google.maps.Marker({
			position: {
				lat: currentPosition.lat,
				lng: currentPosition.lng
			},
			map: map,
			title: "Your current position",
			icon: iconMyloc,
			zIndex: 9

		});

};

/*-------------------------------------------------------------
Implementing geolocation to find user location
-------------------------------------------------------------*/
if (window.navigator && window.navigator.geolocation) {
	geolocation = window.navigator.geolocation;
}

if (geolocation) {

	geolocation.getCurrentPosition(locTrack, locErr);

	//on location update
	geolocation.watchPosition(locTrack, null, {
		enableHighAccuracy: true,
	});

}

function locTrack(event) {

	// Updating current position
	currentPosition.lat = event["coords"].latitude;
	currentPosition.lng = event["coords"].longitude;
	
	if (default_marker) {
		default_marker.setPosition(currentPosition);
		if (destPoint) {
		navigateUsingOSRM(currentPosition, destPoint);
		}else {
			if (flightPath != null) {
				flightPath.setMap(null);
			}
		}
	}

};

function locErr(err) {

	switch (err.code) {
	case err.PERMISSION_DENIED:
		alert("Please allow location");
		break;
	case err.POSITION_UNAVAILABLE:
		alert("Location unavailable");
		break;
	case err.TIMEOUT:
		alert("Request timed out");
		break;
	case err.UNKNOWN_ERROR:
		alert("An unknown error occurred");
		break;
	}
};


/*-------------------------------------------------------------
Function to show bikes on map
-------------------------------------------------------------*/
function showBikes() {

	// Setting current tag
	current_tag = "bikes";

	// Removing pannel
	$('#disPanel').hide();

	// Refreshing map
	initMap();

	requestData("bikes", function (result) {

		if (result == "success") {

			// Going through the list of bikes
			bikes["results"].forEach(function (value, i, array) {

				// Getting data from bike
				var name = bikes["results"][i].Name;
				var address = bikes["results"][i].location;
				var description = bikes["results"][i].description;
				var contact_info = bikes["results"][i].contact_info;
				var image = bikes["results"][i].image;
				var price = bikes["results"][i].price;
				var bike_code = bikes["results"][i].objectId;
				var bike_owner = bikes["results"][i].owner; // This is needed in order to delete bikes


				// We need to convert address to location/longitude format
			  convertAddressToLocation(address, function (result) {

				// Filtering places according to distance
				if (distanceBetweenPlaces(currentPosition, result, "haversine") <= filterDistance) {

					// Setting marker for each bike
					var marker = new google.maps.Marker({
												
						icon: localStorage.log_userid == bike_owner && localStorage.loggin == 'true' ? iconOwnBike : iconBikes,
						position: {
							lat: result.lat,
							lng: result.lng
						},
						map: map,
						title: name,
						animation: google.maps.Animation.DROP,
						bike_code: bike_code, // This is needed to retrieve bike code from the marker
						bike_owner: bike_owner
						
						});

					// Click on marker
					marker.addListener('click', function () {
						if (infowindow) {
							infowindow.close();
						}

						// Content of infowindow
						var content = getInfocontentBikes(name, description, address, contact_info, image, price);

						// If user logged and owner of the bike, then show the Delete button
						if (localStorage.log_userid == bike_owner && localStorage.loggin == 'true') {
							content += "<button onclick='deleteBike()' type='button'" +
							"class='btn btndelete'><small>Delete bike<small></button>"
						}

						infowindow = new google.maps.InfoWindow({
								content: content
							});

						infowindow.open(map, marker);

						infowindow.addListener('closeclick', function () {
							$('#disPanel').hide();
							destPoint = null;

							// Removing previous route
							if (flightPath != null) {
								flightPath.setMap(null);
							}
						});

						share_link = APP_URL + '/?srch?' + bike_code;
						bikeOwner = bike_owner;
						bikeCode = bike_code;
						destPoint = marker.getPosition();

						// Getting position of marker
						var pos_lat = marker.getPosition().lat();
						var pos_lng = marker.getPosition().lng();

						navigateUsingOSRM(currentPosition, {
							lat: pos_lat,
							lng: pos_lng
						});

						$('#distval').text(distanceBetweenPlaces(currentPosition, result, "haversine").toFixed(2));
						$('#disPanel').show();
					});

					//Remove distance panel and infowindow while clicking on map
					map.addListener('click', function () {
						infowindow.close();
						$('#disPanel').hide();
						destPoint = null;
					});

				}; // if

			  }); // convertAddresstoLocation

			}); // for


		} // if
		else {
			console.log("Error while retrieving data from server");
		}

	}); // requqestBikesData

}; // showBikes


/*-------------------------------------------------------------
Function to show shops on map
-------------------------------------------------------------*/
function showShops() {

	// Setting current tag
	current_tag = "shops"

		// Removing pannel
		$('#disPanel').hide();

	// Refreshing map
	initMap();

	requestData("shops", function (result) {
		if (result == "success") {

			// Going through the list of shops
			shops["results"].forEach(function (value, i, array) {

				// Getting data from shop
				var name = shops["results"][i].name;
				var address = shops["results"][i].location;
				var description = shops["results"][i].description;
				var contact_info = shops["results"][i].contact;
				var image = shops["results"][i].image;
				var shop_code = shops["results"][i].objectId;

				// We need to convert address to location/longitude format
				convertAddressToLocation(address, function (result) {

					// Filtering places according to distance
					if (distanceBetweenPlaces(currentPosition, result, "haversine") <= filterDistance) {

						// Setting marker for each bike shop
						var marker = new google.maps.Marker({
							icon: iconShops,
							position: {
								lat: result.lat,
								lng: result.lng
							},
							map: map,
							title: name,
							animation: google.maps.Animation.DROP,
							shop_code: shop_code // This is needed to retrieve shop from the marker
							});

						// Click on marker
						marker.addListener('click', function () {
							
						if (infowindow) {
							infowindow.close();
						}

						// Displaying content in info window
						infowindow = new google.maps.InfoWindow({
								content: getInfocontentShops(name, description, address, contact_info, image)

							});

						infowindow.open(map, marker);

						infowindow.addListener('closeclick', function () {
							$('#disPanel').hide();
							destPoint = null;

							// Removing previous route
							if (flightPath != null) {
								flightPath.setMap(null);
							}
						});

						// Saving current share link
						share_link = APP_URL + '/?srch?' + shop_code;
						destPoint = marker.getPosition();

						// Getting position of marker
						var pos_lat = marker.getPosition().lat();
						var pos_lng = marker.getPosition().lng();

						navigateUsingOSRM(currentPosition, {
							lat: pos_lat,
							lng: pos_lng
						});

						$('#distval').text(distanceBetweenPlaces(currentPosition, result, "haversine").toFixed(2));
						$('#disPanel').show();
						
						}); //marker click

						//Remove distance panel and infowindow while clicking on map
						map.addListener('click', function () {
							infowindow.close();
							$('#disPanel').hide();
							destPoint = null;

						});

					}; // if

				}); // convertAddresstoLocation

			}); // for


		} // if (result==success)
		else {
			console.log("Error while retrieving data from server");
		}

	}); // requestShopsData

}; // showShops


/*-----------------------------------------------------------------
Selling bike - Registers bike informations on database(parse server)
-------------------------------------------------------------------*/

function sendForm() {

	var user_location = $('#popUpForm').find('#seller_address').val(),
	user_contact = $('#popUpForm').find('#seller_contact').val(),
	bike_price = $('#popUpForm').find('#bike_price').val(),
	bike_description = $('#popUpForm').find('#bike_description').val(),
	bike_image = $('#popUpForm').find('#bike_pic').val(),
	name = localStorage.getItem('log_username'),
	bike_owner = localStorage.log_userid;

	if (bike_price == NaN ||
		user_location == "" ||
		user_contact == "" ||
		bike_price == "" ||
		bike_description == "") {
		
		alert('Please enter required fields');
		
	} else if (img_file == null) {
		
		alert('Please upload image');
		
	} else {
		$('#loader').show();

		sendImage(function (img_url) {

			if (img_url != "error") {

				var bikeInfo = {
					Name: name,
					location: user_location,
					contact_info: user_contact,
					price: parseInt(bike_price),
					description: bike_description,
					image: img_url,
					owner: bike_owner
				};

			  sendData(bikeInfo, function (result) {

				if (result == "success") {

					// Show sucessful alert
					
					alert('Your bike has been registered successfully!');

					// Removing bike image
					img_file = null;

					// Hide loader and form
					$('#loader').hide();
					$('.dark_overlay').remove();
					$('.formWrapper').remove();
					$('.ttlbar').remove();
					$('#closepopup').remove();

					// Restart map
					showBikes();

				} else {
					$('#loader').hide();
					alert('Something went wrong while saving your bike');
				}

			  }); // sendData

			} // if
			else {

				$('#loader').hide();
				alert('Something went wrong with your image, try to rename the file');

			}

		}); //sendImage


	}; //else

};

/*-------------------------------------------------------------
Delete bike
-------------------------------------------------------------*/
function deleteBike() {

	if (bikeOwner != localStorage.log_userid) {
		
		alert('You must be the owner of the bike to delete it. Please log in.');
		
	} else {

		const JOdb = Parse.Object.extend('JOdb');
		const query = new Parse.Query(JOdb);

		// here you put the objectId that you want to delete
		query.get(bikeCode).then((object) => {
			object.destroy().then((response) => {				
				alert('Bike sucesfully deleted.');
				$('#disPanel').hide(); // hide distance
				showBikes(); // restart map
			})
		}, (error) => {
			console.error(error);
			alert('Something went wrong while deleting the bike.');

		});

	}
};

// This function copy the link of the selected bike/shop into clipboard
function shareLink() {
	$('#copybiketext').val(share_link);
	$('#cpclip').show();
	$('#copytoclipboard').click();
	alert("Link copied to clipboard");
	$('#cpclip').hide();
};


/*-----------------------------------------------------------------------
Functions for Ajax calls for sending and receiving data from parse server
-------------------------------------------------------------------------*/

// post image to the parse server
function sendImage(callback) {

	if (img_file != null) {

		var JOserver = IMG_SERVER + file_name;

		$.ajax({
			url: JOserver,
			type: "POST",

			headers: {
				'X-Parse-Application-Id': APP_KEY,
				'X-Parse-REST-API-Key': JAVASCRIPT_KEY,
				"Content-Type": img_file.type
			},

			data: img_file,
			processData: false,
			contentType: false,

			success: function (response) {
				callback(response.url);

			},
			error: function (textStatus, errorThrown) {
				console.log(textStatus, errorThrown);
				callback("error");
			}

		}); //ajax  call

	} //if


}; // sendImage


// post data to parse server
function sendData(bikeInfo, callback) {

	$.ajax({
		url: URL_BIKES,
		type: 'POST',

		headers: {
			'X-Parse-Application-Id': APP_KEY,
			'X-Parse-REST-API-Key': JAVASCRIPT_KEY,
		},

		data: JSON.stringify(bikeInfo),
		success: function (response) {
			callback("success");

		},

		error: function (XMLHttpRequest, textStatus, errorThrown) {
			console.log(textStatus, errorThrown);
			callback("error");
		},

		contentType: 'application/json',

	});
};

//get data from parse server
function requestData(data, callback) {

	var url = ((data == "shops") ? URL_SHOPS : URL_BIKES);

	// URL API for bike shops
	$.ajax({
		url: url,
		type: 'GET',

		headers: {
			'X-Parse-Application-Id': APP_KEY,
			'X-Parse-REST-API-Key': JAVASCRIPT_KEY,
		},

		success: function (json) {

			((data == "shops") ? shops = json : bikes = json);

			callback("success");
		},
		error: function (XMLHttpRequest, textStatus, errorThrown) {
			alert('Currently server is busy! Please wait a while and try again.');
			callback("error");
		},

		contentType: 'json',
	});

};

/*-------------------------------------------------------------
Trace path using OSRM 
-------------------------------------------------------------*/

function navigateUsingOSRM(startPoint, endPoint) {
	
	var request = CS_OSRM + 'param={"request_type":"get_directions","points":[' + JSON.stringify(startPoint) + ',' + 
	JSON.stringify(endPoint) + ']}';

	httpGetAsync(request, printNavigation);
}

function printNavigation(stringOutput) {

	var obj = JSON.parse(JSON.parse(stringOutput));
	var coords = obj["routes"][0]["geometry"]["coordinates"];
	var points = new Array();

	for (var i = 0; i < coords.length; i++) {
		points.push({
			lat: coords[i][1],
			lng: coords[i][0],
		});
	}

	drawPolyline(points, "red", 4);

}

/*-------------------------------------------------------------
Search Function  
-------------------------------------------------------------*/

function search(key) {

	initMap();
	var searchtext = $('#searchtext').val() || key,
	regex = new RegExp(searchtext, "i"),
	search_data = [];

	// Cleaning search bar
	$('#searchtext').val("");

	// Cleaning pannel
	$('#disPanel').hide();

	requestData("bikes", function (result) {

		if (result == "success") {

			$.each(bikes.results, function (i, result) {
				if ((result.Name.search(regex) != -1) ||
					(result.objectId.search(regex) != -1) ||
					(result.location.search(regex) != -1) ||
					(result.description.search(regex) != -1)) {
					search_data.push(result);
				}
			}); // each loop

			$(function () {
				requestData("shops", function (resp) {

				  if (resp == "success") {

					$.each(shops.results, function (i, result) {
						
					 if ((result.name.search(regex) != -1) ||
						(result.objectId.search(regex) != -1) ||
						(result.location.search(regex) != -1) ||
						(result.description.search(regex) != -1)) {
							
						search_data.push(result);

					 }
					
					}); //each loop


				  }; //if condition


			$(function () {
				
			  $.each(search_data, function (i, data) {

				var name = data.hasOwnProperty('Name') ? data.Name : data.name,
				address = data.location,
				description = data.description,
				contact_info = data.hasOwnProperty('contact') ? data.contact : data.contact_info,
				image = data.image,
				price = data.hasOwnProperty('price') ? data.price : '',
				bike_owner = data.hasOwnProperty('owner') ? data.owner : null,
				code = data.objectId;

				convertAddressToLocation(address, function (result) {

				if (distanceBetweenPlaces(currentPosition, result, "haversine") <= filterDistance) {

					var marker = new google.maps.Marker({
						
						icon: localStorage.log_userid == bike_owner && localStorage.loggin == 'true' ? iconOwnBike : (price == '' ? iconShops : iconBikes),
						position: {
							lat: result.lat,
							lng: result.lng
						},
						map: map,
						title: name,
						code: code,
						bike_owner: bike_owner
						});

					// Setting information window

					var info_content;

					if (price == "") {

						info_content = getInfocontentShops(name, description, address, contact_info, image);

					} else {

						info_content = getInfocontentBikes(name, description, address, contact_info, image, price);

						// If user logged and owner of the bike, then show the Delete button
						if (localStorage.log_userid == bike_owner && localStorage.loggin == 'true') {
							info_content += "<button onclick='deleteBike()' type='button'" +
							"class='btn btndelete'><small>Delete bike<small></button>"

						}

					};

					// Click on marker

					marker.addListener('click', function () {
						if (infowindow) {
							infowindow.close();
						}
						infowindow = new google.maps.InfoWindow({
								content: info_content
							});

						infowindow.open(map, marker);

						infowindow.addListener('closeclick', function () {
							$('#disPanel').hide();
							destPoint = null;

							// Removing previous route
							if (flightPath != null) {
								flightPath.setMap(null);
							}

						});

						// Getting position of marker
						var pos_lat = marker.getPosition().lat();
						var pos_lng = marker.getPosition().lng();

						share_link = APP_URL + '/?srch?' + code;
						bikeOwner = bike_owner;
						bikeCode = code;
						destPoint = marker.getPosition();

						navigateUsingOSRM(currentPosition, {
							lat: pos_lat,
							lng: pos_lng
						});

						$('#distval').text(distanceBetweenPlaces(currentPosition, result, "haversine").toFixed(2));
						$('#disPanel').show();
					});

					//Removing distance panel and infowindow while clicking on map
					map.addListener('click', function () {
						infowindow.close();
						$('#disPanel').hide();
						destPoint = null;
					});

				}; //if condition

			  }); //convert address to location

			}); //each loop

		   }); //callback function

		  }); //requestData shops

		}); //callback function

	  }; // if(result == "success")

	}); //requestData bikes


}; //search function ends here 


// -------------------------------------------------------------
// Functions for popup windows
// -------------------------------------------------------------

function bikeSellFormPopup() {

	// If user not logged in, show login form
	if (localStorage.loggin !== 'true') {
		loginFormPopup();
		
	} else{

		// Show form popup
		$("body").append("<div class='dark_overlay'" +
			"style='z-index:7; display: flex;  justify-content: center;" +
			"align-items: center; background:rgba(0,0,0,0.5);" +
			"top:0;left:0;width: 100%;height: 100%;position:fixed;top:0;'>" +
			"</div><div><div class='ttlbar'><button id='closepopup'>" +
			"</button><div class='formWrapper'></div></div></div>");
		$('.sellContainer').clone().css('display', 'block').prop('id', 'popUpForm').appendTo('.formWrapper');
		$('.ttlbar').center();
		
	}
};

function loginFormPopup(e) {
	
	var e = e || window.event;
	
	if (e.target.id == 'sellbike') {
		showSellForm = true;
	}else {
		showSellForm = false;
	}

	$("body").append("<div class='dark_overlay'" +
		"style='z-index:7; display: flex;  justify-content: center;" +
		"align-items: center; background:rgba(0,0,0,0.5);" +
		"top:0;left:0;width: 100%;height: 100%;position:fixed;top:0;'>" +
		"</div><div><div class='ttlbar'><button id='closepopup'>" +
		"</button><div class='formWrapper'></div></div></div>");
	$('.loginContainer').clone().css('display', 'block').prop('id', 'loginForm').appendTo('.formWrapper');
	$('.ttlbar').center();
	
};


// -------------------------------------------------------------
// Signup, Login and Logout functions
// -------------------------------------------------------------

function signUp() {

	// Retrieving information about new user
	var name = $('#loginForm').find('#log_name').val();
	var username = $('#loginForm').find('#log_username').val();
	var email = $('#loginForm').find('#log_email').val();
	var password = $('#loginForm').find('#log_password').val();
	var repeated_password = $('#loginForm').find('#log_re_password').val();

	// Checking values
	if (name == '' || username == '' || email == '' || password == '' || repeated_password == '') {
		
		alert('Please enter required fields');
	}

	// If the data is correct, proceed
	else if (validateNewUser(email, password, repeated_password)) {

		// Create a new instance of the user class
		var user = new Parse.User()
			user.set('name', name);
			user.set('username', username);
			user.set('email', email);
			user.set('password', password);

		user.signUp(null, {
			success: function (user) {
				alert('Your account has been successfully created. Please verify your e-mail');

				// Closing windows
				$('.dark_overlay').remove();
				$('.formWrapper').remove();
				$('.ttlbar').remove();
				$('#closepopup').remove();

			},
			error: function (user, error) {
				// Show the error message somewhere and let the user try again.
				// It is likely that the user is trying to sign with a username or email already taken.
				console.log("Error: " + error.code + " " + error.message);
				alert('Your email/username is already in use!');

			}
		});

	} // if (validateNewUser)
};

function login() {

	// Retrieving user and password
	var username = $('#loginForm').find('#username').val();
	var password = $('#loginForm').find('#password').val();

	Parse.User.logIn(username, password, {
		success: function (user) {
			// Do stuff after successful login, like a redirect.

			localStorage.setItem('log_userid', user.get("username"));
			localStorage.setItem('log_username', user.get("name"));
			localStorage.setItem('loggin', true);

			$("li.logindiv").replaceWith("<li class='nav-item dropdown userdiv'>" +
				"<a class='nav-link dropdown-toggle' href='#' id='user_log' role='button'" +
				"data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>" +
				localStorage.getItem('log_userid') +
				"</a><div class='dropdown-menu bg-dark' aria-labelledby='navbarDropdown'>" +
				"<a onclick='userLogout()' class='dropdown-item' href='#'>logout</a></div></li>");

			// Closing popup
			$('.dark_overlay').remove();
			$('.formWrapper').remove();
			$('.ttlbar').remove();
			$('#closepopup').remove();
			$('#disPanel').hide();
			
			if (showSellForm === true) {
				bikeSellFormPopup();
				
			}else {
			// Showing bikes
			showBikes();
			}
		},
		error: function (user, error) {
			console.log("The login failed with error: " + error.code + " " + error.message);
			alert('Invalid username/password!');
		}
	});

};

function resetPassword() {

	var email = $('#loginForm').find('#recover_email').val();

	Parse.User.requestPasswordReset(email, {
		success: function () {
			console.log("Password reset request was sent successfully");
			alert('Check your e-mail for further instructions');
		},
		error: function (error) {
			console.log("The login failed with error: " + error.code + " " + error.message);
			alert('E-mail not found in the system');
		}
	});
};


function userLogout() {
     
	localStorage.clear();
	Parse.User.logOut();
	
	
	$("li.userdiv").replaceWith('<li class="nav-item logindiv">' +
		'<a onclick="loginFormPopup(event)" id="loginbtn" class="nav-link" href="#">Login</a></li>');

	// Removing distance pannel
	$('#disPanel').hide();

	// Restart to search()
	search();
};

//----------------------------------------------
//Redirections
//----------------------------------------------

function forgotPasswordPage() {
	$("#loginForm #forgotPasswordContent").show();
	$("#loginForm #loginContent").hide();
};

function signupPage() {
	$("#loginForm #signupContent").show();
	$("#loginForm #loginContent").hide();
	
};

function backtoLogin() {
	$("#loginForm #signupContent").hide();
	$("#loginForm #loginContent").show();

};

function backtoLogin2() {
	$("#loginForm #forgotPasswordContent").hide();
	$("#loginForm #loginContent").show();

};

//----------------------------------------------
//Validations 
//----------------------------------------------

function validateEmail(email) {
	var re = new RegExp(['^(([^<>()[\\]\\\.,;:\\s@\"]+(\\.[^<>()\\[\\]\\\.,;:\\s@\"]+)*)',
				'|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.',
				'[0-9]{1,3}\])|(([a-zA-Z\\-0-9]+\\.)+',
				'[a-zA-Z]{2,}))$'].join(''));
	return re.test(String(email).toLowerCase());
};

function validatePassword(password) {
	var re = /^((?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,})$/;
	return re.test(password);
};

function validateNewUser(email, password, repeated_password) {

	var valid = true;

	// Verifying email and password
	if (!validateEmail(email)) {

		alert('Please insert valid email');
		valid = false;

	} else if (password != repeated_password) {

		alert('Passwords must match.');
		valid = false;

	} else if (!validatePassword(password)) {

		alert('Password must be longer than 8 characters, including an uppercase letter and digit.');
		valid = false;
	}

	return valid;
};



/*-------------------------------------------------------------
Function called after all the DOM elements are loaded.
-------------------------------------------------------------*/
$(function () {

	$("body").on("click", "#closepopup", function () {

		$('.dark_overlay').remove();
		$('.formWrapper').remove();
		$('.ttlbar').remove();
		$(this).remove();
	});
	
	$('body').on('keypress', '#searchtext', function (e) {
		if (e.keyCode == 13) {
			e.preventDefault();
			$('#srchbtn').click();
		}
	});
	
	$('body').on('keypress', '#loginForm #password', function (e) {
		if (e.keyCode == 13) {
			e.preventDefault();
			$('#login_send').click();
		}
	});
	
	$('body').on('keypress', '#loginForm #log_email', function (e) {
		if (e.keyCode == 13) {
			e.preventDefault();
			$('#signup_send').click();
		}
	});
	
	$('body').on('keypress', '#loginForm #recover_email', function (e) {
		if (e.keyCode == 13) {
			e.preventDefault();
			$('#recover_send').click();
		}
	});

	$(document).on('change', '.distSlider', function () {
		$('#selectedDistance').text($(this).val());
		filterDistance = $(this).val();

		if (current_tag == "shops") {
			showShops();
		} else if (current_tag == "bikes") {
			showBikes();
		} else
			search();

	});
	
	if (window.matchMedia('(max-width: 500px)').matches) {
			$('.openfilter').show();
			$(".slider_div").slideDown();
		} else {
			$('.openfilter').hide();
			$('.closefilter').hide();
		}

	$(document).ready(function () {
		
		new ClipboardJS('#copytoclipboard');

		if (window.location.href.indexOf("srch") > -1) {
			searchkey = window.location.href.substr(window.location.href.indexOf("srch")).split('?')[1];
			APP_URL = window.location.href.substr(0,window.location.href.indexOf("srch")-2);
			search(searchkey);

		} else {
			search();
		}
		
		if (localStorage.loggin === 'true') {
			if ($("li.logindiv")) {
			$("li.logindiv").replaceWith("<li class='nav-item dropdown userdiv'>" +
				"<a class='nav-link dropdown-toggle' href='#' id='user_log' role='button'" +
				"data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>" +
				localStorage.getItem('log_userid') +
				"</a><div class='dropdown-menu bg-dark' aria-labelledby='navbarDropdown'>" +
				"<a onclick='userLogout()' class='dropdown-item' href='#'>logout</a></div></li>");
			}
		}
			    

	});
	
	$(window).on('resize', function(){
		$('.ttlbar').center();
		if (window.matchMedia('(max-width: 500px)').matches) {
			$('.openfilter').show();
			$(".slider_div").slideDown();
		} else {
			$('.openfilter').hide();
			$('.closefilter').hide();
		}
		
		if (window.matchMedia('(max-width: 1000px)').matches) {
			$('.distance_div').center();
		} else {
			$('.distance_div').css({'right':'78px','margin-right':'65px','left':'initial'});
		}
	});

	$(".closefilter").click(function () {
		$(".slider_div").slideDown();
		$(this).hide();
		$('.openfilter').show();
	});

	$(".openfilter").click(function () {
		$(".slider_div").slideUp();
		$(this).hide();
		$('.closefilter').show();
	});
	

});

// -------------------------------------------------------------
// Auxiliary Functions
// -------------------------------------------------------------

function convertAddressToLocation(address, callback) {

	// Request to convert address into lat/lng format
	var request = GOOGLE_SERVER + "geocode/json?address=" + address + "&key=" + GOOGLE_KEY
		httpGetAsync(request, function (stringOutput) {

			var obj = JSON.parse(stringOutput)

				// Getting location (lat/lng)
				var location = obj["results"][0]["geometry"]["location"];

			var result = {
				lat: location["lat"],
				lng: location["lng"]
			}

			callback(result);

		});
};

function distanceBetweenPlaces(place1, place2, method) {
	if (method == "haversine") {
		return haversineDistance(place1, place2, EARTH_RADIUS);
	}
	// others if wished
}

function degToRad(degree) {
	return degree * Math.PI / 180;
}

function manhattanDistance(p1, p2) {

	return (Math.abs(p1.x - p2.x) +
		Math.abs(p1.y - p2.y) +
		Math.abs(p1.z - p2.z));
}

function euclideanDistance(p1, p2) {
	return Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) +
		(p1.y - p2.y) * (p1.y - p2.y) +
		(p1.z - p2.z) * (p1.z - p2.z));
}

function haversineDistance(wgs1, wgs2, radius) {
	var p1 = WGStoXYZ(wgs1, radius);
	var p2 = WGStoXYZ(wgs2, radius);
	var E = euclideanDistance(p1, p2);
	return 2 * radius * Math.asin(E / (2 * radius));
}

function WGStoXYZ(location, R) {

	var xyz = {
		x: 0,
		y: 0,
		z: 0
	};

	xyz["y"] = Math.sin(degToRad(location.lat)) * R;
	var r = Math.cos(degToRad(location.lat)) * R;
	xyz["x"] = Math.sin(degToRad(location.lng)) * r;
	xyz["z"] = Math.cos(degToRad(location.lng)) * r;

	return xyz;
}

jQuery.fn.center = function () {
	this.css("position", "absolute");
	this.css("left", Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) +
			$(window).scrollLeft()) + "px");
	return this;
}

function imgChange(ets) {
	var ets = ets || window.event;
	var files = ets.target.files;
	img_file = files[0];
	file_name = img_file.name;
};

function drawPolyline(points, color, thickness) {

	// Removing previous route
	if (flightPath != null) {
		flightPath.setMap(null);
	}

	flightPath = new google.maps.Polyline({
			path: points,
			strokeColor: color,
			strokeWeight: thickness,
			map: map
		});
}

function getInfocontentShops(name, description, address, contact, imgsrc) {
	var infoString = "<div id='infowin'><p style='font-weight:bold;font-size:medium'>" + 
	    name + "</p><hr/>" + "<p><img src=" + imgsrc + " width='70' height='70'" +
		"style='border-radius: 50%;'></p>" + 
		"<p><span id='desc'>" + description + "</span></p><hr id='minhr'/>" +
		"<p class='left'>" + address + "</p>" +
		"<p class='left'>" + "&#9990;" + contact + "</p></div>" +
		"<button onclick='shareLink()' type='button'" +
		"class='btn btn-light btnsharelink'><small>Share link<small></button>";

	return infoString;

}

function getInfocontentBikes(name, description, address, contact, imgsrc, price) {
	var infoString = "<div id='infowin'><p style='font-weight:bold;font-size:medium'>" + 
	    name + "</p><hr/>" + "<p><img src=" + imgsrc + " width='70' height='70'" +
		"style='border-radius: 50%;'></p>" + 
		"<p><span id='desc'>" + description + "</span></p><hr id='minhr'/>" +
		"<p class='left'>" + address + "</p>" +
		"<p class='left'>" + "&#9990;" + contact + "</p>" +
		"<p class='left'>" + price + " €</p></div>" +
		"<button onclick='shareLink()' type='button'" +
		"class='btn btn-light btnsharelink'><small>Share link<small></button>";

	return infoString;

}


