// send recommended Kibana keywords to the tool

window.addEventListener("load", parseKibanaAndSendMessage, false);
const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}
function parseKibanaAndSendMessage (evt) {
    let timeout = 30000;
    console.log(evt);
    sleep(timeout).then(() => {
        const clusterIDs = [];
        const eles = document.getElementsByClassName("kbnDocTable__row");
        console.log(eles);
        for (i = 0; i < eles.length; i++) {
            itr = eles[i].innerText.matchAll(/([0-9]{4})\-([0-9]{6})\-([a-z0-9]+)/g);
            while (true) {
                const matched = itr.next();
            if (matched.done) {
                    break;
                }
                clusterIDs.push(matched.value[0]);
            }
        }
        console.log(clusterIDs);
        const eventLog = JSON.stringify([
        'kibana',    
        // Current Kibana query link
        window.location.href,
        Array.from(new Set(clusterIDs))]);
        console.log(eventLog);
        chrome.runtime.sendMessage(eventLog);
        return;
    });
}
