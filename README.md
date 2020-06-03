# Elementary (The "Oncall" Chrome extension)
## Download and install
1. Clone the repository
2. Go to [[chrome://extensions]], and enable developer mode
3. Choose "load unpacked extension" and load the folder
## Use
1. Go to a PagerDuty incident page (for example: [[https://databricks.pagerduty.com/incidents/P35IT0R]])
2. Click on extension icon to see links generated for the incident.
3. For Kibana, make sure you click on "Kibana Auth" button first, and then on next page, click on "Kibana Search" for keyword and timestamp correlated search.
## Known Issues
1. Kibana search keyword only works for Cluster team and Dataplane Platform team alerts for now. 
2. Refresh is needed to trigger the extension's webpage capture logic. (And it takes a while, since the Kibana page loads for a long time, and we have to wait for the page to finish loading before capturing the webpage)
3. Can only capture cluster id in Kibana search page, and the cluster ids are not organized well on the popup page.

