'use strict';

var Web3 = require("web3");
var web3rpc = "http://127.0.0.1:8545";

global.web3 = new Web3(new Web3.providers.HttpProvider(web3rpc));
global.accounts = web3.eth.accounts;
global.myGasPrice = 0;
global.clientVersion = null;
global.maxGas = 4712388;
global.emptyAddress = "0x0000000000000000000000000000000000000000";

global.waitForConf = function(t, txHash, done) {
    t.equal(true, txHash.length > 40);
    var bFound = false;
    var block = web3.eth.getBlock('latest');
    for (var a=0;a<block.transactions.length;a++) {
        if (block.transactions[a] == txHash) {                
            bFound = true;
            done();
        }
    }
    if (!bFound) {
        //set up filter
        var filter = web3.eth.filter('latest', function(error, blockHash) {
            var block = web3.eth.getBlock(blockHash);
            if (txHash == null) return;
            for (var a=0;a<block.transactions.length;a++) {
                if (block.transactions[a] == txHash) {
                    filter.stopWatching();
                    done();
                }
            }
        });
    }    
}

global.showGasConsumption = function(txHash) {
    var tx = web3.eth.getTransaction(txHash);
    var gasPrice = tx.gasPrice;
    var txR = web3.eth.getTransactionReceipt(txHash);

    var gasUsed = txR.gasUsed;
    var ethFee = gasPrice.times(gasUsed);

    console.log("    Gas/ETH consumed = " + gasUsed + "/" + web3.fromWei(20, "gwei") * gasUsed + " ETH");
    return ethFee;
}

global.increaseTime = function(seconds, callback) {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [seconds],
      id: null,
    }, function(err1) {
      if (err1) throw err1

      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: null,
      }, function(err2, res) {
        if (err2) throw err2;

        callback();
      })
    })
}

global.mine = function(callback) {
    web3.currentProvider.sendAsync({
    jsonrpc: '2.0',
    method: 'evm_mine',
    id: null,
    }, function(err2, res) {
        if (err2) throw err2;
        callback();
    })
}