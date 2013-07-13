var selfoss = (function() {	
	var settings;

	var statsURL;
	var loginURL;
	
	var params = {};

	function onInstalled(details)
	{
		console.log("onInstalled");

		if (details.reason == "update")
		{
			console.log("updated, old version: " + details.previousVersion);
			if (details.previousVersion == '1.0')
			{
				console.log("Migrating from localStorage");
				var s = JSON.parse(localStorage.getItem("settings"));
				if (!s) return;

				var sync = {
					"url": s.url,
					"alarmPeriod": s.alarmPeriod,
					"badgeStatusBackground": s.badgeStatusBackground,
					"badgeNoStatusBackground": s.badgeNoStatusBackground
				};
				var local = {
					"username": s.username,
					"password": s.password,
				};

				chrome.storage.sync.set(sync);
				chrome.storage.local.set(local);
				localStorage.removeItem("settings");
			}
		}
	}

	function onInit()
	{
		console.log("onInit");
		
		chrome.runtime.onInstalled.addListener(onInstalled);
		chrome.storage.onChanged.addListener(onStorageChange);

		// Load settings from Chrome Storage
		syncSettings = chrome.storage.sync.get(null, function(synced) {
			settings = {};
			if (synced)
			{
				settings.sync = synced;
			}

			localSettings = chrome.storage.local.get(null, function(local) {
				if (local)
				{
					settings.local = local;
				}

				if (!settings)
				{
					settings = defaultSettings();
					openTab();
				}
				else
				{
					statsURL = settings.sync.url + "/stats";
					loginURL = settings.sync.url + "/login";
				}

				// Start listening for messages from the settings
				chrome.runtime.onMessage.addListener(onMessage);

				// Set the initial icon until first update
				updateIcon();

				// Start listening for alarm and set it up
				chrome.alarms.onAlarm.addListener(onAlarm);

				// When the icon is clicked, open the selfoss URL
				chrome.browserAction.onClicked.addListener(openTab);

				if (settings.sync.url)
				{		
					// Start by initializing a request
					updateCount(updateIcon, updateIcon);
					
					// Initialize alarm
					setupAlarm();
				}
			});
		});
	}
	
	function defaultSettings()
	{
		// No settings saved, initialize default settings
		s = {
			"sync": {
				"url": "",
				"alarmPeriod": 5,
				"badgeStatusBackground": "#D00018",
				"badgeNoStatusBackground": "#A0A0A0"
			},
			"local": {
				"username": "",
				"password": ""
			}
		};

		return s;
	}
	
	function setupAlarm()
	{
		console.log("setupAlarm");
		chrome.alarms.create("refresh", {'delayInMinutes': 1, 'periodInMinutes': parseInt(settings.sync.alarmPeriod)});
	}

	function onStorageChange(changes, areaName)
	{
		console.log("onStorageChange");

		for (k in changes)
		{
			settings[areaName][k] = changes[k].newValue;
		}
		
		handleNewSettings();
	}

	function handleNewSettings()
	{
		console.log("handleNewSettings");
		if (settings.sync.url)
		{		
			statsURL = settings.sync.url + "/stats";
			loginURL = settings.sync.url + "/login";
			params.username = settings.local.username;
			params.password = settings.local.password;

			updateCount(updateIcon, updateIcon);

			chrome.alarms.clear("refresh");
			setupAlarm();
		}
	}

	function updateSettings(s)
	{
		console.log("updateSettings");
		settings = s;

		handleNewSettings();
		
		chrome.storage.sync.set(s.sync);
		chrome.storage.local.set(s.local);
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
		var c = settings.sync.badgeStatusBackground;
		if (typeof count == 'undefined')
		{
			t = '?';
			c = settings.sync.badgeNoStatusBackground;
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
			var url = (settings.sync.url) ? settings.sync.url : chrome.runtime.getURL("options.html");

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
