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
var contractAddress = "0x33adA680b83d86B8d20067785222bb752EFB56A8";
var contract = DataServiceContract.at(contractAddress);

// Get amount of data requests currently in the contract,
// after watching for the output event.
contract.getDataRequestLength();
var getLengthEvents = contract.GetDataRequestLength();
getLengthEvents.watch(function(error, getLengthResult){
  if (error) {
    throw error;
  } else {
    // We got the length.  Go through each request and fulfill it.
    var dataRequestsLength = getLengthResult.args.length.s;
    for(var iteration = 0; iteration < dataRequestsLength; iteration++){
      // Get data request metadata (URL, etc)
      contract.getDataRequest(iteration);
      var getDataRequestEvents = contract.GetDataRequest({ id: iteration });
      getDataRequestEvents.watch(function(error, getRequestDataResult) {
        if (error) {
          throw error;
        } else {
          // We got the metadata (including the URL), so make the request.
          var dataUrl = getRequestDataResult.args.dataurl;
          Request(dataUrl, function (error, response, body) {
            // Add the response data to the contract
            if (error) {
              contract.addDataPoint(iteration, false);
            } else {
              contract.addDataPoint(iteration, true, body);
            }
          });
        }
      });
    }
  }
});
