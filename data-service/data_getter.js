// This script depends on a few things:
// 1. web3 and request must be installed
// 2. An ethereum node (with money) must be running in the background, with the following command: "./geth --rpc --unlock 0".
// 3. The address of the contract must be set to DATA_SERVICE_CONTRACT_ADDRESS
var Web3 = require("web3");
var Request = require('request');

// Use local Ethereum node and the default account
var web3 = new Web3;
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));
web3.eth.defaultAccount = web3.eth.accounts[0];

// Initialize contract class
var contractAbi = [ { "constant": false, "inputs": [ { "name": "dataUrl", "type": "string" } ], "name": "addDataRequest", "outputs": [], "type": "function" }, { "constant": false, "inputs": [], "name": "destroy", "outputs": [], "type": "function" }, { "constant": false, "inputs": [ { "name": "id", "type": "uint256" } ], "name": "getDataRequest", "outputs": [], "type": "function" }, { "constant": false, "inputs": [ { "name": "dataRequestId", "type": "uint256" }, { "name": "success", "type": "bool" }, { "name": "response", "type": "string" } ], "name": "addDataPoint", "outputs": [], "type": "function" }, { "constant": false, "inputs": [ { "name": "dataRequestId", "type": "uint256" }, { "name": "dataPointId", "type": "uint256" } ], "name": "getDataPoint", "outputs": [], "type": "function" }, { "constant": false, "inputs": [], "name": "getDataRequestLength", "outputs": [], "type": "function" }, { "inputs": [], "type": "constructor" }, { "anonymous": false, "inputs": [ { "indexed": false, "name": "id", "type": "uint256" }, { "indexed": false, "name": "initialized", "type": "bool" }, { "indexed": false, "name": "dataUrl", "type": "string" } ], "name": "NewDataRequest", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": false, "name": "length", "type": "uint256" } ], "name": "GetDataRequestLength", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": false, "name": "id", "type": "uint256" }, { "indexed": false, "name": "initialized", "type": "bool" }, { "indexed": false, "name": "dataurl", "type": "string" }, { "indexed": false, "name": "dataPointsLength", "type": "uint256" } ], "name": "GetDataRequest", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": false, "name": "dataRequestId", "type": "uint256" }, { "indexed": false, "name": "success", "type": "bool" }, { "indexed": false, "name": "response", "type": "string" } ], "name": "AddDataPoint", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": false, "name": "dataRequestId", "type": "uint256" }, { "indexed": false, "name": "id", "type": "uint256" }, { "indexed": false, "name": "success", "type": "bool" }, { "indexed": false, "name": "response", "type": "string" } ], "name": "GetDataPoint", "type": "event" } ]; 
var DataServiceContract = web3.eth.contract(contractAbi);

// Get contract instance
var contractAddress = process.env.DATA_SERVICE_CONTRACT_ADDRESS;
var contract = DataServiceContract.at(contractAddress);

// General flow of code is:
// 1. Get the amount of DataRequests that we need to process (retrieveDataRequestLength).  This allows us to iterate through them all.
// 2. The event handler for Step 1 through each DataRequest and get the metadata for that request (requestDataRequestMetadata).  The event handler for this step adds result data to the dataRequests array (if not already included).
// 3. Every minute, make the requested requests, and upload the result to the contract.
// Pretty simple, right?
var dataRequests = {};

// Method to retrieve DataRequest length
var retrieveDataRequestLength = function() {
  console.log("Retrieving data request length");
  contract.getDataRequestLength();
}

// Event handler for receiving DataRequest length responses.
// Goes through each DataRequest and attempts to persist it.
var getLengthEvents = contract.GetDataRequestLength();
getLengthEvents.watch(function(error, getLengthResult){
  console.log("Got data request length event");

  if(error) {
    console.log(error);
  } else {
    var lengthActual = getLengthResult.args.length.s;
    console.log("Retrieved data request length", lengthActual);

    // Iterate through each data request and persist it
    for(var iteration = 0; iteration < lengthActual; iteration++){
      requestDataRequestMetadata(iteration);
    }
  }
});

// Requests the DataRequest's metadata
var requestDataRequestMetadata = function(dataRequestId) {
  console.log("Getting metadata for data request", dataRequestId);
  contract.getDataRequest(dataRequestId);
}

// Event handler for receiving data request metadata.
// Persists it to the data requests array.
var getDataRequestEvents = contract.GetDataRequest();
getDataRequestEvents.watch(function(error, getRequestDataResult) {
  console.log("Got data request metadata event");

  if (error) {
    console.log(error);
  } else {
    // We got the metadata (including the URL)
    var dataRequestId = getRequestDataResult.args.id.e;
    var dataRequestUrl = getRequestDataResult.args.dataurl;
    console.log("Retrieved metadata for data request", dataRequestId, dataRequestUrl);

    // Persist it!
    dataRequests[dataRequestId] = dataRequestUrl;
  }
});

// Processes all data requests by making the HTTP request + uploading the response to the contract
var processDataRequests = function() {
  console.log("Processing data requests");

  for (var dataRequestId in dataRequests) {
    var dataRequestUrl = dataRequests[dataRequestId];
    console.log("Making HTTP request for data request", dataRequestId, dataRequestUrl);

    Request(dataRequestUrl, function (error, response, body) {
      console.log("HTTP response received", dataRequestId, error, body);
      console.log("Persisting data point to contract", dataRequestId);

      if (error) {
        contract.addDataPoint(dataRequestId, false, "");
      } else {
        contract.addDataPoint(dataRequestId, true, body);
      }
    });
  }
}

// Kickoff the data request retrievals, + call it once immediately
setInterval(retrieveDataRequestLength, 60 * 1000);
retrieveDataRequestLength();

// Process all data requests every minute
setInterval(processDataRequests, 60 * 1000);

