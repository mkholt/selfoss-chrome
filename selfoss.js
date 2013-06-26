var alarmPeriod = 5;
var badgeNoStatusBackground = "#A0A0A0";
var badgeStatusBackground = "#D00018";
var url = "https://rss.t-hawk.com";
var statsURL = url + "/stats";
var loginURL = url + "/login";

var params = {
	"username": "",
	"password": ""
};

onInit();

function onInit()
{
	console.log("onInit");

	// Set the initial icon until first update
	updateIcon();

	// When the icon is clicked, open the selfoss URL
	chrome.browserAction.onClicked.addListener(openTab);

	// Start by initializing a request
	updateCount(updateIcon, updateIcon);

	// Start listening for alarm and set it up
	chrome.alarms.onAlarm.addListener(onAlarm);
	chrome.alarms.create("refresh", {'delayInMinutes': 1, 'periodInMinutes': alarmPeriod});
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
	return "?" + ret.join("&");
}

function updateIcon(count)
{
	console.log("updateIcon");
	
	var t = '';
	var c = badgeStatusBackground;
	if (typeof count == 'undefined')
	{
		t = '?';
		c = badgeNoStatusBackground;
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
}
