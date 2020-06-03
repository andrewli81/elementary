let popupProm = "No Prom link found";
let popupGrafana = "No Grafana link found";
let popupKibana = "No Kibana link found";
let kibanaDetails = "No Kibana Details found";
let currentIncident = "No Current Incident loaded";
let hasKibanaBeenAuthenticated = false;
let keywords = "";

// Listen to messages from the content script and populate variables that can be used in popup.js.
chrome.runtime.onMessage.addListener(function (message) {
    console.log(message);
    const msgs = JSON.parse(message);
    if (msgs[0] === 'pagerduty') {
        handlePagerDutyMsg(msgs);
    } else if (msgs[0] === 'kibana') {
        handleKibanaMsg(msgs);
    }
});

chrome.extension.onConnect.addListener(function(port) {
    console.log(`Received connection from ${port.name}`);
    port.onMessage.addListener(function(msg) {
        console.log("message recieved: " + msg);
        const msgs = JSON.parse(msg);
        if (msgs.hasKibanaBeenAuthenticated !== undefined) {
            hasKibanaBeenAuthenticated = msgs.hasKibanaBeenAuthenticated;
        }
        const sent = JSON.stringify(
            {'hasKibanaBeenAuthenticated': hasKibanaBeenAuthenticated,'incident': currentIncident,'popupProm': popupProm, 
            'popupGrafana': popupGrafana, 'popupKibana': popupKibana, 'kibanaDetails': kibanaDetails, "keywords": keywords})
        port.postMessage(sent);
    });
});

function handleKibanaMsg(msgs) {
    const clusterIDs = msgs[2];
    keywords = clusterIDs.join("\n");
}

function handlePagerDutyMsg(msgs) {
    if (msgs[1] !== currentIncident) {
        console.log(`old incident: ${currentIncident} new incident: ${msgs[1]}`)
        hasKibanaBeenAuthenticated = false;
        keywords = "";
    }
    currentIncident = msgs[1];
    const time = msgs[2];
    const timestamps = parseDataTimeToUTCDate(time);
    const detailsMap = parseDetails(msgs[3]);
    const promLink = `${detailsMap["source"]}g0.tab=0&g0.range_input=2h` +
    `&g0.end_input=${formateDateToPromURLFormat(new Date(timestamps[1].getTime() + 1800000))}`;

    const kibanaRedirection = `https://go.corp.databricks.com/elk/${detailsMap["env"]}` +
    `/${detailsMap["cloud"]}/${detailsMap["region"]}`;
    let grafanaPanel = '';
    let grafanaBoard = detailsMap["dashboard"];
    let grafanaEnv = '';
    let kibanaKeyword = '';
    if (detailsMap["alertname"].includes('Cluster') && detailsMap["alertname"].includes('Termination')) {
        grafanaBoard = "https://grafana.cloud.databricks.com/d/000000086/clusters?"
        if (detailsMap["clusterTerminationReasonCode"] === undefined) {
            kibanaKeyword = "%22CONTAINER_LAUNCH_FAILURE%22";
        } else {
            kibanaKeyword = `%22${detailsMap["clusterTerminationReasonCode"]}%22`;
        }
        if (detailsMap["alertname"].includes('DataplanePlatform')) {
            if (detailsMap["env"] === "prod") {
                grafanaPanel = '86';
            } else {
                grafanaPanel = '87';
            }
        } else {
            grafanaPanel = '2';
        }
    } else if (detailsMap["alertname"].includes("SingleUpdateFailureAlert") 
    || detailsMap["alertname"].includes("HighRateUpdateFailureAlert") ) {
        kibanaKeyword = "%22InstanceUpdateMonitor%22"
        grafanaPanel = '24';
    } else if (detailsMap["alertname"].includes("LibrariesApi5xxErrors")) {
        grafanaBoard = "https://grafana.cloud.databricks.com/d/zFKe5ECZz/compute-fabric-api-dashboard?";
        grafanaEnv = `${detailsMap["env"]}-${detailsMap["cloud"]}-${detailsMap["region"]}`;
        kibanaKeyword = "%22library%22";
    } else if (detailsMap["alertname"].includes("WorkerEnvFetchWrongReplicaAlert")) {
        kibanaKeyword = "%22CentralWorkerEnvironmentProvider%22";
    } else if (detailsMap["alertname"].includes("InstanceLaunchFailuresAlert")) {
        grafanaPanel = '18';
        kibanaKeyword = "%22InstanceManager%22%20AND%20%22ERROR%22";
    } else if (detailsMap["alertname"].includes("ArtifactDownloadFailureAlert")) {
        kibanaKeyword = "%22InstanceUpdateMonitor%22";
    } else if (detailsMap["alertname"].includes("ManagerRestartAlert")) {
        grafanaBoard = "https://grafana.cloud.databricks.com/d/000000086/clusters?";
        kibanaKeyword = "%22restart%22%20AND%20%22ClusterManager%22";
    } else if (detailsMap["alertname"].includes("InstancePoolsApi5xxErrors")) {
        grafanaBoard = "https://grafana.cloud.databricks.com/d/zFKe5ECZz/compute-fabric-api-dashboard?";
        grafanaEnv = `${detailsMap["env"]}-${detailsMap["cloud"]}-${detailsMap["region"]}`;
        kibanaKeyword = "%22pool%22";
    } else if (detailsMap["alertname"].includes("InstancePoolsApi5xxErrors")) {
        grafanaBoard = "https://grafana.cloud.databricks.com/d/zFKe5ECZz/compute-fabric-api-dashboard?";
        grafanaEnv = `${detailsMap["env"]}-${detailsMap["cloud"]}-${detailsMap["region"]}`;
        kibanaKeyword = "%22pool%22";
    } else if (detailsMap["alertname"].includes("ClustersApi5xxErrors")) {
        grafanaBoard = "https://grafana.cloud.databricks.com/d/zFKe5ECZz/compute-fabric-api-dashboard?";
        grafanaEnv = `${detailsMap["env"]}-${detailsMap["cloud"]}-${detailsMap["region"]}`;
        kibanaKeyword = "%22cluster%22";
    } else if (detailsMap["alertname"].includes("databaseAccessErrorAlert")) {
        grafanaBoard = "https://grafana.cloud.databricks.com/d/000000086/clusters?";
        kibanaKeyword = `%22RDSHiveMetastoreManager%22`;
    }
    const grafanaLink = grafanaBoard === undefined ? "No Grafana Dashboard specified in annotations or incident rules" 
    : `${grafanaBoard}&fullscreen&var-Environment=${grafanaEnv}&panelId=${grafanaPanel}` + 
    `&from=${(timestamps[0].getTime() - 1800000).toString()}` +
    `&to=${(timestamps[1].getTime() + 1800000).toString()}&refresh=30s`;
    kibanaDetails = `https://kibana-${detailsMap["cloud"]}-${detailsMap["region"]}` +
    `.${replaceDatabricksEnvironment(detailsMap["env"])}.databricks.com` + 
    `/app/kibana?security_tenant=service_logs#/discover?_g=(refreshInterval:(pause:!t,value:0),` + 
    `time:(from:'${formateDateToKibanaURLFormat((timestamps[0].getTime() - 1800000))}',` +
    `to:'${formateDateToKibanaURLFormat((timestamps[1].getTime() + 1800000))}'))` + 
    `&_a=(columns:!(messageText,shardName,tags.subDir,instanceId,workspaceId,level)` +
    `,index:service-log-custom-id,interval:auto,query:(language:kuery,query:'${kibanaKeyword}')` + 
    `,sort:!(timestamp,desc))`;
    popupProm = promLink;
    popupGrafana = grafanaLink;
    popupKibana = kibanaRedirection;
}

function replaceDatabricksEnvironment(env) {
	if (env === "prod") {
		return "cloud";
	} else if (env === "staging") {
		return `${env}.cloud`;
	} else {
		return env;
	}
}

function parseDataTimeToUTCDate(rawText) {
	const reg = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\ ([0-9]+)\,\ ([0-9][0-9][0-9][0-9])\ at\ ([0-9]+)\:([0-9][0-9])\ (AM|PM)/g;
	const itrReg = rawText.matchAll(reg);
	const timestamps = [];
	while (true) {
		let matched = itrReg.next();
		if (matched.value === undefined) {
			break;
		}
		timestamps.push(new Date(
			parseInt(matched.value[3]), 
			"JanFebMarAprMayJunJulAugSepOctNovDec".indexOf(matched.value[1]) / 3, 
			parseInt(matched.value[2]), 
			parseInt(matched.value[4]) + ((matched.value[6] === 'PM') ? 12 : 0), 
			parseInt(matched.value[5]), 0));
	}
	if (timestamps.length == 0) {
		const regToday = /([0-9]+)\:([0-9][0-9])\ (AM|PM)/g;
		const itrRegToday = rawText.matchAll(regToday);
		const today = new Date();
		const year = today.getFullYear()
		const month = today.getMonth()
		const day = today.getDay()
		while (true) {
			let matched = itrRegToday.next();
			if (matched.value === undefined) {
				break;
			}
			timestamps.push(new Date(
				year,
				month, 
				day, 
				parseInt(matched.value[1]) + ((matched.value[3] === 'PM') ? 12 : 0), 
				parseInt(matched.value[2]), 0));
		}
	}
	if (timestamps.length == 1) {
		timestamps.push(new Date(timestamps[0].getTime() + 300000));
	}
	return timestamps;
}

function formateDateToKibanaURLFormat(date) {
	const dateTimeFormat = new Intl.DateTimeFormat('en', {
		year: 'numeric', 
		month: '2-digit', 
		day: '2-digit', 
		hour: '2-digit',
		minute: '2-digit', 
		second: '2-digit', 
		hour12: false, 
		timeZone: 'UTC'
	});
	const [{ value: month },,
		{ value: day },,
		{ value: year },,
		{ value: hour },,
		{ value: minute },,
		{ value: second}] = dateTimeFormat.formatToParts(date);
	return year + '-' + month + '-' + day + 'T' + 
	(hour.toString() === "24" ? '00' : hour.toString()) + ':' + minute + ':' + second + '.000Z';
}

function formateDateToPromURLFormat(date) {
	const dateTimeFormat = new Intl.DateTimeFormat('en', {
		year: 'numeric', 
		month: '2-digit', 
		day: '2-digit', 
		hour: '2-digit',
		minute: '2-digit', 
		second: '2-digit', 
		hour12: false, 
		timeZone: 'UTC'
	});
	const [{ value: month },,
		{ value: day },,
		{ value: year },,
		{ value: hour },,
		{ value: minute },,
		{ value: second}] = dateTimeFormat.formatToParts(date);
	return year + '-' + month + '-' + day + '%20' + 
	(hour.toString() === "24" ? '00' : hour.toString()) + '%3A' + minute + '%3A' + second;
}

function parseDetails(detailsText) {
	const split = detailsText.split("Source: ");
	const labelsAndAnnotations = split[0];
	const detailsMap = {};
	detailsMap["source"] = split[1].slice(0, -8);
	const mapPattern = /\ \-\ ([^\ ]+)\ =\ ([^\n]+)/g;
	const mapIter = labelsAndAnnotations.matchAll(mapPattern);
	while (true) {
		let matched = mapIter.next();
		if (matched.value === undefined) {
			break;
		}
		detailsMap[matched.value[1]] = matched.value[2];
	}
	return detailsMap;
}
