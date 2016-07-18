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
var contractAddress = "0xa0fD10BE97Cca603450373CDfAEb08316e684360";
var contract = DataServiceContract.at(contractAddress);

// General flow of code is:
// 1. Get the amount of data requests that we need to process.  This allows us to iterate through them all.
// 2. Go through each data request and get the metadata for that request (e.g. the URL to request).
// 3. Make the requested request (haha), and upload the result to the contract.
// Pretty simple, right?

// Retrieves length
var retrieveDataRequestLength = function() {
  console.log("Retrieving data request length");

  // First we need to define the event handler, then we can make the actual request.
  var getLengthEvents = contract.GetDataRequestLength();
  getLengthEvents.watch(function(error, getLengthResult){
    if(error) {
      console.log(error);
    } else {
      var lengthActual = getLengthResult.args.length.s;
      console.log("Retrieved data request length", lengthActual);

      onDataRequestLengthRetrieved(lengthActual);
    }
  });

  // Makes the actual request
  contract.getDataRequestLength();
}

// Iterates through each request and processes it
var onDataRequestLengthRetrieved = function(dataRequestLength) {
  for(var iteration = 0; iteration < dataRequestLength; iteration++){
    onDataRequestProcess(iteration);
  }
}

// Processes the request by getting the data request URL
var onDataRequestProcess = function(dataRequestId) {
  console.log("Processing data request", dataRequestId);

  // First we need to define the event handler, then we can make the actual request.
  var getDataRequestEvents = contract.GetDataRequest({ id: dataRequestId });
  getDataRequestEvents.watch(function(error, getRequestDataResult) {
    if (error) {
      console.log(error);
    } else {
      // We got the metadata (including the URL)
      var dataRequestUrl = getRequestDataResult.args.dataurl;
      console.log("Got metadata for data request", dataRequestId, dataRequestUrl);

      onDataRequestUrlRetrieved(dataRequestId, dataRequestUrl);
    }
  });

  // Makes the actual request
  contract.getDataRequest(dataRequestId);
}

// Gets the response body for the provided dataRequest ID.  Assumes request URL matches the request ID.
var onDataRequestUrlRetrieved = function(dataRequestId, dataRequestUrl) {
  console.log("Making HTTP request", dataRequestId, dataRequestUrl);

  Request(dataRequestUrl, function (error, response, body) {
    console.log("HTTP response received", dataRequestId, error, response, body);

    onDataRequestResponseBodyRetrieved(dataRequestId, error, body);
  });
}

// Uploads the response data to the contract
var onDataRequestResponseBodyRetrieved = function(dataRequestId, error, body) {
  console.log("Adding HTTP response to contract", dataRequestId, error, body);

  if (error) {
    contract.addDataPoint(dataRequestId, false, "");
  } else {
    contract.addDataPoint(dataRequestId, true, body);
  }
}

// Kickoff the chain of events
retrieveDataRequestLength();
