var selfoss = (function() {	
	var settings;

	var statsURL;
	var loginURL;
	
	var params = {};

	function onInit()
	{
		console.log("onInit");

		// Load settings from localStorage
		settings = JSON.parse(localStorage.getItem("settings"));
		if (!settings)
		{
			settings = defaultSettings();
			openTab();
		}
		else
		{
			statsURL = settings.url + "/stats";
			loginURL = settings.url + "/login";
		}

		// Start listening for messages from the settings
		chrome.runtime.onMessage.addListener(onMessage);

		// Set the initial icon until first update
		updateIcon();

		// Start listening for alarm and set it up
		chrome.alarms.onAlarm.addListener(onAlarm);

		// When the icon is clicked, open the selfoss URL
		chrome.browserAction.onClicked.addListener(openTab);

		if (settings.url)
		{		
			// Start by initializing a request
			updateCount(updateIcon, updateIcon);
		
			// Initialize alarm
			setupAlarm();
		}
	}
	
	function defaultSettings()
	{
		// No settings saved, initialize default settings
		s = {
			"url": "",
			"alarmPeriod": 5,
			"username": "",
			"password": "",
			"badgeStatusBackground": "#D00018",
			"badgeNoStatusBackground": "#A0A0A0"
		};

		return s;
	}
	
	function setupAlarm()
	{
		console.log("setupAlarm");
		chrome.alarms.create("refresh", {'delayInMinutes': 1, 'periodInMinutes': parseInt(settings.alarmPeriod)});
	}

	function updateSettings(s)
	{
		console.log("updateSettings");
		settings = s;

		if (settings.url)
		{		
			statsURL = settings.url + "/stats";
			loginURL = settings.url + "/login";
			params.username = s.username;
			params.password = s.password;

			updateCount(updateIcon, updateIcon);

			chrome.alarms.clear("refresh");
			setupAlarm();
		}
		
		localStorage.setItem("settings", JSON.stringify(s));
	}
	
	function onMessage(request, sender, sendResponse)
	{
		console.log("onMessage");
		if (request.settings)
		{
			console.log("Saving settings");
			updateSettings(request.settings);
			setAuthed(false);
			sendResponse();
		}
		else
		{
			console.log("Requesting settings");
			if (!settings)
			{
				var s = defaultSettings();
				updateSettings(s);
				sendResponse(s);
			}
			else sendResponse(settings);
		}
	}
	
	function onAlarm(alarm)
	{
		console.log("onAlarm");
		updateCount(updateIcon, updateIcon);
	}
	
	function doAjax(url, onSuccess, onError)
	{
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function()
		{
			if (xhr.readyState == 4)
			{
				if (xhr.status == 200)
				{
					var resp = JSON.parse(xhr.responseText);
					onSuccess(resp);
				}
				else
				{
					onError(xhr.status, xhr.responseText);
				}
			}
		}
		xhr.open("GET", url, true);
		xhr.send();
	}
	
	function updateCount(onSuccess, onError)
	{
		console.log("updateCount");
		
		if (params.username && !isAuthed())
		{
			console.log("Validating user");
			doAjax(loginURL + getParams(), function(data) {
				if (data.success)
				{
					setAuthed(true);
					updateCount(onSuccess, onError);
				}
				else
				{
					setAuthed(false);
				}
			}, function(status, error) {
				console.log("Error (" + status + "): " + error);
				onError();
			});
		}
		else
		{
			doAjax(statsURL + getParams(), function(data) {
				if (data.unread) onSuccess(data.unread);
				else onError();
			}, function(status, error) {
				console.log("Error (" + status + "): " + error);
				onError();
			});
		}
	}

	function setAuthed(status)
	{
		localStorage.setItem("authed", (status) ? "t" : "f");
	}
	
	function isAuthed()
	{
		return localStorage.getItem("authed") && localStorage.getItem("authed") == "t";
	}
	
	function getParams()
	{
		var ret = [];
		for (p in params)
		{
			ret.push(p + "=" + params[p]);
		}

		return (ret.length) ? "?" + ret.join("&") : "";
	}
	
	function updateIcon(count)
	{
		console.log("updateIcon");

		var t = '';
		var c = settings.badgeStatusBackground;
		if (typeof count == 'undefined')
		{
			t = '?';
			c = settings.badgeNoStatusBackground;
		}
		else t = (count > 0) ? "" + count : '';
		
		chrome.browserAction.setBadgeText({'text': t});
		chrome.browserAction.setBadgeBackgroundColor({'color': c});
	}

	function openTab()
	{
		console.log("openTab");

		chrome.tabs.getAllInWindow(undefined, function(tabs) {
			// See if it's already open
			var url = (settings.url) ? settings.url : chrome.runtime.getURL("options.html");

			for (var i = 0, tab; tab = tabs[i]; i++)
			{
				if (tab.url && tab.url.indexOf(url) == 0)
				{
					// This is the tab we're looking for
					chrome.tabs.update(tab.id, {'selected': true});
					return;
				}
			}

			// It wasn't open, or we couldn't find it. Open a new tab
			chrome.tabs.create({'url': url});
		});

		// Now that the user has called attention to us, refresh the badge
		updateCount(updateIcon, updateIcon);
	}

	return {
		'init': onInit
	};
}());

selfoss.init();
