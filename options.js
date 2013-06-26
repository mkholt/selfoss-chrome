var o = (function($) {
	function onInit()
	{
		chrome.runtime.sendMessage({}, function(response) {
			setValues(response);
		});
	}

	function setValues(s)
	{
		$("#url").val(s.url);
		$("#period").val(s.alarmPeriod);
		$("#username").val(s.username);
		$("#password").val(s.password);
		$("#badgeStatusBackground").val(s.badgeStatusBackground);
		$("#badgeNoStatusBackground").val(s.badgeNoStatusBackground);
	}

	function saveSettings()
	{
		$(".submit .status").text('Saving...');
		$("#saveBtn").attr('disabled', true);
		s = {
			"url": $("#url").val(),
			"alarmPeriod": $("#period").val(),
			"username": $("#username").val(),
			"password": $("#password").val(),
			"badgeStatusBackground": $("#badgeStatusBackground").val(),
			"badgeNoStatusBackground": $("#badgeNoStatusBackground").val()
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