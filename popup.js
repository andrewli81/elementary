const port = chrome.extension.connect({
	name: "popup.js"
});

port.postMessage(JSON.stringify({"type": "askState"}));
port.onMessage.addListener(function(msg) {
	console.log(msg);
	const msgs = JSON.parse(msg);
	const incidentButton = document.getElementById('incident');
	incidentButton.textContent = "Incident: " + msgs.incident.split("/incidents/")[1];
	incidentButton.onclick = function() {
		window.open(msgs.incident);
	};
	incidentButton.disabled = false;
	const promButton = document.getElementById('prom');
	promButton.onclick = function() {
		window.open(msgs.popupProm);
	};
	promButton.disabled = false;
	const grafanaButton = document.getElementById('grafana');
	grafanaButton.onclick = function() {
		window.open(msgs.popupGrafana);
	};
	grafanaButton.disabled = false;
	const kibanaButton = document.getElementById('kibana');
	if (msgs.hasKibanaBeenAuthenticated) {
		kibanaButton.textContent = "Kibana Search";
		kibanaButton.onclick = function() {
			window.open(msgs.kibanaDetails);
		}
	} else {
		kibanaButton.textContent = "Kibana Auth";
		kibanaButton.onclick = function() {
			port.postMessage(JSON.stringify({"type": "updateState", "hasKibanaBeenAuthenticated": true}));
			window.open(msgs.popupKibana);
		};
	}
	kibanaButton.disabled = false;
	if (msgs.keywords !== "") {
		document.getElementById('keywords').innerHTML = "Recommended Kibana Keywords:\n" + msgs.keywords;
	}
});
