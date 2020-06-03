// send the PagerDuty page details as a chrome message

window.addEventListener("load", parseIncidentAndSendMessage, false);
const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}
function parseIncidentAndSendMessage (evt) {
    let timeout = 3000;
    console.log(evt);
    sleep(timeout).then(() => {
        const eventLog = JSON.stringify([
        "pagerduty",    
        // Current incident
        window.location.href,
        // Raw text for extracting the time for the event
        document.getElementsByClassName('pd-col-half')[0].outerText,
        // Raw text for extracting the details for the event
        document.getElementsByClassName('incident-details-container')[2].innerText]); 
        console.log(eventLog);
        chrome.runtime.sendMessage(eventLog);
        return;
    })
}
