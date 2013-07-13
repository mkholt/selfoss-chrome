var o = (function($) {
	function onInit()
	{
		chrome.runtime.sendMessage({}, function(response) {
			setValues(response);
		});
	}

	function setValues(s)
	{
		$("#url").val(s.sync.url);
		$("#period").val(s.sync.alarmPeriod);
		$("#username").val(s.local.username);
		$("#password").val(s.local.password);
		$("#badgeStatusBackground").val(s.sync.badgeStatusBackground);
		$("#badgeNoStatusBackground").val(s.sync.badgeNoStatusBackground);
	}

	function saveSettings()
	{
		$(".submit .status").text('Saving...');
		$("#saveBtn").attr('disabled', true);
		s = {
			"sync": {
				"url": $("#url").val(),
				"alarmPeriod": $("#period").val(),
				"badgeStatusBackground": $("#badgeStatusBackground").val(),
				"badgeNoStatusBackground": $("#badgeNoStatusBackground").val()
			},
			"local": {
				"username": $("#username").val(),
				"password": $("#password").val()
			}	
		}
		chrome.runtime.sendMessage({"settings": s}, function(response) {
			$(".submit .status").text('Settings saved');
			$("#saveBtn").attr('disabled', false);
		});
	}

	return {
		"onInit": onInit,
		"saveSettings": saveSettings
	}
})(jQuery);

$(function() {
	o.onInit();

	$(".submit").on('click', 'input[type=button]', o.saveSettings);
});